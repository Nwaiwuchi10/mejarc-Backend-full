import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Conversation, ConversationType } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { User } from '../user/entities/user.entity';
import { PaginationDto } from '../utils/pagination.dto';

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

    return this.getConversationDetails(savedConversation.id);
  }

  /**
   * Sends a message in a conversation.
   */
  async sendMessage(
    conversationId: string,
    authorId: string,
    text: string,
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

    return savedMessage;
  }

  /**
   * Fetches the user's inbox (list of conversations).
   */
  async getInbox(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { user: { id: userId } },
      relations: ['conversation', 'conversation.lastMessage', 'conversation.members', 'conversation.members.user'],
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
    return { success: true };
  }

  private async getConversationDetails(id: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({
      where: { id },
      relations: ['members', 'members.user', 'lastMessage'],
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }
}
