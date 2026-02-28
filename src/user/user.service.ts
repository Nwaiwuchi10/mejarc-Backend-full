import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginRequestDto, VerifyLoginTokenDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { UserAddress } from './entities/user-adress.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from './service/mail.service';
import { Agent } from '../agent/entities/agent.entity';
import { PaginationDto } from '../utils/pagination.dto';
import { Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserAddress)
    private readonly addressRepo: Repository<UserAddress>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) { }

  async create(dto: CreateUserDto, file?: Express.Multer.File) {
    return this.dataSource.transaction(async (manager) => {
      // === Check email uniqueness ===
      const emailExists = await manager.findOne(User, {
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new BadRequestException('Email already in use');
      }

      // === Optional phone uniqueness ===
      if (dto.phoneNumber) {
        const phoneExists = await manager.findOne(User, {
          where: { phoneNumber: dto.phoneNumber },
        });

        if (phoneExists) {
          throw new BadRequestException('Phone number already in use');
        }
      }

      // === Handle profile image upload (S3-compatible) ===
      let profilePics: string | undefined;

      if (file) {
        const uploadedFile = file as Express.Multer.File & {
          location?: string;
        };
        if (!uploadedFile.location) {
          throw new BadRequestException('File upload failed: location missing');
        }
        profilePics = uploadedFile.location;
      }

      // === Create Address (if provided) ===
      let address: UserAddress | undefined;

      if (dto.address) {
        address = manager.create(UserAddress, {
          ...dto.address,
        });
      }

      // === Create User ===
      const user = manager.create(User, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        name: `${dto.firstName} ${dto.lastName}`,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        password: dto.password,

        profilePics,
        address,
      });

      const savedUser = await manager.save(User, user);
      await this.mailService.staffOnboardingMail(savedUser);

      return savedUser;
    });
  }

  // ===== LOGIN FLOW =====

  /**
   * Step 1: Initiate login with email and password
   * Validates credentials and sends verification token to email
   */
  async initiateLogin(loginDto: LoginRequestDto) {
    // === Find user by email ===
    const user = await this.userRepo.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // === Check if account is suspended ===
    if (user.isSuspended) {
      throw new UnauthorizedException(
        'Your account has been suspended. Please contact support.',
      );
    }

    // === Check password validity ===
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password || '',
    );

    if (!isPasswordValid) {
      // === Increment login attempts ===
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      user.lastLoginAttempt = new Date();

      // === Lock account after 5 failed attempts ===
      if (user.loginAttempts >= 5) {
        user.isSuspended = true;
        await this.userRepo.save(user);
        throw new UnauthorizedException(
          'Account locked due to multiple failed login attempts. Please contact support.',
        );
      }

      await this.userRepo.save(user);
      throw new UnauthorizedException('Invalid email or password');
    }

    // === Reset login attempts on successful validation ===
    user.loginAttempts = 0;
    user.lastLoginAttempt = new Date();

    // === Generate verification token (6-digit code) ===
    const verificationToken = crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase();

    // === Set token expiry (15 minutes) ===
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 15);

    user.loginVerificationToken = verificationToken;
    user.loginVerificationTokenExpiry = expiryTime;

    await this.userRepo.save(user);

    // === Send verification email ===
    await this.mailService.sendLoginVerificationEmail(
      user.email,
      user.firstName,
      verificationToken,
    );

    return {
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.',
      email: user.email,
      expiresIn: '15 minutes',
    };
  }

  /**
   * Step 2: Verify login token and complete authentication.
   * Detects if the user is also an agent and issues separate tokens.
   */
  async verifyLoginToken(verifyDto: VerifyLoginTokenDto) {
    // === Find user by email ===
    const user = await this.userRepo.findOne({
      where: { email: verifyDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // === Check if verification token exists ===
    if (!user.loginVerificationToken) {
      throw new UnauthorizedException(
        'No verification token found. Please login first.',
      );
    }

    // === Check if token has expired ===
    if (
      user.loginVerificationTokenExpiry &&
      user.loginVerificationTokenExpiry < new Date()
    ) {
      user.loginVerificationToken = undefined;
      user.loginVerificationTokenExpiry = undefined;
      await this.userRepo.save(user);
      throw new UnauthorizedException(
        'Verification token has expired. Please login again.',
      );
    }

    // === Verify token ===
    if (user.loginVerificationToken !== verifyDto.verificationToken) {
      throw new UnauthorizedException('Invalid verification token');
    }

    // === Token verified - complete login ===
    user.isEmailVerified = true;
    user.loginVerificationToken = undefined;
    user.loginVerificationTokenExpiry = undefined;
    user.loginAttempts = 0;

    const updatedUser = await this.userRepo.save(user);

    // === Detect agent role ===
    const agentRecord = await this.agentRepo.findOne({
      where: { userId: updatedUser.id },
    });
    const isAgent = !!agentRecord;

    // === Send login success email ===
    try {
      await this.mailService.staffLoginMail(updatedUser);
    } catch (_) { }

    // === Return safe user data (without password) ===
    const { password, ...userDataWithoutPassword } = updatedUser;

    // Always issue user token
    const userToken = this.jwtService.sign({
      userId: updatedUser.id,
      role: 'user',
    });

    // Also issue agent token if user has an agent record
    const agentToken = isAgent
      ? this.jwtService.sign({
        userId: updatedUser.id,
        agentId: agentRecord!.id,
        role: 'agent',
      })
      : undefined;

    return {
      success: true,
      message: 'Login successful',
      isAgent,
      role: isAgent ? 'agent' : 'user',
      user: userDataWithoutPassword,
      userToken,
      ...(isAgent && { agentToken }),
    };
  }

  /**
   * Generate a JWT token (legacy helper — kept for compatibility)
   */
  async generateJWT(user: User) {
    return this.jwtService.sign({ userId: user.id, role: 'user' });
  }

  private generateJwt(userId: string): string {
    return this.jwtService.sign({ userId, role: 'user' });
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepo.remove(user);

    return { message: `User with ID ${id} has been removed` };
  }
  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryOptions: any = {
      order: { createdAt: 'DESC' },
      take: limit,
      skip: skip,
    };

    if (search) {
      queryOptions.where = [
        { firstName: Like(`%${search}%`) },
        { lastName: Like(`%${search}%`) },
        { email: Like(`%${search}%`) },
      ];
    }

    const [data, total] = await this.userRepo.findAndCount(queryOptions);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async forgotPassword(email: string) {
    const staff = await this.userRepo.findOne({ where: { email } });

    if (!staff) {
      throw new NotFoundException('No user found with this email');
    }

    // generate token

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    staff.resetToken = token;
    staff.resetTokenExpires = expires;

    await this.userRepo.save(staff);

    await this.mailService.sendPasswordResetEmail(staff.email, token);

    return {
      message:
        'Password reset link sent successfully to your registered email address',
    };
  }
  async resetPassword(token: string, newPassword: string) {
    const staff: any = await this.userRepo.findOne({
      where: { resetToken: token },
    });

    if (!staff) {
      throw new BadRequestException('Invalid token');
    }

    if (staff.resetTokenExpires < new Date()) {
      throw new BadRequestException('Reset token expired');
    }

    // update password
    const salt = await bcrypt.genSalt(10);
    staff.password = await bcrypt.hash(newPassword, salt);

    // clear reset fields
    staff.resetToken = null;
    staff.resetTokenExpires = null;

    await this.userRepo.save(staff);

    return { message: 'Password successfully reset' };
  }
}
