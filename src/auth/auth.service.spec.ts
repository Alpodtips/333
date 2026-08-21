import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../common/services/email.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: { sendVerificationEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.register(registerDto);

      expect(result).toMatchObject(mockUser);
      expect(result.message).toBe('Check your email to verify your account');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1 });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        password: 'hashedpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token123');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result.email).toBe('test@example.com');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw error for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject an explicitly unverified email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        password: 'hashedpassword',
        emailVerified: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login({
        email: 'test@example.com',
        password: 'password123',
      })).rejects.toThrow('Email address is not verified');
    });
  });

  describe('refreshAccessToken', () => {
    it('should rotate the refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 4,
        expiresAt: new Date(Date.now() + 60_000),
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'USER',
          emailVerified: true,
        },
      });
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshAccessToken({
        refresh_token: 'old-refresh-token',
      });

      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).not.toBe('old-refresh-token');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});

