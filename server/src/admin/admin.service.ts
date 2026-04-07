import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog, AuditAction } from './audit-log.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminSnippetsQueryDto } from './dto/admin-snippets-query.dto';
import { AdminAuditLogsQueryDto } from './dto/admin-audit-logs-query.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Snippet)
    private readonly snippetsRepo: Repository<Snippet>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getStats() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalUsers, totalSnippets, newUsersThisWeek, publicSnippets, suspendedUsers] =
      await Promise.all([
        this.usersRepo.count(),
        this.snippetsRepo.count(),
        this.usersRepo
          .createQueryBuilder('u')
          .where('u.createdAt >= :date', { date: oneWeekAgo })
          .getCount(),
        this.snippetsRepo.count({ where: { isPublic: true } }),
        this.usersRepo.count({ where: { isSuspended: true } }),
      ]);

    const topLanguages: { language: string; count: string }[] = await this.snippetsRepo
      .createQueryBuilder('s')
      .select('s.language', 'language')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.language')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalUsers,
      totalSnippets,
      newUsersThisWeek,
      publicSnippets,
      suspendedUsers,
      topLanguages: topLanguages.map((r) => ({
        language: r.language,
        count: Number(r.count),
      })),
    };
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getUsers(query: AdminUsersQueryDto) {
    const { search, role, isSuspended, page = 1, limit = 20 } = query;
    const qb = this.usersRepo.createQueryBuilder('u');

    if (search) {
      qb.andWhere('(u.email ILIKE :search OR u.username ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (role) qb.andWhere('u.role = :role', { role });
    if (isSuspended !== undefined) qb.andWhere('u.isSuspended = :isSuspended', { isSuspended });

    qb.addSelect(
      (sub) =>
        sub
          .select('COUNT(*)', 'count')
          .from(Snippet, 's')
          .where('s.userId = u.id'),
      'snippetCount',
    );

    qb.orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rawUsers, total] = await qb.getManyAndCount();

    // Re-fetch snippet counts separately to keep typing clean
    const usersWithCounts = await Promise.all(
      rawUsers.map(async (u) => ({
        ...u,
        snippetCount: await this.snippetsRepo.count({ where: { userId: u.id } }),
      })),
    );

    return { data: usersWithCounts, total, page, limit };
  }

  async getUserById(id: string) {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found.');

    const snippetCount = await this.snippetsRepo.count({ where: { userId: id } });
    return { ...user, snippetCount };
  }

  async updateUser(adminId: string, id: string, dto: UpdateUserDto, ip: string) {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found.');

    const metadata: Record<string, unknown> = {};
    const actions: AuditAction[] = [];

    if (dto.role !== undefined && dto.role !== user.role) {
      metadata.previousRole = user.role;
      metadata.newRole = dto.role;
      actions.push(AuditAction.USER_ROLE_CHANGED);
    }

    if (dto.isSuspended !== undefined && dto.isSuspended !== user.isSuspended) {
      if (dto.isSuspended) {
        metadata.suspendReason = dto.suspendReason ?? null;
        actions.push(AuditAction.USER_SUSPENDED);
      } else {
        actions.push(AuditAction.USER_UNSUSPENDED);
      }
    }

    const update: Partial<User> = {};
    if (dto.role !== undefined) update.role = dto.role;
    if (dto.isSuspended !== undefined) {
      update.isSuspended = dto.isSuspended;
      update.suspendedAt = dto.isSuspended ? new Date() : null;
      update.suspendReason = dto.isSuspended ? (dto.suspendReason ?? null) : null;
    }

    await this.usersRepo.update(id, update);

    for (const action of actions) {
      await this.log(adminId, action, 'user', id, metadata, ip);
    }

    return this.usersRepo.findOneBy({ id });
  }

  async deleteUser(adminId: string, id: string, ip: string) {
    const user = await this.usersRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found.');

    await this.log(adminId, AuditAction.USER_DELETED, 'user', id, { email: user.email, username: user.username }, ip);
    await this.usersRepo.delete(id);
  }

  // ─── Snippets ─────────────────────────────────────────────────────────────

  async getSnippets(query: AdminSnippetsQueryDto) {
    const { search, language, isPublic, userId, page = 1, limit = 20 } = query;
    const qb = this.snippetsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'user');

    if (search) {
      qb.andWhere('(s.title ILIKE :search OR s.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (language) qb.andWhere('s.language = :language', { language });
    if (isPublic !== undefined) qb.andWhere('s.isPublic = :isPublic', { isPublic });
    if (userId) qb.andWhere('s.userId = :userId', { userId });

    qb.orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async updateSnippetVisibility(adminId: string, id: string, isPublic: boolean, ip: string) {
    const snippet = await this.snippetsRepo.findOneBy({ id });
    if (!snippet) throw new NotFoundException('Snippet not found.');

    await this.snippetsRepo.update(id, { isPublic });
    await this.log(adminId, AuditAction.SNIPPET_VISIBILITY_CHANGED, 'snippet', id, {
      previousValue: snippet.isPublic,
      newValue: isPublic,
    }, ip);

    return this.snippetsRepo.findOneBy({ id });
  }

  async deleteSnippet(adminId: string, id: string, ip: string) {
    const snippet = await this.snippetsRepo.findOneBy({ id });
    if (!snippet) throw new NotFoundException('Snippet not found.');

    await this.log(adminId, AuditAction.SNIPPET_DELETED, 'snippet', id, {
      title: snippet.title,
      userId: snippet.userId,
    }, ip);
    await this.snippetsRepo.delete(id);
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  async getAuditLogs(query: AdminAuditLogsQueryDto) {
    const { adminId, action, targetType, from, to, page = 1, limit = 20 } = query;
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin');

    if (adminId) qb.andWhere('log.adminId = :adminId', { adminId });
    if (action) qb.andWhere('log.action = :action', { action });
    if (targetType) qb.andWhere('log.targetType = :targetType', { targetType });
    if (from) qb.andWhere('log.createdAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('log.createdAt <= :to', { to: new Date(to) });

    qb.orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async log(
    adminId: string,
    action: AuditAction,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown>,
    ipAddress: string,
  ) {
    const entry = this.auditRepo.create({ adminId, action, targetType, targetId, metadata, ipAddress });
    await this.auditRepo.save(entry);
  }
}
