import { Injectable } from '@nestjs/common';
import { logger } from '../logger';

@Injectable()
export class EmailService {
  async sendVerificationEmail(email: string, verificationToken: string) {
    const verificationLink = this.buildLink('verify-email', verificationToken);
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Development verification link generated', { to: email, verificationLink });
    }
    await this.send(email, 'Verify your email', `Verify your account: ${verificationLink}`);
    return { verificationLink };
  }

  async sendResetPasswordEmail(email: string, resetToken: string) {
    const resetLink = this.buildLink('reset-password', resetToken);
    await this.send(email, 'Reset your password', `Reset your password: ${resetLink}`);
    return { resetLink };
  }

  private buildLink(path: string, token: string): string {
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return `${appUrl}/v1/auth/${path}?token=${encodeURIComponent(token)}`;
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('RESEND_API_KEY and EMAIL_FROM must be configured in production');
      }

      logger.info('Email delivery is not configured; verification link generated', { to });
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    if (!response.ok) {
      throw new Error(`Email delivery failed with status ${response.status}`);
    }
  }
}
