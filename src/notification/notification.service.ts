import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { UserNotificationSetting } from '../user/entities/user-notification-setting.entity';
import { PaginationDto } from '../utils/pagination.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: any,
    settingKey?: keyof UserNotificationSetting,
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['notificationSettings'],
    });
    if (!user) {
      console.error(`Cannot create notification: User ${userId} not found`);
      return;
    }

    // Check if notification is enabled for this user
    const settings = user.notificationSettings;
    if (settings && settingKey && settings[settingKey] === false) {
      return; // Notification disabled by user
    }

    // Default mapping if settingKey is not provided
    if (settings && !settingKey) {
      if (type === NotificationType.ADMIN && !settings.messagesAdmin) return;
      if (type === NotificationType.AGENT_MESSAGE && !settings.messagesAgent) return;
      if (type === NotificationType.ORDER && !settings.paymentOrderConfirmation) return;
      if (
        (type === NotificationType.PRODUCTPAYMENT || type === NotificationType.CUSTOMDESIGNPAYMENT) &&
        !settings.paymentSuccessful
      )
        return;
    }

    const notification = this.notificationRepo.create({
      user,
      userId,
      type,
      title,
      message,
      metadata,
    });

    const savedNotification = await this.notificationRepo.save(notification);

    // Optional: Integrate Email/SMS channels
    if (settings?.emailNotifications) {
      // this.mailService.sendNotificationEmail(user.email, title, message);
    }
    if (settings?.smsNotifications && user.phoneNumber) {
      // this.smsService.sendNotificationSms(user.phoneNumber, message);
    }

    return savedNotification;
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found or access denied');
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  async getUserNotifications(userId: string, query: PaginationDto) {
    const { page = 1, limit = 10 } = query;
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      total,
      page,
      limit,
    };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }
}
