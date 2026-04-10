/**
 * Snippet Seed Script
 *
 * Populates the database with randomly generated code snippets distributed
 * randomly across all existing users (or scoped to one user via --email=).
 *
 * Prerequisites:
 *   - The database must be running and configured in .env
 *   - At least one verified user account must exist (run seed:users first)
 *
 * Usage:
 *   npm run seed:snippets                                     # seeds 20 snippets across all users
 *   npm run seed:snippets -- --count=100                      # seeds 100 snippets across all users
 *   npm run seed:snippets -- --email=user@example.com         # seeds 20 snippets for one user
 *   npm run seed:snippets -- --count=50 --email=u@example.com # seeds 50 snippets for one user
 */

import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { User } from '../users/user.entity';
import { Snippet } from '../snippets/snippet.entity';
import { AuditLog } from '../admin/audit-log.entity';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const LANGUAGES = [
  'typescript', 'javascript', 'python', 'rust', 'go',
  'css', 'html', 'sql', 'bash', 'other',
];

const CODE_SAMPLES: Record<string, string[]> = {
  typescript: [
    `function greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('World'));`,
    `interface User {\n  id: number;\n  email: string;\n  createdAt: Date;\n}\n\nconst getUser = async (id: number): Promise<User> => {\n  const res = await fetch(\`/api/users/\${id}\`);\n  return res.json();\n};`,
    `type Result<T, E = Error> =\n  | { ok: true; value: T }\n  | { ok: false; error: E };\n\nfunction divide(a: number, b: number): Result<number> {\n  if (b === 0) return { ok: false, error: new Error('Division by zero') };\n  return { ok: true, value: a / b };\n}`,
  ],
  javascript: [
    `const debounce = (fn, delay) => {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), delay);\n  };\n};`,
    `async function fetchWithRetry(url, retries = 3) {\n  for (let i = 0; i < retries; i++) {\n    try {\n      return await fetch(url).then(r => r.json());\n    } catch (e) {\n      if (i === retries - 1) throw e;\n    }\n  }\n}`,
    `const groupBy = (arr, key) =>\n  arr.reduce((acc, item) => ({\n    ...acc,\n    [item[key]]: [...(acc[item[key]] ?? []), item],\n  }), {});`,
  ],
  python: [
    `def fibonacci(n: int) -> list[int]:\n    a, b = 0, 1\n    result = []\n    while a < n:\n        result.append(a)\n        a, b = b, a + b\n    return result\n\nprint(fibonacci(100))`,
    `from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n: int) -> int:\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)`,
    `import re\n\ndef slugify(text: str) -> str:\n    text = text.lower().strip()\n    text = re.sub(r'[^\\w\\s-]', '', text)\n    return re.sub(r'[\\s_-]+', '-', text)`,
  ],
  rust: [
    `fn binary_search<T: Ord>(arr: &[T], target: &T) -> Option<usize> {\n    let (mut lo, mut hi) = (0, arr.len());\n    while lo < hi {\n        let mid = lo + (hi - lo) / 2;\n        match arr[mid].cmp(target) {\n            std::cmp::Ordering::Equal => return Some(mid),\n            std::cmp::Ordering::Less => lo = mid + 1,\n            std::cmp::Ordering::Greater => hi = mid,\n        }\n    }\n    None\n}`,
    `use std::collections::HashMap;\n\nfn word_count(text: &str) -> HashMap<&str, usize> {\n    let mut map = HashMap::new();\n    for word in text.split_whitespace() {\n        *map.entry(word).or_insert(0) += 1;\n    }\n    map\n}`,
  ],
  go: [
    `package main\n\nimport "fmt"\n\nfunc sieve(max int) []int {\n    composite := make([]bool, max+1)\n    for i := 2; i*i <= max; i++ {\n        if !composite[i] {\n            for j := i * i; j <= max; j += i {\n                composite[j] = true\n            }\n        }\n    }\n    primes := []int{}\n    for i := 2; i <= max; i++ {\n        if !composite[i] {\n            primes = append(primes, i)\n        }\n    }\n    return primes\n}\n\nfunc main() {\n    fmt.Println(sieve(50))\n}`,
    `package main\n\nimport (\n    "context"\n    "net/http"\n    "time"\n)\n\nfunc get(ctx context.Context, url string) (*http.Response, error) {\n    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)\n    if err != nil {\n        return nil, err\n    }\n    client := &http.Client{Timeout: 10 * time.Second}\n    return client.Do(req)\n}`,
  ],
  css: [
    `:root {\n  --color-primary: #4f46e5;\n  --color-bg: #0f1117;\n  --radius: 8px;\n}\n\n.card {\n  background: var(--color-bg);\n  border-radius: var(--radius);\n  padding: 1rem;\n  box-shadow: 0 2px 8px rgb(0 0 0 / 0.3);\n}`,
    `.truncate-2 {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}`,
  ],
  html: [
    `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Starter</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>`,
    `<form action="/submit" method="POST">\n  <label for="email">Email</label>\n  <input id="email" name="email" type="email" required />\n  <button type="submit">Subscribe</button>\n</form>`,
  ],
  sql: [
    `SELECT\n  u.id,\n  u.email,\n  COUNT(s.id) AS snippet_count\nFROM users u\nLEFT JOIN snippets s ON s.user_id = u.id\nGROUP BY u.id\nORDER BY snippet_count DESC\nLIMIT 10;`,
    `CREATE INDEX idx_snippets_user_created\nON snippets (user_id, created_at DESC);`,
  ],
  bash: [
    `#!/usr/bin/env bash\nset -euo pipefail\n\nfor file in *.log; do\n  gzip "$file"\n  echo "Compressed: $file"\ndone`,
    `#!/usr/bin/env bash\n# Wait for a port to be open\nwait_for() {\n  local host=$1 port=$2\n  until nc -z "$host" "$port"; do\n    echo "Waiting for $host:$port..."\n    sleep 1\n  done\n}`,
  ],
  other: [
    `# Example Makefile\n.PHONY: build test clean\n\nbuild:\n\tgo build -o bin/app ./cmd/app\n\ntest:\n\tgo test ./...\n\nclean:\n\trm -rf bin/`,
    `# nginx.conf snippet\nlocation /api/ {\n    proxy_pass http://localhost:3000/;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n}`,
  ],
};

const TAG_POOL = [
  'utility', 'algorithm', 'data-structures', 'api', 'auth', 'database',
  'cli', 'async', 'types', 'pattern', 'performance', 'security',
  'testing', 'formatting', 'parsing', 'networking', 'filesystem', 'config',
];

function randomTags(): string[] {
  const count = faker.number.int({ min: 0, max: 4 });
  return faker.helpers.arrayElements(TAG_POOL, count);
}

function randomCode(language: string): string {
  const samples = CODE_SAMPLES[language];
  if (samples && samples.length > 0) {
    return faker.helpers.arrayElement(samples);
  }
  return `// ${language} snippet\nconsole.log("hello world");`;
}

function generateSnippet(userId: string): Partial<Snippet> {
  const language = faker.helpers.arrayElement(LANGUAGES);
  const isPublic = faker.datatype.boolean();

  return {
    title: faker.hacker.phrase().slice(0, 80),
    description: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    language,
    content: randomCode(language),
    tags: randomTags(),
    isPublic,
    userId,
  };
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

  const emailArg = process.argv.find((a) => a.startsWith('--email='));
  const email = emailArg?.split('=')[1]?.trim();

  if (isNaN(count) || count < 1) {
    console.error('Error: --count must be a positive integer.');
    process.exit(1);
  }

  const ds = makeDataSource();
  await ds.initialize();

  try {
    const userRepo = ds.getRepository(User);
    const snippetRepo = ds.getRepository(Snippet);

    let userIds: string[];

    if (email) {
      const user = await userRepo.findOneBy({ email });
      if (!user) {
        console.error(`✗ No user found with email: ${email}`);
        process.exit(1);
      }
      userIds = [user.id];
      console.log(`⊕ Seeding snippets for ${email}`);
    } else {
      const users = await userRepo.find({ select: ['id'] });
      if (users.length === 0) {
        console.error('✗ No users found. Run seed:users first.');
        process.exit(1);
      }
      userIds = users.map((u) => u.id);
    }

    const snippets = Array.from({ length: count }, () =>
      generateSnippet(faker.helpers.arrayElement(userIds)),
    );

    await snippetRepo.save(snippets);

    const scope = email ? `for ${email}` : `across ${userIds.length} user(s)`;
    console.log(`✓ Seeded ${snippets.length} snippet(s) ${scope}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  console.error('✗ Snippet seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
