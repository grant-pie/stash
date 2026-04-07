import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog } from './audit-log.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Snippet, AuditLog])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
