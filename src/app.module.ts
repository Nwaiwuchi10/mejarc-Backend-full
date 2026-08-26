import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const dbHost = configService.get<string>('DB_HOST');
        const dbPort = Number(configService.get<number>('DB_PORT') || 5432);
        const dbUsername = configService.get<string>('DB_USERNAME');
        const dbPassword =
          configService.get<string>('DB_PASSWORD') ||
          configService.get<string>('DB_PAASWORD');
        const dbName = configService.get<string>('DB_NAME');
        const dbSsl = configService.get<string>('DB_SSL');

        const isRemote =
          dbSsl === 'true' ||
          (dbHost && dbHost !== 'localhost' && dbHost !== '127.0.0.1') ||
          Boolean(databaseUrl);

        const sslConfig = isRemote ? { rejectUnauthorized: false } : undefined;

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: sslConfig,
            extra: {
              ssl: sslConfig,
            },
            autoLoadEntities: true,
            entities: [join(__dirname, '**/*.entity{.ts,.js}')],
            synchronize: true,
          };
        }

        return {
          type: 'postgres',
          host: dbHost || 'localhost',
          port: dbPort,
          username: dbUsername || 'postgres',
          password: dbPassword || '',
          database: dbName || 'mejarc',
          ssl: sslConfig,
          extra: {
            ssl: sslConfig,
          },
          autoLoadEntities: true,
          entities: [join(__dirname, '**/*.entity{.ts,.js}')],
          synchronize: true,
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
    ChatModule, // RolesModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
