import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginRequestDto, VerifyLoginTokenDto } from './dto/login.dto';
import { PaginationDto } from '../utils/pagination.dto';
import { UserAuthGuard } from './guard/user.guard';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { AWS_S3_BUCKET_NAME, s3Client } from 'src/utils/aws-s3.config';

import * as multerS3 from 'multer-s3';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a new user with optional profile image',
    description:
      'Registers a user account with multipart form data containing optional profile photo and JSON dto string',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imgFile: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file (max 100MB)',
        },
        dto: {
          type: 'string',
          description:
            'JSON stringified CreateUserDto payload e.g. {"name":"John","email":"john@example.com","password":"secret","phoneNumber":"+1234567890"}',
          example:
            '{"name":"John Doe","email":"john@example.com","password":"Password123!","phoneNumber":"+1234567890"}',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({
    status: 400,
    description: 'Validation error / email already exists',
  })
  @UseInterceptors(
    FileInterceptor('imgFile', {
      storage: multerS3({
        s3: s3Client as any,
        bucket: AWS_S3_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const sanitized = file.originalname
            .replace(/\s+/g, '')
            .replace(/[^a-zA-Z0-9.-]/g, '');
          cb(null, `user-profile-pics/${Date.now()}-${sanitized}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for profile pics
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('dto') dto: string,
  ) {
    const parsedDto = dto ? JSON.parse(dto) : {};
    return this.userService.create(parsedDto, file);
  }

  @Post('/creates')
  @ApiOperation({
    summary: 'Register user with JSON body',
    description:
      'Alternative JSON-only endpoint for user registration without file upload',
  })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  creates(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // ===== LOGIN ENDPOINTS =====

  /**
   * POST /user/login
   * Initiates login process with email and password
   * Sends verification token to user's email
   */
  @Post('/login')
  @ApiOperation({
    summary: 'Initiate user login',
    description:
      'Validates credentials and sends a 6-digit OTP login verification token to the user email',
  })
  @ApiResponse({ status: 200, description: 'OTP token sent to email' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() loginDto: LoginRequestDto) {
    return this.userService.initiateLogin(loginDto);
  }

  /**
   * POST /user/verify-login-token
   * Verifies the login token and completes authentication
   * Returns user data and JWT token on success
   */
  @Post('/verify-login-token')
  @ApiOperation({
    summary: 'Verify login OTP token',
    description:
      'Verifies the email OTP token and returns the JWT authorization token and user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful, returns JWT token',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP token' })
  async verifyLoginToken(@Body() verifyDto: VerifyLoginTokenDto) {
    return this.userService.verifyLoginToken(verifyDto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset token',
    description:
      'Sends password reset link / token to registered email address',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reset token dispatched if email exists',
  })
  forgotPassword(@Body('email') email: string) {
    return this.userService.forgotPassword(email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Sets a new password using the reset token received via email',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'reset-token-uuid-or-code' },
        newPassword: { type: 'string', example: 'NewSecurePassword123!' },
      },
      required: ['token', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.userService.resetPassword(token, newPassword);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of all users',
    description: 'Returns paginated list of users',
  })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.userService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  /**
   * PATCH /user/profile
   * Updates the profile of the currently logged-in user.
   * Supports profile picture upload and nested address updates.
   */
  @Patch('profile')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update current logged-in user profile',
    description: 'Updates profile information and optional profile picture',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imgFile: {
          type: 'string',
          format: 'binary',
          description: 'New profile photo file',
        },
        dto: {
          type: 'string',
          description: 'JSON stringified UpdateUserDto object',
          example: '{"name":"John Updated","phoneNumber":"+1234567890"}',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FileInterceptor('imgFile', {
      storage: multerS3({
        s3: s3Client as any,
        bucket: AWS_S3_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
          const sanitized = file.originalname
            .replace(/\s+/g, '')
            .replace(/[^a-zA-Z0-9.-]/g, '');
          cb(null, `user-profile-pics/${Date.now()}-${sanitized}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    }),
  )
  async updateProfile(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('dto') dto: string,
  ) {
    const userId = req.userId;
    const parsedDto = dto ? JSON.parse(dto) : {};
    return this.userService.update(userId, parsedDto, file);
  }

  @Get('profile/notification-settings')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings retrieved' })
  async getNotificationSettings(@Req() req: any) {
    return this.userService.getNotificationSettings(req.userId);
  }

  @Patch('profile/notification-settings')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user notification settings' })
  @ApiResponse({ status: 200, description: 'Notification settings updated' })
  async updateNotificationSettings(
    @Req() req: any,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.userService.updateNotificationSettings(req.userId, dto);
  }
}
