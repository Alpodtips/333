import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, type UserRole } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { UsersQueryDto } from './dto/users-query.dto';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN' as UserRole, 'USER' as UserRole)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (requires auth)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@User() user: any, @Query() query: UsersQueryDto) {
    return this.usersService.findAll(user, query);
  }

  @Get(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN' as UserRole, 'USER' as UserRole)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by id (requires auth)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string, @User() user: any) {
    return this.usersService.findOne(+id, user);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN' as UserRole, 'USER' as UserRole)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (requires auth)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: any,
  ) {
    return this.usersService.update(+id, updateUserDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN' as UserRole)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
