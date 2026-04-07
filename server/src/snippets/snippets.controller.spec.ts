import { Test, TestingModule } from '@nestjs/testing';
import { SnippetsController } from './snippets.controller';
import { SnippetsService } from './snippets.service';

const mockSnippetsService = {
  findPublic: jest.fn(),
  findOnePublic: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

function makeReq(userId = 'user-uuid') {
  return { user: { id: userId } };
}

describe('SnippetsController', () => {
  let controller: SnippetsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnippetsController],
      providers: [{ provide: SnippetsService, useValue: mockSnippetsService }],
    }).compile();

    controller = module.get<SnippetsController>(SnippetsController);
  });

  it('findPublic() calls service.findPublic with query params', async () => {
    const expected = [{ id: '1' }];
    mockSnippetsService.findPublic.mockResolvedValueOnce(expected);

    const result = await controller.findPublic('hello', 'ts', 'react');
    expect(mockSnippetsService.findPublic).toHaveBeenCalledWith('hello', 'ts', 'react');
    expect(result).toBe(expected);
  });

  it('findOnePublic() calls service.findOnePublic with the id param', async () => {
    const expected = { id: 'snippet-uuid' };
    mockSnippetsService.findOnePublic.mockResolvedValueOnce(expected);

    const result = await controller.findOnePublic('snippet-uuid');
    expect(mockSnippetsService.findOnePublic).toHaveBeenCalledWith('snippet-uuid');
    expect(result).toBe(expected);
  });

  it('findAll() passes req.user.id and query filters to service.findAll', async () => {
    const expected = [{ id: '1' }];
    mockSnippetsService.findAll.mockResolvedValueOnce(expected);

    const result = await controller.findAll(makeReq(), 'search', 'ts', 'tag');
    expect(mockSnippetsService.findAll).toHaveBeenCalledWith('user-uuid', 'search', 'ts', 'tag');
    expect(result).toBe(expected);
  });

  it('findOne() passes id and req.user.id to service.findOne', async () => {
    const expected = { id: 'snippet-uuid' };
    mockSnippetsService.findOne.mockResolvedValueOnce(expected);

    const result = await controller.findOne('snippet-uuid', makeReq());
    expect(mockSnippetsService.findOne).toHaveBeenCalledWith('snippet-uuid', 'user-uuid');
    expect(result).toBe(expected);
  });

  it('create() passes dto and req.user.id to service.create', async () => {
    const dto = { title: 'Test', language: 'ts', content: 'x', tags: [], isPublic: false };
    const expected = { id: 'new-uuid', ...dto };
    mockSnippetsService.create.mockResolvedValueOnce(expected);

    const result = await controller.create(dto, makeReq());
    expect(mockSnippetsService.create).toHaveBeenCalledWith('user-uuid', dto);
    expect(result).toBe(expected);
  });

  it('update() passes id, dto, and req.user.id to service.update', async () => {
    const dto = { title: 'Updated' };
    const expected = { id: 'snippet-uuid', title: 'Updated' };
    mockSnippetsService.update.mockResolvedValueOnce(expected);

    const result = await controller.update('snippet-uuid', dto, makeReq());
    expect(mockSnippetsService.update).toHaveBeenCalledWith('snippet-uuid', 'user-uuid', dto);
    expect(result).toBe(expected);
  });

  it('remove() passes id and req.user.id to service.remove', async () => {
    mockSnippetsService.remove.mockResolvedValueOnce(undefined);

    await controller.remove('snippet-uuid', makeReq());
    expect(mockSnippetsService.remove).toHaveBeenCalledWith('snippet-uuid', 'user-uuid');
  });
});
