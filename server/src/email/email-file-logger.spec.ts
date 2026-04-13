import * as fs from 'fs';
import * as path from 'path';

// Mock the entire fs module so no files are ever written during tests
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

// Re-import after mocking so the module picks up the mocked fs
import { logEmailFailure } from './email-file-logger';

describe('logEmailFailure()', () => {
  const LOG_DIR = path.resolve(process.cwd(), 'logs');
  const LOG_FILE = path.join(LOG_DIR, 'email-errors.log');

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: directory already exists
    mockFs.existsSync.mockReturnValue(true);
    mockFs.appendFileSync.mockImplementation(() => undefined);
  });

  it('writes a JSON line to the log file', () => {
    logEmailFailure('verification', 'user@example.com', 'SMTP error');

    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      LOG_FILE,
      expect.stringMatching(/^\{.*\}\n$/),
      'utf8',
    );
  });

  it('written entry contains the correct type, to, and error fields', () => {
    logEmailFailure('password-reset', 'test@example.com', 'Timeout');

    const [, written] = mockFs.appendFileSync.mock.calls[0];
    const entry = JSON.parse((written as string).trim());

    expect(entry.type).toBe('password-reset');
    expect(entry.to).toBe('test@example.com');
    expect(entry.error).toBe('Timeout');
  });

  it('written entry includes a valid ISO timestamp', () => {
    logEmailFailure('resend-verification', 'a@b.com', 'err');

    const [, written] = mockFs.appendFileSync.mock.calls[0];
    const entry = JSON.parse((written as string).trim());

    expect(() => new Date(entry.timestamp)).not.toThrow();
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('creates the log directory if it does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);

    logEmailFailure('verification', 'a@b.com', 'err');

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(LOG_DIR, { recursive: true });
  });

  it('does not create the directory if it already exists', () => {
    mockFs.existsSync.mockReturnValue(true);

    logEmailFailure('verification', 'a@b.com', 'err');

    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });

  it('does not throw if appendFileSync throws', () => {
    mockFs.appendFileSync.mockImplementation(() => { throw new Error('disk full'); });

    expect(() => logEmailFailure('verification', 'a@b.com', 'err')).not.toThrow();
  });

  it('does not throw if mkdirSync throws', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => { throw new Error('permission denied'); });

    expect(() => logEmailFailure('verification', 'a@b.com', 'err')).not.toThrow();
  });

  it('accepts all three valid type values', () => {
    const types: Array<'verification' | 'password-reset' | 'resend-verification'> = [
      'verification',
      'password-reset',
      'resend-verification',
    ];

    for (const type of types) {
      jest.clearAllMocks();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.appendFileSync.mockImplementation(() => undefined);

      logEmailFailure(type, 'x@y.com', 'err');

      const [, written] = mockFs.appendFileSync.mock.calls[0];
      const entry = JSON.parse((written as string).trim());
      expect(entry.type).toBe(type);
    }
  });
});
