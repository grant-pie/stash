/**
 * User Seed Script
 *
 * Populates the database with randomly generated verified user accounts.
 * Existing emails and usernames are skipped, so the script is safe to run
 * multiple times.
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *
 * Usage:
 *   npm run seed:users                 # seeds 10 users
 *   npm run seed:users -- --count=50   # seeds 50 users
 */

import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { User, UserRole } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog } from '../admin/audit-log.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_PASSWORD = 'Password1!';

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
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 10;

  if (isNaN(count) || count < 1) {
    console.error('Error: --count must be a positive integer.');
    process.exit(1);
  }

  const ds = makeDataSource();
  await ds.initialize();

  const repo = ds.getRepository(User);
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const email = faker.internet.email().toLowerCase();
    const username = faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);

    const emailExists = await repo.findOneBy({ email });
    if (emailExists) { skipped++; continue; }

    const usernameExists = await repo.findOneBy({ username });
    if (usernameExists) { skipped++; continue; }

    const user = repo.create({
      email,
      username,
      password: hashedPassword,
      emailVerified: true,
      verificationToken: null,
      role: UserRole.USER,
      isSuspended: false,
      suspendedAt: null,
      suspendReason: null,
    });

    await repo.save(user);
    created++;
  }

  console.log(`✓ Seeded ${created} user(s) (${skipped} skipped — email or username already existed)`);
  console.log(`  Default password for all seeded users: ${DEFAULT_PASSWORD}`);

  await ds.destroy();
}

main().catch((err) => {
  console.error('✗ User seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
