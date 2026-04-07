import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';

const mockUsersService = {
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
  findByEmailOrUsername: jest.fn(),
  findByVerificationToken: jest.fn(),
  findByResetToken: jest.fn(),
  create: jest.fn(),
  updateVerificationToken: jest.fn(),
  markEmailVerified: jest.fn(),
  setResetToken: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed.jwt.token'),
};

const mockEmailService = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid',
    email: 'test@example.com',
    username: 'testuser',
    password: '$2b$10$hashedpassword',
    emailVerified: true,
    verificationToken: null,
    resetPasswordToken: null,
    resetPasswordExpiry: null,
    isSuspended: false,
    suspendedAt: null,
    suspendReason: null,
    role: 'user',
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register()', () => {
    const dto = { email: 'new@example.com', username: 'newuser', password: 'password123' };

    it('throws ConflictException with USERNAME_TAKEN if username exists', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(makeUser());
      await expect(service.register(dto)).rejects.toMatchObject({
        response: { errorCode: 'USERNAME_TAKEN' },
      });
    });

    it('throws ConflictException with EMAIL_NOT_VERIFIED when email exists but is unverified', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.findByEmail.mockResolvedValueOnce(
        makeUser({ emailVerified: false, verificationToken: 'old-token' }),
      );
      mockUsersService.updateVerificationToken.mockResolvedValueOnce(undefined);
      mockEmailService.sendVerificationEmail.mockResolvedValueOnce(undefined);

      await expect(service.register(dto)).rejects.toMatchObject({
        response: { errorCode: 'EMAIL_NOT_VERIFIED' },
      });
      expect(mockUsersService.updateVerificationToken).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('still throws EMAIL_NOT_VERIFIED even if resend email call throws', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.findByEmail.mockResolvedValueOnce(
        makeUser({ emailVerified: false }),
      );
      mockUsersService.updateVerificationToken.mockResolvedValueOnce(undefined);
      mockEmailService.sendVerificationEmail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(service.register(dto)).rejects.toMatchObject({
        response: { errorCode: 'EMAIL_NOT_VERIFIED' },
      });
    });

    it('throws ConflictException with EMAIL_TAKEN when email exists and is verified', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.findByEmail.mockResolvedValueOnce(makeUser({ emailVerified: true }));

      await expect(service.register(dto)).rejects.toMatchObject({
        response: { errorCode: 'EMAIL_TAKEN' },
      });
    });

    it('hashes the password and creates the user', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.create.mockResolvedValueOnce(makeUser({ email: dto.email }));
      mockEmailService.sendVerificationEmail.mockResolvedValueOnce(undefined);

      await service.register(dto);

      const createCall = mockUsersService.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, createCall.password)).toBe(true);
    });

    it('sends a verification email after creating the user', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.create.mockResolvedValueOnce(makeUser({ email: dto.email }));
      mockEmailService.sendVerificationEmail.mockResolvedValueOnce(undefined);

      await service.register(dto);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        makeUser({ email: dto.email }).email,
        expect.any(String),
      );
    });

    it('returns a success message even if verification email send fails', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.create.mockResolvedValueOnce(makeUser());
      mockEmailService.sendVerificationEmail.mockRejectedValueOnce(new Error('SMTP down'));

      const result = await service.register(dto);
      expect(result).toHaveProperty('message');
    });

    it('returns the expected success message', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.create.mockResolvedValueOnce(makeUser());
      mockEmailService.sendVerificationEmail.mockResolvedValueOnce(undefined);

      const result = await service.register(dto);
      expect(result.message).toMatch(/verify your email/i);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const dto = { identifier: 'test@example.com', password: 'correct-password' };
    const hashed = bcrypt.hashSync('correct-password', 10);

    it('throws UnauthorizedException if no user is found', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValueOnce(null);
      await expect(service.login(dto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValueOnce(
        makeUser({ password: hashed }),
      );
      await expect(service.login({ ...dto, password: 'wrong-password' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException with EMAIL_NOT_VERIFIED if email is not verified', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValueOnce(
        makeUser({ password: hashed, emailVerified: false }),
      );
      await expect(service.login(dto)).rejects.toMatchObject({
        response: { errorCode: 'EMAIL_NOT_VERIFIED' },
      });
    });

    it('throws UnauthorizedException with ACCOUNT_SUSPENDED when user is suspended (no reason)', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValueOnce(
        makeUser({ password: hashed, isSuspended: true, suspendReason: null }),
      );
      await expect(service.login(dto)).rejects.toMatchObject({
        response: { errorCode: 'ACCOUNT_SUSPENDED' },
      });
    });

    it('includes the suspension reason in the message when set', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValueOnce(
        makeUser({ password: hashed, isSuspended: true, suspendReason: 'Violated TOS' }),
      );
      await expect(service.login(dto)).rejects.toMatchObject({
        response: { message: expect.stringContaining('Violated TOS') },
      });
    });

    it('returns access_token and user object on success', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValueOnce(makeUser({ password: hashed }));
      const result = await service.login(dto);
      expect(result).toHaveProperty('access_token', 'signed.jwt.token');
      expect(result).toHaveProperty('user');
    });

    it('returned user object includes role', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValueOnce(
        makeUser({ password: hashed, role: 'admin' }),
      );
      const result = await service.login(dto);
      expect(result.user).toMatchObject({ role: 'admin' });
    });
  });

  // ─── verifyEmail ──────────────────────────────────────────────────────────

  describe('verifyEmail()', () => {
    it('throws BadRequestException if token is not found', async () => {
      mockUsersService.findByVerificationToken.mockResolvedValueOnce(null);
      await expect(service.verifyEmail('bad-token')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks the email as verified and returns a success message', async () => {
      mockUsersService.findByVerificationToken.mockResolvedValueOnce(makeUser());
      mockUsersService.markEmailVerified.mockResolvedValueOnce(undefined);

      const result = await service.verifyEmail('valid-token');
      expect(mockUsersService.markEmailVerified).toHaveBeenCalledWith('user-uuid');
      expect(result.message).toMatch(/email verified/i);
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    const dto = { email: 'test@example.com' };

    it('returns the generic response if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      const result = await service.forgotPassword(dto);
      expect(result).toHaveProperty('message');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('returns the generic response if user email is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(makeUser({ emailVerified: false }));
      const result = await service.forgotPassword(dto);
      expect(result).toHaveProperty('message');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('sets a reset token with a 1-hour expiry and sends the reset email', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(makeUser());
      mockUsersService.setResetToken.mockResolvedValueOnce(undefined);
      mockEmailService.sendPasswordResetEmail.mockResolvedValueOnce(undefined);

      const before = Date.now();
      await service.forgotPassword(dto);
      const after = Date.now();

      const [, , expiry] = mockUsersService.setResetToken.mock.calls[0];
      expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 100);
      expect(expiry.getTime()).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 100);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('still returns the generic message if email send fails', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(makeUser());
      mockUsersService.setResetToken.mockResolvedValueOnce(undefined);
      mockEmailService.sendPasswordResetEmail.mockRejectedValueOnce(new Error('SMTP down'));

      const result = await service.forgotPassword(dto);
      expect(result).toHaveProperty('message');
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    const dto = { token: 'reset-token', password: 'NewPassword1!' };

    it('throws BadRequestException if reset token is not found', async () => {
      mockUsersService.findByResetToken.mockResolvedValueOnce(null);
      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException if the token has expired', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      mockUsersService.findByResetToken.mockResolvedValueOnce(
        makeUser({ resetPasswordExpiry: expiredDate }),
      );
      await expect(service.resetPassword(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hashes the new password and calls updatePassword', async () => {
      const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
      mockUsersService.findByResetToken.mockResolvedValueOnce(
        makeUser({ resetPasswordExpiry: futureExpiry }),
      );
      mockUsersService.updatePassword.mockResolvedValueOnce(undefined);

      const result = await service.resetPassword(dto);
      const [, hashedPw] = mockUsersService.updatePassword.mock.calls[0];
      expect(await bcrypt.compare(dto.password, hashedPw)).toBe(true);
      expect(result.message).toMatch(/password reset/i);
    });
  });
});
