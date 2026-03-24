import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
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
  ): Promise<Snippet[]> {
    const qb = this.snippetsRepo
      .createQueryBuilder('snippet')
      .where('snippet.userId = :userId', { userId })
      .orderBy('snippet.createdAt', 'DESC');

    if (search) {
      qb.andWhere('(snippet.title ILIKE :search OR snippet.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (language) {
      qb.andWhere('snippet.language = :language', { language });
    }

    if (tag) {
      qb.andWhere('snippet.tags LIKE :tag', { tag: `%${tag}%` });
    }

    return qb.getMany();
  }

  async findOne(id: string, userId: string): Promise<Snippet> {
    const snippet = await this.snippetsRepo.findOneBy({ id });
    if (!snippet) throw new NotFoundException('Snippet not found');
    if (snippet.userId !== userId) throw new ForbiddenException();
    return snippet;
  }

  async create(userId: string, dto: CreateSnippetDto): Promise<Snippet> {
    const snippet = this.snippetsRepo.create({ ...dto, userId });
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
