import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUsername = await this.usersService.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException({
        message: 'This username is already taken.',
        errorCode: 'USERNAME_TAKEN',
      });
    }

    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      if (!existing.emailVerified) {
        // Refresh the token and attempt to resend — but never let a mail
        // delivery failure swallow the intended 409 response.
        const token = randomUUID();
        await this.usersService.updateVerificationToken(existing.id, token);
        try {
          await this.emailService.sendVerificationEmail(existing.email, token);
        } catch (err) {
          this.logger.warn(`Failed to resend verification email to ${existing.email}: ${err}`);
        }
        throw new ConflictException({
          message: 'This email is registered but not yet verified. We\'ve resent the verification email — check your inbox.',
          errorCode: 'EMAIL_NOT_VERIFIED',
        });
      }
      throw new ConflictException({
        message: 'An account with this email already exists.',
        errorCode: 'EMAIL_TAKEN',
      });
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const token = randomUUID();

    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      password: hashed,
      emailVerified: false,
      verificationToken: token,
    });

    try {
      await this.emailService.sendVerificationEmail(user.email, token);
    } catch (err) {
      this.logger.warn(`Failed to send verification email to ${user.email}: ${err}`);
    }

    return {
      message: 'Account created! Please check your inbox and verify your email to sign in.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailOrUsername(dto.identifier);
    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'Please verify your email before signing in. Check your inbox for the verification link.',
        errorCode: 'EMAIL_NOT_VERIFIED',
      });
    }

    if (user.isSuspended) {
      throw new UnauthorizedException({
        message: user.suspendReason
          ? `Your account has been suspended: ${user.suspendReason}`
          : 'Your account has been suspended. Please contact support.',
        errorCode: 'ACCOUNT_SUSPENDED',
      });
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      access_token: accessToken,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException(
        'This verification link is invalid or has already been used.',
      );
    }

    await this.usersService.markEmailVerified(user.id);
    return { message: 'Email verified! You can now sign in.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Always return the same message to prevent email enumeration
    const genericResponse = {
      message: "If an account with that email exists, we've sent a password reset link.",
    };

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.emailVerified) return genericResponse;

    const token = randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersService.setResetToken(user.id, token, expiry);

    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (err) {
      this.logger.warn(`Failed to send password reset email to ${user.email}: ${err}`);
    }

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);

    if (!user || !user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      throw new BadRequestException(
        'This reset link is invalid or has expired. Please request a new one.',
      );
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    await this.usersService.updatePassword(user.id, hashed);

    return { message: 'Password reset successfully. You can now sign in.' };
  }
}
