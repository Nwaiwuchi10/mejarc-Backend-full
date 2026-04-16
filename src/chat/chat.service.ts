import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { User } from '../user/entities/user.entity';
import { UserNotificationSetting } from '../user/entities/user-notification-setting.entity';
import { PaginationDto } from '../utils/pagination.dto';
import { ChatGateway } from './gateway/chat.gateway';
import { NotificationService } from '../notification/notification.service';
import { Admin } from '../admin/entities/admin.entity';
import { Agent } from '../agent/entities/agent.entity';
import { NotificationType } from '../notification/entities/notification.entity';
import { CustomDesign } from '../customdesign/entities/customdesign.entity';
import { CustomDesignWorkspaceService } from '../customdesign/customdesign-workspace.service';
import { ActivityType } from '../customdesign/customdesign.types';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(CustomDesign)
    private readonly customDesignRepo: Repository<CustomDesign>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => CustomDesignWorkspaceService))
    private readonly workspaceService: CustomDesignWorkspaceService,
  ) {}

  /**
   * Starts a direct message conversation between two users.
   * If one already exists, returns it.
   */
  async startDM(user1Id: string, user2Id: string): Promise<Conversation> {
    if (user1Id === user2Id) {
      throw new BadRequestException('Cannot start a chat with yourself');
    }

    // Check if the recipient exists.
    const recipient = await this.userRepo.findOne({ where: { id: user2Id } });
    if (!recipient) {
      throw new NotFoundException(`User with ID ${user2Id} not found`);
    }

    // Try to find an existing DM between these two users.
    // DMs always have exactly 2 members.
    const existing = await this.conversationRepo
      .createQueryBuilder('conversation')
      .innerJoin('conversation.members', 'm1')
      .innerJoin('conversation.members', 'm2')
      .where('conversation.type = :type', { type: ConversationType.DM })
      .andWhere('m1.userId = :u1', { u1: user1Id })
      .andWhere('m2.userId = :u2', { u2: user2Id })
      .getOne();

    if (existing) {
      return this.getConversationDetails(existing.id);
    }

    // Create new conversation
    const conversation = this.conversationRepo.create({
      type: ConversationType.DM,
    });
    const savedConversation = await this.conversationRepo.save(conversation);

    // Add both as members
    const member1 = this.memberRepo.create({
      conversation: savedConversation,
      user: { id: user1Id } as User,
    });
    const member2 = this.memberRepo.create({
      conversation: savedConversation,
      user: { id: user2Id } as User,
    });

    await this.memberRepo.save([member1, member2]);

    const conversationDetails = await this.getConversationDetails(savedConversation.id);
    
    // Notify participants about the new conversation
    this.chatGateway.emitNewConversation(conversationDetails);

    return conversationDetails;
  }

  /**
   * Starts or retrieves a conversation for a specific custom design.
   */
  async startCustomDesignChat(userId: string, customdesignId: string): Promise<Conversation> {
    // Check if conversation already exists for this design
    const existing = await this.conversationRepo.findOne({
      where: { 
        type: ConversationType.CUSTOMDESIGN,
        customdesignId: customdesignId 
      },
    });

    if (existing) {
      return this.getConversationDetails(existing.id);
    }

    // Verify the custom design exists
    const customDesign = await this.customDesignRepo.findOne({
      where: { id: customdesignId },
    });

    if (!customDesign) {
      throw new NotFoundException(`Custom design with ID ${customdesignId} not found`);
    }

    // Security check: Only the owner, the assigned agent, or an admin can access/start this chat
    const isAdmin = await this.adminRepo.findOne({ where: { userId } });
    const isOwner = customDesign.userId === userId;
    const isAgent = customDesign.agentId && (await this.agentRepo.findOne({ where: { id: customDesign.agentId, userId } }));

    if (!isAdmin && !isOwner && !isAgent) {
      throw new BadRequestException('You do not have permission to access this chat');
    }

    // Create new conversation
    const conversation = this.conversationRepo.create({
      type: ConversationType.CUSTOMDESIGN,
      customdesignId: customdesignId,
    });
    const savedConversation = await this.conversationRepo.save(conversation);

    // Add members: the user who owns the design
    const members: ConversationMember[] = [];
    members.push(this.memberRepo.create({
      conversation: savedConversation,
      user: { id: customDesign.userId } as User,
    }));

    // If an agent is assigned, add them too
    if (customDesign.agentId) {
      // Find the agent's userId
      const agent = await this.agentRepo.findOne({ where: { id: customDesign.agentId } });
      if (agent && agent.userId) {
        members.push(this.memberRepo.create({
          conversation: savedConversation,
          user: { id: agent.userId } as User,
        }));
      }
    }

    await this.memberRepo.save(members);

    const conversationDetails = await this.getConversationDetails(savedConversation.id);
    
    // Notify participants
    this.chatGateway.emitNewConversation(conversationDetails);

    return conversationDetails;
  }

  /**
   * Retrieves a conversation by its custom design ID.
   */
  async getConversationByCustomDesignId(customdesignId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { 
        type: ConversationType.CUSTOMDESIGN,
        customdesignId: customdesignId 
      },
      relations: ['members', 'members.user', 'lastMessage'],
    });

    if (!conversation) {
      throw new NotFoundException(`No conversation found for custom design ID ${customdesignId}`);
    }

    return conversation;
  }

  /**
   * Sends a message in a conversation.
   */
  async sendMessage(
    conversationId: string,
    authorId: string,
    text: string = '',
    attachments: string[] = [],
  ): Promise<Message> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ['members', 'members.user'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify membership
    const isMember = conversation.members.some((m) => m.user.id === authorId);
    if (!isMember) {
      throw new BadRequestException('User is not a member of this conversation');
    }

    // Create message
    const message = this.messageRepo.create({
      conversation,
      author: { id: authorId } as User,
      text,
      attachments,
    });
    const savedMessage = await this.messageRepo.save(message);

    // Update conversation metadata
    conversation.lastMessage = savedMessage;
    conversation.lastMessageAt = savedMessage.createdAt;
    await this.conversationRepo.save(conversation);

    // Increment unread count for other members
    await this.memberRepo
      .createQueryBuilder()
      .update(ConversationMember)
      .set({ unreadCount: () => 'unreadCount + 1' })
      .where('conversationId = :cid', { cid: conversationId })
      .andWhere('userId != :uid', { uid: authorId })
      .execute();

    // Notify via WebSocket
    this.chatGateway.emitNewMessage(savedMessage, conversationId);

    // Notify via Persistent Notification (for Admin/Agent messages)
    const authorAdmin = await this.adminRepo.findOne({ where: { userId: authorId } });
    const authorAgent = await this.agentRepo.findOne({ where: { userId: authorId } });

    if (authorAdmin || authorAgent) {
      const otherMembers = conversation.members.filter((m) => m.user?.id !== authorId);
      for (const member of otherMembers) {
        if (!member.user) continue;
        await this.notificationService.createNotification(
          member.user.id,
          (authorAdmin ? NotificationType.ADMIN : NotificationType.AGENT_MESSAGE) as NotificationType,
          `New Message from ${authorAdmin ? 'Admin' : 'Agent'}`,
          (text || '').substring(0, 100) + ((text || '').length > 100 ? '...' : ''),
          { conversationId, messageId: savedMessage.id },
          (authorAdmin ? 'messagesAdmin' : 'messagesAgent') as keyof UserNotificationSetting,
        );
      }
    }

    // Log Activity for Custom Design Workspace
    if (conversation.type === ConversationType.CUSTOMDESIGN && conversation.customdesignId) {
      const authorType = authorAdmin ? 'Admin' : (authorAgent ? 'Agent' : 'Client');
      await this.workspaceService.logActivity(
        conversation.customdesignId,
        authorId,
        ActivityType.MESSAGE,
        `${authorType} sent a message`,
        `Message sent in project discussion.`,
      );
    }

    return savedMessage;
  }

  /**
   * Fetches the user's inbox (list of conversations).
   */
  async getInbox(userId: string, type?: ConversationType) {
    const where: any = { user: { id: userId } };
    if (type) {
      where.conversation = { type };
    }

    const memberships = await this.memberRepo.find({
      where,
      relations: [
        'conversation',
        'conversation.lastMessage',
        'conversation.members',
        'conversation.members.user',
      ],
      order: { conversation: { lastMessageAt: 'DESC' } },
    });

    return memberships.map((m) => {
      const conv = m.conversation;
      // Identify the other participant in a DM
      const otherParticipant = conv.members.find((member) => member.user.id !== userId)?.user;
      
      return {
        id: conv.id,
        type: conv.type,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: m.unreadCount,
        otherParticipant: otherParticipant ? {
          id: otherParticipant.id,
          firstName: otherParticipant.firstName,
          lastName: otherParticipant.lastName,
          profilePics: otherParticipant.profilePics,
        } : null,
      };
    });
  }

  /**
   * Fetches messages for a specific conversation.
   */
  async getMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationDto,
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Verify membership
    const member = await this.memberRepo.findOne({
      where: { conversation: { id: conversationId }, user: { id: userId } },
    });
    if (!member) {
      throw new BadRequestException('User is not a member of this conversation');
    }

    const [data, total] = await this.messageRepo.findAndCount({
      where: { conversation: { id: conversationId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: skip,
      relations: ['author'],
    });

    return {
      data: data.reverse(), // Return in chronological order
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marks all messages in a conversation as read for a specific user.
   */
  async markAsRead(conversationId: string, userId: string) {
    await this.memberRepo.update(
      { conversation: { id: conversationId }, user: { id: userId } },
      { unreadCount: 0 },
    );

    // Notify user's other devices about updated unread count
    this.chatGateway.emitUnreadCount(userId);

    return { success: true };
  }

  async getConversationDetails(id: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({
      where: { id },
      relations: ['members', 'members.user', 'lastMessage'],
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }
}
