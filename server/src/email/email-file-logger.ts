import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'email-errors.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logEmailFailure(
  type: 'verification' | 'password-reset' | 'resend-verification',
  to: string,
  error: string,
): void {
  try {
    ensureLogDir();
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      type,
      to,
      error,
    });
    fs.appendFileSync(LOG_FILE, entry + '\n', 'utf8');
  } catch {
    // Swallow — never let logging failures mask the original error
  }
}
