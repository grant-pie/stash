import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { logEmailFailure } from './email-file-logger';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const from = this.config.get<string>('RESEND_FROM', 'Stash <onboarding@resend.dev>');
    const link = `${appUrl}/verify-email?token=${token}`;

    const { error } = await this.resend.emails.send({
      from,
      to,
      subject: 'Verify your Stash account',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f1117;color:#e6edf3;border-radius:8px">
          <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;color:#818cf8">Stash</h1>
          <p style="font-size:16px;font-weight:600;margin-bottom:8px">Verify your email address</p>
          <p style="font-size:14px;color:#8b949e;margin-bottom:24px">
            Thanks for signing up. Click the button below to verify your email address and activate your account.
          </p>
          <a href="${link}"
             style="display:inline-block;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none">
            Verify email
          </a>
          <p style="font-size:12px;color:#6e7681;margin-top:24px">
            Or copy this link into your browser:<br/>
            <span style="color:#8b949e;word-break:break-all">${link}</span>
          </p>
          <p style="font-size:12px;color:#6e7681;margin-top:16px">
            If you didn't create a Stash account you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send verification email to ${to}: ${error.message}`);
      logEmailFailure('verification', to, error.message);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const from = this.config.get<string>('RESEND_FROM', 'Stash <onboarding@resend.dev>');
    const link = `${appUrl}/reset-password?token=${token}`;

    const { error } = await this.resend.emails.send({
      from,
      to,
      subject: 'Reset your Stash password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f1117;color:#e6edf3;border-radius:8px">
          <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;color:#818cf8">Stash</h1>
          <p style="font-size:16px;font-weight:600;margin-bottom:8px">Reset your password</p>
          <p style="font-size:14px;color:#8b949e;margin-bottom:24px">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in <strong style="color:#e6edf3">1 hour</strong>.
          </p>
          <a href="${link}"
             style="display:inline-block;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none">
            Reset password
          </a>
          <p style="font-size:12px;color:#6e7681;margin-top:24px">
            Or copy this link into your browser:<br/>
            <span style="color:#8b949e;word-break:break-all">${link}</span>
          </p>
          <p style="font-size:12px;color:#6e7681;margin-top:16px">
            If you didn't request a password reset you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
      logEmailFailure('password-reset', to, error.message);
      throw new Error('Failed to send password reset email');
    }
  }
}
