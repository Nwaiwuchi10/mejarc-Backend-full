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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginRequestDto, VerifyLoginTokenDto } from './dto/login.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { createS3Storage } from 'src/utils/aws-s3.config';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('imgFile', {
      storage: createS3Storage('user-profile-pics'),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for profile pics
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('dto') dto: string,
  ) {
    // const userId = req.userId;

    const parsedDto = dto ? JSON.parse(dto) : {};

    return this.userService.create(parsedDto, file);
  }
  @Post('/creates')
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
  async login(@Body() loginDto: LoginRequestDto) {
    return this.userService.initiateLogin(loginDto);
  }

  /**
   * POST /user/verify-login-token
   * Verifies the login token and completes authentication
   * Returns user data and JWT token on success
   */
  @Post('/verify-login-token')
  async verifyLoginToken(@Body() verifyDto: VerifyLoginTokenDto) {
    return this.userService.verifyLoginToken(verifyDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.userService.forgotPassword(email);
  }
  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.userService.resetPassword(token, newPassword);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.userService.update(+id, updateUserDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
