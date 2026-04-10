/**
 * Audit Log Seed Script
 *
 * Populates the audit_logs table with randomly generated entries.
 * Entries are distributed across all existing admin users as actors,
 * and target real users and snippets already in the database.
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *   - At least one admin account must exist (run seed:admin first)
 *   - At least one regular user must exist (run seed:users first)
 *   - At least one snippet should exist for snippet-targeted actions (run seed:snippets first)
 *
 * Usage:
 *   npm run seed:audit-logs                  # seeds 20 entries
 *   npm run seed:audit-logs -- --count=100   # seeds 100 entries
 */

import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { User, UserRole } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog, AuditAction } from '../admin/audit-log.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const USER_ACTIONS: AuditAction[] = [
  AuditAction.USER_ROLE_CHANGED,
  AuditAction.USER_SUSPENDED,
  AuditAction.USER_UNSUSPENDED,
  AuditAction.USER_DELETED,
];

const SNIPPET_ACTIONS: AuditAction[] = [
  AuditAction.SNIPPET_VISIBILITY_CHANGED,
  AuditAction.SNIPPET_DELETED,
];

const SUSPEND_REASONS = [
  'Violated community guidelines',
  'Spam behaviour',
  'Inappropriate content',
  'Multiple reports from other users',
  null,
];

function buildMetadata(
  action: AuditAction,
  targetUser?: { id: string; email: string; username: string; role: UserRole },
  targetSnippet?: { id: string; title: string; userId: string; isPublic: boolean },
): Record<string, unknown> {
  switch (action) {
    case AuditAction.USER_ROLE_CHANGED: {
      const roles = [UserRole.USER, UserRole.MODERATOR, UserRole.ADMIN];
      const previousRole = targetUser?.role ?? UserRole.USER;
      const newRole = faker.helpers.arrayElement(roles.filter((r) => r !== previousRole));
      return { previousRole, newRole, targetEmail: targetUser?.email };
    }
    case AuditAction.USER_SUSPENDED:
      return {
        suspendReason: faker.helpers.arrayElement(SUSPEND_REASONS),
        targetEmail: targetUser?.email,
      };
    case AuditAction.USER_UNSUSPENDED:
      return { targetEmail: targetUser?.email };
    case AuditAction.USER_DELETED:
      return {
        email: targetUser?.email,
        username: targetUser?.username,
      };
    case AuditAction.SNIPPET_VISIBILITY_CHANGED: {
      const previousValue = targetSnippet?.isPublic ?? faker.datatype.boolean();
      return {
        previousValue,
        newValue: !previousValue,
        title: targetSnippet?.title,
      };
    }
    case AuditAction.SNIPPET_DELETED:
      return {
        title: targetSnippet?.title,
        userId: targetSnippet?.userId,
      };
    default:
      return {};
  }
}

function makeDataSource() {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'stash',
    entities: [User, Snippet, AuditLog],
    synchronize: false,
  });
}

async function main() {
  const countArg = process.argv.find((a) => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 20;

  if (isNaN(count) || count < 1) {
    console.error('Error: --count must be a positive integer.');
    process.exit(1);
  }

  const ds = makeDataSource();
  await ds.initialize();

  try {
    const userRepo = ds.getRepository(User);
    const snippetRepo = ds.getRepository(Snippet);
    const auditRepo = ds.getRepository(AuditLog);

    // Need admins as actors
    const admins = await userRepo.find({ where: { role: UserRole.ADMIN } });
    if (admins.length === 0) {
      console.error('✗ No admin accounts found. Run seed:admin first.');
      process.exit(1);
    }

    // All users as potential targets
    const users = await userRepo.find({
      select: ['id', 'email', 'username', 'role'],
    });

    // All snippets as potential targets
    const snippets = await snippetRepo.find({
      select: ['id', 'title', 'userId', 'isPublic'],
    });

    if (snippets.length === 0) {
      console.warn('⚠  No snippets found — snippet-targeted actions will be skipped.');
    }

    const availableActions =
      snippets.length > 0 ? [...USER_ACTIONS, ...SNIPPET_ACTIONS] : USER_ACTIONS;

    const entries: Partial<AuditLog>[] = [];

    for (let i = 0; i < count; i++) {
      const admin = faker.helpers.arrayElement(admins);
      const action = faker.helpers.arrayElement(availableActions);
      const isSnippetAction = SNIPPET_ACTIONS.includes(action);

      const targetUser = isSnippetAction
        ? undefined
        : faker.helpers.arrayElement(users);

      const targetSnippet =
        isSnippetAction && snippets.length > 0
          ? faker.helpers.arrayElement(snippets)
          : undefined;

      // Spread the timestamps across the last 90 days for realistic data
      const createdAt = faker.date.recent({ days: 90 });

      entries.push({
        adminId: admin.id,
        action,
        targetType: isSnippetAction ? 'snippet' : 'user',
        targetId: (targetUser?.id ?? targetSnippet?.id) as string,
        metadata: buildMetadata(action, targetUser, targetSnippet),
        ipAddress: faker.internet.ipv4(),
        createdAt,
      });
    }

    await auditRepo.save(entries);

    console.log(
      `✓ Seeded ${entries.length} audit log entry/entries using ${admins.length} admin(s)`,
    );
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('✗ Audit log seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
