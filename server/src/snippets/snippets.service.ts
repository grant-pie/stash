import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Snippet } from './snippet.entity';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { UpdateSnippetDto } from './dto/update-snippet.dto';

@Injectable()
export class SnippetsService {
  constructor(
    @InjectRepository(Snippet)
    private readonly snippetsRepo: Repository<Snippet>,
  ) {}

  async findAll(
    userId: string,
    search?: string,
    language?: string,
    tag?: string,
    page = 1,
    limit = 12,
  ): Promise<{ data: Snippet[]; total: number; page: number; limit: number }> {
    const qb = this.snippetsRepo
      .createQueryBuilder('snippet')
      .where('snippet.userId = :userId', { userId })
      .orderBy('snippet.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(snippet.title ILIKE :search OR snippet.description ILIKE :search OR snippet.tags LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (language) qb.andWhere('snippet.language = :language', { language });
    if (tag) qb.andWhere('snippet.tags LIKE :tag', { tag: `%${tag}%` });

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findPublic(
    search?: string,
    language?: string,
    tag?: string,
    page = 1,
    limit = 12,
  ): Promise<{ data: Snippet[]; total: number; page: number; limit: number }> {
    const qb = this.snippetsRepo
      .createQueryBuilder('snippet')
      .leftJoin('snippet.user', 'user')
      .addSelect(['user.id', 'user.username'])
      .where('snippet.isPublic = true')
      .orderBy('snippet.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(snippet.title ILIKE :search OR snippet.description ILIKE :search OR snippet.tags LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (language) qb.andWhere('snippet.language = :language', { language });
    if (tag) qb.andWhere('snippet.tags LIKE :tag', { tag: `%${tag}%` });

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string, userId: string): Promise<Snippet> {
    let snippet: Snippet | null;
    try {
      snippet = await this.snippetsRepo.findOneBy({ id });
    } catch {
      throw new NotFoundException('Snippet not found');
    }
    if (!snippet) throw new NotFoundException('Snippet not found');
    if (snippet.userId !== userId) throw new ForbiddenException();
    return snippet;
  }

  async findOnePublic(id: string): Promise<Snippet> {
    let snippet: Snippet | null;
    try {
      snippet = await this.snippetsRepo
        .createQueryBuilder('snippet')
        .leftJoin('snippet.user', 'user')
        .addSelect(['user.id', 'user.username'])
        .where('snippet.id = :id', { id })
        .andWhere('snippet.isPublic = true')
        .getOne();
    } catch {
      throw new NotFoundException('Snippet not found');
    }

    if (!snippet) throw new NotFoundException('Snippet not found');
    return snippet;
  }

  async create(userId: string, dto: CreateSnippetDto): Promise<Snippet> {
    const snippet = this.snippetsRepo.create({ ...dto, tags: dto.tags ?? [], userId });
    return this.snippetsRepo.save(snippet);
  }

  async update(id: string, userId: string, dto: UpdateSnippetDto): Promise<Snippet> {
    const snippet = await this.findOne(id, userId);
    Object.assign(snippet, dto);
    return this.snippetsRepo.save(snippet);
  }

  async remove(id: string, userId: string): Promise<void> {
    const snippet = await this.findOne(id, userId);
    await this.snippetsRepo.remove(snippet);
  }
}
