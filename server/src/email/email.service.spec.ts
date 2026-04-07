import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockResendSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

const mockConfigService = {
  get: jest.fn((key: string, fallback?: string) => {
    const map: Record<string, string> = {
      RESEND_API_KEY: 'test-api-key',
      APP_URL: 'http://localhost:5173',
      RESEND_FROM: 'Stash <test@stash.dev>',
    };
    return map[key] ?? fallback ?? '';
  }),
};

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  // ─── sendVerificationEmail ────────────────────────────────────────────────

  describe('sendVerificationEmail()', () => {
    it('calls resend.emails.send with correct from, to, subject, and token in link', async () => {
      mockResendSend.mockResolvedValueOnce({ data: {}, error: null });

      await service.sendVerificationEmail('user@example.com', 'tok-abc');

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Verify'),
          html: expect.stringContaining('tok-abc'),
        }),
      );
    });

    it('throws an error when Resend returns an error object', async () => {
      mockResendSend.mockResolvedValueOnce({ data: null, error: { message: 'Bad API key' } });

      await expect(
        service.sendVerificationEmail('user@example.com', 'tok-abc'),
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  // ─── sendPasswordResetEmail ───────────────────────────────────────────────

  describe('sendPasswordResetEmail()', () => {
    it('calls resend.emails.send with correct from, to, subject, and token in link', async () => {
      mockResendSend.mockResolvedValueOnce({ data: {}, error: null });

      await service.sendPasswordResetEmail('user@example.com', 'reset-tok');

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Reset'),
          html: expect.stringContaining('reset-tok'),
        }),
      );
    });

    it('throws an error when Resend returns an error object', async () => {
      mockResendSend.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited' } });

      await expect(
        service.sendPasswordResetEmail('user@example.com', 'reset-tok'),
      ).rejects.toThrow('Failed to send password reset email');
    });
  });
});
