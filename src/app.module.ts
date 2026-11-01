import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import './database/schemas';
import { UserModule } from './user/user.module';
import { AgentModule } from './agent/agent.module';
import { AdminModule } from './admin/admin.module';
import { MarketproductModule } from './marketproduct/marketproduct.module';
import { OrderModule } from './order/order.module';
import { WalletModule } from './wallet/wallet.module';
import { CustomDesignModule } from './customdesign/customdesign.module';
import { NotificationModule } from './notification/notification.module';
import { ChatModule } from './chat/chat.module';
import { ContactModule } from './contact/contact.module';
import config from './config/config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [config],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config) => ({
        secret: config.get('jwt.secret'),
      }),
      global: true,
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri =
          configService.get<string>('MONGO_URI') ||
          configService.get<string>('MONGODB_URI') ||
          process.env.MONGO_URI ||
          process.env.MONGODB_URI ||
          'mongodb://localhost:27017/mejarc';

        return {
          uri,
        };
      },
    }),
    UserModule,
    AgentModule,
    AdminModule,
    MarketproductModule,
    OrderModule,
    WalletModule,
    CustomDesignModule,
    NotificationModule,
    ChatModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
