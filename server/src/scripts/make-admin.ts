/**
 * make-admin — promote an existing user to admin by email.
 *
 * Accepts a single positional argument: the user's email address.
 * Throws an error (exit 1) if no account with that email is found.
 * Never creates accounts.
 *
 * Usage:
 *   npm run make:admin -- user@example.com
 */

import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog } from '../admin/audit-log.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npm run make:admin -- <email>');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'stash',
    entities: [User, Snippet, AuditLog],
    synchronize: false,
  });

  await ds.initialize();

  try {
    const repo = ds.getRepository(User);
    const user = await repo.findOneBy({ email });

    if (!user) {
      console.error(`Error: No account found with email "${email}". Register first.`);
      process.exit(1);
    }

    if (user.role === UserRole.ADMIN) {
      console.log(`"${user.username}" (${email}) is already an admin. Nothing to do.`);
      return;
    }

    await repo.update(user.id, { role: UserRole.ADMIN });
    console.log(`Successfully promoted "${user.username}" (${email}) to admin.`);
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
