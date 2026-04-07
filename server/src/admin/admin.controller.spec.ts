import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserRole } from '../users/user.entity';
import { AuditAction } from './audit-log.entity';

const mockAdminService = {
  getStats: jest.fn(),
  getUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getSnippets: jest.fn(),
  updateSnippetVisibility: jest.fn(),
  deleteSnippet: jest.fn(),
  getAuditLogs: jest.fn(),
};

function makeReq(adminId = 'admin-uuid', ip = '127.0.0.1') {
  return { user: { id: adminId }, ip } as any;
}

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    })
      // Override guards so they don't block the controller tests
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../auth/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  // ─── Stats ────────────────────────────────────────────────────────────────

  it('getStats() delegates to adminService.getStats()', async () => {
    const expected = { totalUsers: 10 };
    mockAdminService.getStats.mockResolvedValueOnce(expected);

    const result = await controller.getStats();
    expect(mockAdminService.getStats).toHaveBeenCalled();
    expect(result).toBe(expected);
  });

  // ─── Users ────────────────────────────────────────────────────────────────

  it('getUsers() passes query DTO to adminService.getUsers', async () => {
    const query = { page: 1, limit: 20 };
    const expected = { data: [], total: 0 };
    mockAdminService.getUsers.mockResolvedValueOnce(expected);

    const result = await controller.getUsers(query as any);
    expect(mockAdminService.getUsers).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('getUserById() passes UUID param to adminService.getUserById', async () => {
    const expected = { id: 'user-uuid' };
    mockAdminService.getUserById.mockResolvedValueOnce(expected);

    const result = await controller.getUserById('user-uuid');
    expect(mockAdminService.getUserById).toHaveBeenCalledWith('user-uuid');
    expect(result).toBe(expected);
  });

  it('updateUser() passes adminId from req.user.id, dto, and req.ip to updateUser', async () => {
    const dto = { role: UserRole.MODERATOR };
    const expected = { id: 'user-uuid', role: UserRole.MODERATOR };
    mockAdminService.updateUser.mockResolvedValueOnce(expected);

    const result = await controller.updateUser('user-uuid', dto as any, makeReq());
    expect(mockAdminService.updateUser).toHaveBeenCalledWith(
      'admin-uuid',
      'user-uuid',
      dto,
      '127.0.0.1',
    );
    expect(result).toBe(expected);
  });

  it('deleteUser() passes adminId and req.ip to adminService.deleteUser', async () => {
    mockAdminService.deleteUser.mockResolvedValueOnce(undefined);

    await controller.deleteUser('user-uuid', makeReq());
    expect(mockAdminService.deleteUser).toHaveBeenCalledWith(
      'admin-uuid',
      'user-uuid',
      '127.0.0.1',
    );
  });

  // ─── Snippets ─────────────────────────────────────────────────────────────

  it('getSnippets() passes query DTO to adminService.getSnippets', async () => {
    const query = { page: 1, limit: 10 };
    const expected = { data: [], total: 0 };
    mockAdminService.getSnippets.mockResolvedValueOnce(expected);

    const result = await controller.getSnippets(query as any);
    expect(mockAdminService.getSnippets).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('updateSnippetVisibility() passes adminId, isPublic from body, and req.ip', async () => {
    const expected = { id: 'snippet-uuid', isPublic: true };
    mockAdminService.updateSnippetVisibility.mockResolvedValueOnce(expected);

    const result = await controller.updateSnippetVisibility('snippet-uuid', true, makeReq());
    expect(mockAdminService.updateSnippetVisibility).toHaveBeenCalledWith(
      'admin-uuid',
      'snippet-uuid',
      true,
      '127.0.0.1',
    );
    expect(result).toBe(expected);
  });

  it('deleteSnippet() passes adminId and req.ip to adminService.deleteSnippet', async () => {
    mockAdminService.deleteSnippet.mockResolvedValueOnce(undefined);

    await controller.deleteSnippet('snippet-uuid', makeReq());
    expect(mockAdminService.deleteSnippet).toHaveBeenCalledWith(
      'admin-uuid',
      'snippet-uuid',
      '127.0.0.1',
    );
  });

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  it('getAuditLogs() passes query DTO to adminService.getAuditLogs', async () => {
    const query = { page: 1, limit: 20 };
    const expected = { data: [], total: 0 };
    mockAdminService.getAuditLogs.mockResolvedValueOnce(expected);

    const result = await controller.getAuditLogs(query as any);
    expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });
});
