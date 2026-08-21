import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<{ status: string; service: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: '333-api', database: 'up' };
    } catch {
      return { status: 'degraded', service: '333-api', database: 'down' };
    }
  }
}
