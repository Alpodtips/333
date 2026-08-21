import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JWT_EXPIRATION } from './constants';
import { JWT_REFRESH_EXPIRATION } from './constants';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../common/services/email.service';
import { createHash, randomBytes } from 'node:crypto';
import ms = require('ms');
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + ms(JWT_REFRESH_EXPIRATION));
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = this.jwtService.sign(
      { email: registerDto.email },
      { expiresIn: '24h' },
    );

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    await this.emailService.sendVerificationEmail(
      registerDto.email,
      verificationToken,
    );

    return { ...user, message: 'Check your email to verify your account' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.emailVerified === false) {
      throw new UnauthorizedException('Email address is not verified');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload, {
      expiresIn: JWT_EXPIRATION,
    });
    const refresh_token = randomBytes(48).toString('hex');
    const expiresAt = this.getRefreshTokenExpiry();
    await this.prisma.refreshToken.create({
      data: {
        token: this.hashRefreshToken(refresh_token),
        userId: user.id,
        expiresAt,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      access_token,
      refresh_token,
    };
  }

  async refreshAccessToken(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = this.hashRefreshToken(refreshTokenDto.refresh_token);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.user.emailVerified === false) {
      throw new UnauthorizedException('Email address is not verified');
    }

    const user = storedToken.user;
    const newAccessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: JWT_EXPIRATION },
    );
    const newRefreshToken = randomBytes(48).toString('hex');
    const expiresAt = this.getRefreshTokenExpiry();

    await this.prisma.$transaction([
      this.prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      this.prisma.refreshToken.create({
        data: {
          token: this.hashRefreshToken(newRefreshToken),
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    return { access_token: newAccessToken, refresh_token: newRefreshToken };
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user || user.verificationToken !== token || !user.verificationTokenExpiresAt) {
        throw new UnauthorizedException('Invalid verification token');
      }

      if (user.verificationTokenExpiresAt < new Date()) {
        throw new UnauthorizedException('Verification token expired');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });

      return { message: 'Email verified successfully' };
    } catch {
      throw new UnauthorizedException('Invalid verification token');
    }
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = this.jwtService.sign(
      { email },
      { expiresIn: '24h' },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.emailService.sendVerificationEmail(email, verificationToken);
    return { message: 'Verification email sent' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (user) {
      const resetToken = randomBytes(48).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: this.hashRefreshToken(resetToken),
          resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await this.emailService.sendResetPasswordEmail(user.email, resetToken);
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const tokenHash = this.hashRefreshToken(resetPasswordDto.token);
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    return { message: 'Password reset successfully' };
  }
}
