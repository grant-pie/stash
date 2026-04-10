import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminSnippetsQueryDto } from './dto/admin-snippets-query.dto';
import { AdminAuditLogsQueryDto } from './dto/admin-audit-logs-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Stats (admin + moderator) ────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Users (admin only) ───────────────────────────────────────────────────

  @Get('users')
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as any).id;
    const ip = req.ip ?? 'unknown';
    return this.adminService.updateUser(adminId, id, dto, ip);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const adminId = (req.user as any).id;
    const ip = req.ip ?? 'unknown';
    return this.adminService.deleteUser(adminId, id, ip);
  }

  // ─── Snippets (admin + moderator) ────────────────────────────────────────

  @Get('snippets')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  getSnippets(@Query() query: AdminSnippetsQueryDto) {
    return this.adminService.getSnippets(query);
  }

  @Patch('snippets/:id/visibility')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  updateSnippetVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isPublic') isPublic: boolean,
    @Req() req: Request,
  ) {
    const adminId = (req.user as any).id;
    const ip = req.ip ?? 'unknown';
    return this.adminService.updateSnippetVisibility(adminId, id, isPublic, ip);
  }

  @Delete('snippets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  deleteSnippet(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const adminId = (req.user as any).id;
    const ip = req.ip ?? 'unknown';
    return this.adminService.deleteSnippet(adminId, id, ip);
  }

  // ─── Audit Logs (admin only) ──────────────────────────────────────────────

  @Get('audit-logs')
  getAuditLogs(@Query() query: AdminAuditLogsQueryDto) {
    return this.adminService.getAuditLogs(query);
  }
}
