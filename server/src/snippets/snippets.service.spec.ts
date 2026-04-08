import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SnippetsService } from './snippets.service';
import { Snippet } from './snippet.entity';

function makeSnippet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'snippet-uuid',
    title: 'Hello World',
    description: 'A test snippet',
    language: 'typescript',
    content: 'console.log("hello")',
    tags: ['test'],
    isPublic: false,
    userId: 'owner-uuid',
    ...overrides,
  };
}

function makeQb(result: unknown = null, many: unknown[] = []) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([many, many.length]),
    getOne: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

const mockRepo = {
  createQueryBuilder: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('SnippetsService', () => {
  let service: SnippetsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnippetsService,
        { provide: getRepositoryToken(Snippet), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SnippetsService>(SnippetsService);
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('filters by userId and orders by createdAt DESC', async () => {
      const qb = makeQb(null, [makeSnippet()]);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findAll('owner-uuid');
      expect(qb.where).toHaveBeenCalledWith(
        'snippet.userId = :userId',
        { userId: 'owner-uuid' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('snippet.createdAt', 'DESC');
    });

    it('applies ILIKE search across title, description, and tags when search is provided', async () => {
      const qb = makeQb(null, []);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findAll('owner-uuid', 'hello');
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringMatching(/title.*ILIKE.*description.*ILIKE.*tags.*LIKE/s),
        { search: '%hello%' },
      );
    });

    it('applies language filter when provided', async () => {
      const qb = makeQb(null, []);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findAll('owner-uuid', undefined, 'typescript');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'snippet.language = :language',
        { language: 'typescript' },
      );
    });

    it('applies tags LIKE filter when tag is provided', async () => {
      const qb = makeQb(null, []);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findAll('owner-uuid', undefined, undefined, 'react');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'snippet.tags LIKE :tag',
        { tag: '%react%' },
      );
    });

    it('paginates with skip and take and returns { data, total, page, limit }', async () => {
      const snippet = makeSnippet();
      const qb = makeQb(null, [snippet]);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findAll('owner-uuid', undefined, undefined, undefined, 2, 12);
      expect(qb.skip).toHaveBeenCalledWith(12); // (2-1)*12
      expect(qb.take).toHaveBeenCalledWith(12);
      expect(result).toMatchObject({ data: [snippet], total: 1, page: 2, limit: 12 });
    });
  });

  // ─── findPublic ───────────────────────────────────────────────────────────

  describe('findPublic()', () => {
    it('filters isPublic = true and joins user with select id + username', async () => {
      const qb = makeQb(null, [makeSnippet({ isPublic: true })]);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findPublic();
      expect(qb.where).toHaveBeenCalledWith('snippet.isPublic = true');
      expect(qb.leftJoin).toHaveBeenCalled();
      expect(qb.addSelect).toHaveBeenCalledWith(['user.id', 'user.username']);
    });

    it('applies search/language/tag filters when provided', async () => {
      const qb = makeQb(null, []);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      await service.findPublic('hello', 'python', 'algo');
      expect(qb.andWhere).toHaveBeenCalledTimes(3);
    });

    it('paginates with skip and take and returns { data, total, page, limit }', async () => {
      const snippet = makeSnippet({ isPublic: true });
      const qb = makeQb(null, [snippet]);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findPublic(undefined, undefined, undefined, 3, 12);
      expect(qb.skip).toHaveBeenCalledWith(24); // (3-1)*12
      expect(qb.take).toHaveBeenCalledWith(12);
      expect(result).toMatchObject({ data: [snippet], total: 1, page: 3, limit: 12 });
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('throws NotFoundException if snippet is not found', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.findOne('bad-id', 'owner-uuid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if snippet belongs to a different user', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce(makeSnippet({ userId: 'other-uuid' }));
      await expect(service.findOne('snippet-uuid', 'owner-uuid')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns the snippet when found and owned by the requesting user', async () => {
      const snippet = makeSnippet();
      mockRepo.findOneBy.mockResolvedValueOnce(snippet);

      const result = await service.findOne('snippet-uuid', 'owner-uuid');
      expect(result).toBe(snippet);
    });
  });

  // ─── findOnePublic ────────────────────────────────────────────────────────

  describe('findOnePublic()', () => {
    it('throws NotFoundException when snippet is not found or not public', async () => {
      const qb = makeQb(null);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);
      await expect(service.findOnePublic('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the snippet with joined user data when found and public', async () => {
      const snippet = makeSnippet({ isPublic: true, user: { id: 'owner-uuid', username: 'alice' } });
      const qb = makeQb(snippet);
      mockRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findOnePublic('snippet-uuid');
      expect(result).toBe(snippet);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a snippet with the given userId and dto fields', async () => {
      const dto = { title: 'Test', language: 'js', content: 'x', tags: ['a'], isPublic: false };
      const created = makeSnippet({ ...dto, userId: 'owner-uuid' });
      mockRepo.create.mockReturnValueOnce(created);
      mockRepo.save.mockResolvedValueOnce(created);

      const result = await service.create('owner-uuid', dto);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-uuid', title: 'Test' }),
      );
      expect(result).toBe(created);
    });

    it('defaults tags to [] when not provided in dto', async () => {
      const dto = { title: 'Test', language: 'js', content: 'x' } as any;
      mockRepo.create.mockReturnValueOnce(makeSnippet({ tags: [] }));
      mockRepo.save.mockResolvedValueOnce(makeSnippet({ tags: [] }));

      await service.create('owner-uuid', dto);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [] }),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls findOne for ownership check then saves merged data', async () => {
      const snippet = makeSnippet();
      mockRepo.findOneBy.mockResolvedValueOnce(snippet);
      mockRepo.save.mockResolvedValueOnce({ ...snippet, title: 'Updated' });

      const result = await service.update('snippet-uuid', 'owner-uuid', { title: 'Updated' });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated');
    });

    it('throws when findOne throws (wrong owner)', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce(makeSnippet({ userId: 'other' }));
      await expect(
        service.update('snippet-uuid', 'owner-uuid', { title: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('calls findOne for ownership check then removes the snippet', async () => {
      const snippet = makeSnippet();
      mockRepo.findOneBy.mockResolvedValueOnce(snippet);
      mockRepo.remove.mockResolvedValueOnce(undefined);

      await service.remove('snippet-uuid', 'owner-uuid');
      expect(mockRepo.remove).toHaveBeenCalledWith(snippet);
    });

    it('throws when findOne throws (not found)', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.remove('bad-id', 'owner-uuid')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
