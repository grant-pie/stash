import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SnippetsModule } from './snippets/snippets.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { User } from './users/user.entity';
import { Snippet } from './snippets/snippet.entity';
import { AuditLog } from './admin/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'stash'),
        entities: [User, Snippet, AuditLog],
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    UsersModule,
    SnippetsModule,
    AdminModule,
  ],
})
export class AppModule {}
