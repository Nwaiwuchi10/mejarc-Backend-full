import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat.service';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Message } from '../entities/message.entity';
import { Conversation } from '../entities/conversation.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Join a private room for this user
      client.join(`user:${userId}`);
      this.logger.log(`User connected: ${userId} (Socket: ${client.id})`);
      
      // Optionally send initial unread count
      const inbox = await this.chatService.getInbox(userId);
      const totalUnread = inbox.reduce((sum, item) => sum + item.unreadCount, 0);
      client.emit('chat:unreadCount', { total: totalUnread });

    } catch (e) {
      this.logger.error(`Connection error: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; text: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;

    try {
      // The service will automatically trigger emitNewMessage
      await this.chatService.sendMessage(
        data.conversationId,
        userId,
        data.text,
      );
    } catch (e) {
      client.emit('error', { message: e.message });
    }
  }

  // === Helper methods for Service-to-Gateway communication ===

  /**
   * Emits a new message to all participants in a conversation.
   * Also updates their unread counts.
   */
  async emitNewMessage(message: Message, conversationId: string) {
    const conversation = await this.chatService.getConversationDetails(
      conversationId,
    );

    const payload = {
      id: message.id,
      conversationId: conversationId,
      authorId: message.author.id,
      text: message.text,
      attachments: message.attachments,
      createdAt: message.createdAt,
    };

    for (const member of conversation.members) {
      this.server.to(`user:${member.user.id}`).emit('message:new', payload);

      // Notify others about unread count increase
      if (member.user.id !== message.author.id) {
        await this.emitUnreadCount(member.user.id);
      }
    }
  }

  /**
   * Emits the current unread count to a specific user.
   */
  async emitUnreadCount(userId: string) {
    const inbox = await this.chatService.getInbox(userId);
    const totalUnread = inbox.reduce((sum, item) => sum + item.unreadCount, 0);
    this.server.to(`user:${userId}`).emit('chat:unreadCount', {
      total: totalUnread,
    });
  }

  /**
   * Notifies participants about a new conversation or DM.
   */
  async emitNewConversation(conversation: Conversation) {
    for (const member of conversation.members) {
      this.server.to(`user:${member.user.id}`).emit('conversation:new', {
        id: conversation.id,
        type: conversation.type,
        members: conversation.members.map((m) => ({
          userId: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          profilePics: m.user.profilePics,
        })),
        createdAt: conversation.createdAt,
      });
    }
  }

  @SubscribeMessage('chat:markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;

    try {
      await this.chatService.markAsRead(data.conversationId, userId);
      
      const inbox = await this.chatService.getInbox(userId);
      const totalUnread = inbox.reduce((sum, item) => sum + item.unreadCount, 0);
      client.emit('chat:unreadCount', { total: totalUnread });
      
    } catch (e) {
      this.logger.error(`Mark as read error: ${e.message}`);
    }
  }

  private extractToken(client: Socket): string | undefined {
    // Check handshake auth or headers
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) return undefined;
    return auth.startsWith('Bearer ') ? auth.split(' ')[1] : auth;
  }

  private getUserId(client: Socket): string | undefined {
    try {
      const token = this.extractToken(client);
      if (!token) return undefined;
      const payload = this.jwtService.verify(token);
      return payload.userId;
    } catch {
      return undefined;
    }
  }
}
