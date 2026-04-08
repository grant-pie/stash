/**
 * seed-admin — bootstrap the first admin account.
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env.
 *   • If a user with that email already exists → promote them to admin.
 *   • If no user exists with that email → create the account as admin.
 *
 * Usage:
 *   npm run seed:admin
 */

import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog } from '../admin/audit-log.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
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
    const existing = await repo.findOneBy({ email });

    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        console.log(`"${existing.username}" (${email}) is already an admin. Nothing to do.`);
      } else {
        await repo.update(existing.id, { role: UserRole.ADMIN });
        console.log(`Promoted existing user "${existing.username}" (${email}) to admin.`);
      }
    } else {
      const username = email.split('@')[0];
      const hashed = await bcrypt.hash(password, 10);

      await repo.save(
        repo.create({
          email,
          username,
          password: hashed,
          emailVerified: true,
          role: UserRole.ADMIN,
        }),
      );

      console.log(`Created new admin account — email: ${email}, username: ${username}`);
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
