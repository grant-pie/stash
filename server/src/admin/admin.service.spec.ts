import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { User, UserRole } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog, AuditAction } from './audit-log.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Record<string, unknown> = {}): User {
  return {
    id: 'user-uuid',
    email: 'user@example.com',
    username: 'alice',
    role: UserRole.USER,
    isSuspended: false,
    suspendedAt: null,
    suspendReason: null,
    emailVerified: true,
    verificationToken: null,
    resetPasswordToken: null,
    resetPasswordExpiry: null,
    snippets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as User;
}

function makeSnippet(overrides: Record<string, unknown> = {}): Snippet {
  return {
    id: 'snippet-uuid',
    title: 'Test',
    description: '',
    language: 'ts',
    content: 'x',
    tags: [],
    isPublic: false,
    userId: 'user-uuid',
    user: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Snippet;
}

// ─── Query builder factory ────────────────────────────────────────────────────

function makeQb(
  getManyAndCount: [unknown[], number] = [[], 0],
  getCount: number = 0,
  getRawMany: Record<string, unknown>[] = [],
) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(getManyAndCount),
    getCount: jest.fn().mockResolvedValue(getCount),
    getRawMany: jest.fn().mockResolvedValue(getRawMany),
  };
  return qb;
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockUsersRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockSnippetsRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAuditRepo = {
  createQueryBuilder: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: getRepositoryToken(Snippet), useValue: mockSnippetsRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditRepo },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ─── getStats ─────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('returns the five counts and topLanguages', async () => {
      mockUsersRepo.count.mockResolvedValue(10);
      mockSnippetsRepo.count.mockResolvedValue(50);
      const newUsersQb = makeQb(undefined, 3);
      mockUsersRepo.createQueryBuilder.mockReturnValueOnce(newUsersQb);
      const topLangQb = makeQb(undefined, undefined, [
        { language: 'ts', count: '20' },
        { language: 'js', count: '10' },
      ]);
      mockSnippetsRepo.createQueryBuilder.mockReturnValueOnce(topLangQb);

      const result = await service.getStats();
      expect(result.totalUsers).toBe(10);
      expect(result.totalSnippets).toBe(50);
      expect(result.topLanguages[0]).toEqual({ language: 'ts', count: 20 });
    });

    it('converts topLanguages count from string to number', async () => {
      mockUsersRepo.count.mockResolvedValue(0);
      mockSnippetsRepo.count.mockResolvedValue(0);
      mockUsersRepo.createQueryBuilder.mockReturnValueOnce(makeQb(undefined, 0));
      mockSnippetsRepo.createQueryBuilder.mockReturnValueOnce(
        makeQb(undefined, undefined, [{ language: 'go', count: '5' }]),
      );

      const result = await service.getStats();
      expect(typeof result.topLanguages[0].count).toBe('number');
      expect(result.topLanguages[0].count).toBe(5);
    });
  });

  // ─── getUsers ─────────────────────────────────────────────────────────────

  describe('getUsers()', () => {
    function setupGetUsers(users: User[] = [], total = 0) {
      const qb = makeQb([users, total]);
      mockUsersRepo.createQueryBuilder.mockReturnValueOnce(qb);
      mockSnippetsRepo.count.mockResolvedValue(3);
      return qb;
    }

    it('applies ILIKE search on email and username when search is provided', async () => {
      const qb = setupGetUsers();
      await service.getUsers({ search: 'alice', page: 1, limit: 20 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%alice%' },
      );
    });

    it('includes CAST(u.id AS text) ILIKE in the search condition', async () => {
      const qb = setupGetUsers();
      await service.getUsers({ search: 'abc', page: 1, limit: 20 });
      const [searchExpr] = qb.andWhere.mock.calls[0];
      expect(searchExpr).toContain('CAST(u.id AS text) ILIKE :search');
    });

    it('does not apply search filter when search is omitted', async () => {
      const qb = setupGetUsers();
      await service.getUsers({ page: 1, limit: 20 });
      const searchCalls = qb.andWhere.mock.calls.filter(([expr]: [string]) =>
        expr.includes('ILIKE'),
      );
      expect(searchCalls).toHaveLength(0);
    });

    it('applies role filter when provided', async () => {
      const qb = setupGetUsers();
      await service.getUsers({ role: UserRole.ADMIN, page: 1, limit: 20 });
      expect(qb.andWhere).toHaveBeenCalledWith('u.role = :role', { role: UserRole.ADMIN });
    });

    it('applies isSuspended filter when provided', async () => {
      const qb = setupGetUsers();
      await service.getUsers({ isSuspended: true, page: 1, limit: 20 });
      expect(qb.andWhere).toHaveBeenCalledWith('u.isSuspended = :isSuspended', { isSuspended: true });
    });

    it('paginates with skip and take', async () => {
      const qb = setupGetUsers();
      await service.getUsers({ page: 3, limit: 10 });
      expect(qb.skip).toHaveBeenCalledWith(20); // (3-1)*10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('returns { data, total, page, limit } with snippetCount on each user', async () => {
      setupGetUsers([makeUser()], 1);
      const result = await service.getUsers({ page: 1, limit: 20 });
      expect(result.total).toBe(1);
      expect(result.data[0]).toHaveProperty('snippetCount', 3);
    });
  });

  // ─── getUserById ──────────────────────────────────────────────────────────

  describe('getUserById()', () => {
    it('throws NotFoundException if user is not found', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.getUserById('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns user with snippetCount appended', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());
      mockSnippetsRepo.count.mockResolvedValueOnce(7);

      const result = await service.getUserById('user-uuid');
      expect(result).toMatchObject({ id: 'user-uuid', snippetCount: 7 });
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    const adminId = 'admin-uuid';
    const ip = '127.0.0.1';

    beforeEach(() => {
      mockUsersRepo.update.mockResolvedValue(undefined);
      mockAuditRepo.create.mockReturnValue({});
      mockAuditRepo.save.mockResolvedValue(undefined);
      mockUsersRepo.findOneBy.mockResolvedValue(makeUser());
    });

    it('throws NotFoundException if user is not found', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(
        service.updateUser(adminId, 'bad-id', {}, ip),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('logs USER_ROLE_CHANGED with previousRole/newRole when role changes', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ role: UserRole.USER }));
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ role: UserRole.ADMIN }));

      await service.updateUser(adminId, 'user-uuid', { role: UserRole.ADMIN }, ip);

      const createCall = mockAuditRepo.create.mock.calls[0][0];
      expect(createCall.action).toBe(AuditAction.USER_ROLE_CHANGED);
      expect(createCall.metadata).toMatchObject({
        previousRole: UserRole.USER,
        newRole: UserRole.ADMIN,
      });
    });

    it('does not log USER_ROLE_CHANGED when role is the same as current', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ role: UserRole.USER }));
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());

      await service.updateUser(adminId, 'user-uuid', { role: UserRole.USER }, ip);

      const roleChangedCalls = mockAuditRepo.create.mock.calls.filter(
        ([entry]) => entry.action === AuditAction.USER_ROLE_CHANGED,
      );
      expect(roleChangedCalls).toHaveLength(0);
    });

    it('logs USER_SUSPENDED with suspendReason when suspending', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ isSuspended: false }));
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());

      await service.updateUser(
        adminId,
        'user-uuid',
        { isSuspended: true, suspendReason: 'Spam' },
        ip,
      );

      const createCall = mockAuditRepo.create.mock.calls[0][0];
      expect(createCall.action).toBe(AuditAction.USER_SUSPENDED);
      expect(createCall.metadata).toMatchObject({ suspendReason: 'Spam' });
    });

    it('logs USER_UNSUSPENDED when unsuspending', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ isSuspended: true }));
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());

      await service.updateUser(adminId, 'user-uuid', { isSuspended: false }, ip);

      const createCall = mockAuditRepo.create.mock.calls[0][0];
      expect(createCall.action).toBe(AuditAction.USER_UNSUSPENDED);
    });

    it('sets suspendedAt to a Date when suspending', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ isSuspended: false }));
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());

      await service.updateUser(adminId, 'user-uuid', { isSuspended: true }, ip);

      const updateCall = mockUsersRepo.update.mock.calls[0][1];
      expect(updateCall.suspendedAt).toBeInstanceOf(Date);
    });

    it('sets suspendedAt to null when unsuspending', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ isSuspended: true }));
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());

      await service.updateUser(adminId, 'user-uuid', { isSuspended: false }, ip);

      const updateCall = mockUsersRepo.update.mock.calls[0][1];
      expect(updateCall.suspendedAt).toBeNull();
    });

    it('sets suspendReason to null when unsuspending', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser({ isSuspended: true }));
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());

      await service.updateUser(adminId, 'user-uuid', { isSuspended: false }, ip);

      const updateCall = mockUsersRepo.update.mock.calls[0][1];
      expect(updateCall.suspendReason).toBeNull();
    });
  });

  // ─── deleteUser ───────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    const adminId = 'admin-uuid';
    const ip = '127.0.0.1';

    beforeEach(() => {
      mockAuditRepo.create.mockReturnValue({});
      mockAuditRepo.save.mockResolvedValue(undefined);
      mockUsersRepo.delete.mockResolvedValue(undefined);
    });

    it('throws NotFoundException if user is not found', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.deleteUser(adminId, 'bad-id', ip)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('logs USER_DELETED with email and username in metadata', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(
        makeUser({ email: 'alice@example.com', username: 'alice' }),
      );

      await service.deleteUser(adminId, 'user-uuid', ip);

      const createCall = mockAuditRepo.create.mock.calls[0][0];
      expect(createCall.action).toBe(AuditAction.USER_DELETED);
      expect(createCall.metadata).toMatchObject({
        email: 'alice@example.com',
        username: 'alice',
      });
    });

    it('calls repo.delete after logging', async () => {
      mockUsersRepo.findOneBy.mockResolvedValueOnce(makeUser());

      await service.deleteUser(adminId, 'user-uuid', ip);

      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(mockUsersRepo.delete).toHaveBeenCalledWith('user-uuid');
    });
  });

  // ─── getSnippets ──────────────────────────────────────────────────────────

  describe('getSnippets()', () => {
    function setupGetSnippets(snippets: Snippet[] = [], total = 0) {
      const qb = makeQb([snippets, total]);
      mockSnippetsRepo.createQueryBuilder.mockReturnValueOnce(qb);
      return qb;
    }

    it('applies search/language/isPublic/userId filters when provided', async () => {
      const qb = setupGetSnippets();
      await service.getSnippets({
        search: 'hello',
        language: 'ts',
        isPublic: true,
        userId: 'user-uuid',
        page: 1,
        limit: 20,
      });
      expect(qb.andWhere).toHaveBeenCalledTimes(4);
    });

    it('includes CAST(s.id AS text) ILIKE in the search condition', async () => {
      const qb = setupGetSnippets();
      await service.getSnippets({ search: 'abc', page: 1, limit: 20 });
      const [searchExpr] = qb.andWhere.mock.calls[0];
      expect(searchExpr).toContain('CAST(s.id AS text) ILIKE :search');
    });

    it('does not apply search filter when search is omitted', async () => {
      const qb = setupGetSnippets();
      await service.getSnippets({ page: 1, limit: 20 });
      const searchCalls = qb.andWhere.mock.calls.filter(([expr]: [string]) =>
        expr.includes('ILIKE'),
      );
      expect(searchCalls).toHaveLength(0);
    });

    it('paginates and returns { data, total, page, limit }', async () => {
      setupGetSnippets([makeSnippet()], 1);
      const result = await service.getSnippets({ page: 2, limit: 5 });
      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });
  });

  // ─── updateSnippetVisibility ──────────────────────────────────────────────

  describe('updateSnippetVisibility()', () => {
    const adminId = 'admin-uuid';
    const ip = '127.0.0.1';

    beforeEach(() => {
      mockSnippetsRepo.update.mockResolvedValue(undefined);
      mockAuditRepo.create.mockReturnValue({});
      mockAuditRepo.save.mockResolvedValue(undefined);
    });

    it('throws NotFoundException if snippet is not found', async () => {
      mockSnippetsRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(
        service.updateSnippetVisibility(adminId, 'bad-id', true, ip),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates isPublic on the snippet', async () => {
      mockSnippetsRepo.findOneBy
        .mockResolvedValueOnce(makeSnippet({ isPublic: false }))
        .mockResolvedValueOnce(makeSnippet({ isPublic: true }));

      await service.updateSnippetVisibility(adminId, 'snippet-uuid', true, ip);
      expect(mockSnippetsRepo.update).toHaveBeenCalledWith('snippet-uuid', { isPublic: true });
    });

    it('logs SNIPPET_VISIBILITY_CHANGED with previousValue and newValue', async () => {
      mockSnippetsRepo.findOneBy
        .mockResolvedValueOnce(makeSnippet({ isPublic: false }))
        .mockResolvedValueOnce(makeSnippet({ isPublic: true }));

      await service.updateSnippetVisibility(adminId, 'snippet-uuid', true, ip);

      const createCall = mockAuditRepo.create.mock.calls[0][0];
      expect(createCall.action).toBe(AuditAction.SNIPPET_VISIBILITY_CHANGED);
      expect(createCall.metadata).toMatchObject({ previousValue: false, newValue: true });
    });
  });

  // ─── deleteSnippet ────────────────────────────────────────────────────────

  describe('deleteSnippet()', () => {
    const adminId = 'admin-uuid';
    const ip = '127.0.0.1';

    beforeEach(() => {
      mockAuditRepo.create.mockReturnValue({});
      mockAuditRepo.save.mockResolvedValue(undefined);
      mockSnippetsRepo.delete.mockResolvedValue(undefined);
    });

    it('throws NotFoundException if snippet is not found', async () => {
      mockSnippetsRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.deleteSnippet(adminId, 'bad-id', ip)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('logs SNIPPET_DELETED with title and userId in metadata', async () => {
      mockSnippetsRepo.findOneBy.mockResolvedValueOnce(
        makeSnippet({ title: 'My Snippet', userId: 'owner-uuid' }),
      );

      await service.deleteSnippet(adminId, 'snippet-uuid', ip);

      const createCall = mockAuditRepo.create.mock.calls[0][0];
      expect(createCall.action).toBe(AuditAction.SNIPPET_DELETED);
      expect(createCall.metadata).toMatchObject({ title: 'My Snippet', userId: 'owner-uuid' });
    });

    it('calls repo.delete after logging', async () => {
      mockSnippetsRepo.findOneBy.mockResolvedValueOnce(makeSnippet());

      await service.deleteSnippet(adminId, 'snippet-uuid', ip);

      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(mockSnippetsRepo.delete).toHaveBeenCalledWith('snippet-uuid');
    });
  });

  // ─── getAuditLogs ─────────────────────────────────────────────────────────

  describe('getAuditLogs()', () => {
    function setupGetAuditLogs(logs: AuditLog[] = [], total = 0) {
      const qb = makeQb([logs, total]);
      mockAuditRepo.createQueryBuilder.mockReturnValueOnce(qb);
      return qb;
    }

    it('applies adminId, action, targetType filters when provided', async () => {
      const qb = setupGetAuditLogs();
      await service.getAuditLogs({
        adminId: 'admin-uuid',
        action: AuditAction.USER_DELETED,
        targetType: 'user',
        page: 1,
        limit: 20,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('log.adminId = :adminId', { adminId: 'admin-uuid' });
      expect(qb.andWhere).toHaveBeenCalledWith('log.action = :action', {
        action: AuditAction.USER_DELETED,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('log.targetType = :targetType', {
        targetType: 'user',
      });
    });

    it('applies from/to date range filters converted to Date objects', async () => {
      const qb = setupGetAuditLogs();
      await service.getAuditLogs({
        from: '2024-01-01',
        to: '2024-12-31',
        page: 1,
        limit: 20,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt >= :from', {
        from: new Date('2024-01-01'),
      });
      expect(qb.andWhere).toHaveBeenCalledWith('log.createdAt <= :to', {
        to: new Date('2024-12-31'),
      });
    });

    it('paginates and returns { data, total, page, limit }', async () => {
      setupGetAuditLogs([], 42);
      const result = await service.getAuditLogs({ page: 2, limit: 10 });
      expect(result.total).toBe(42);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });
});
