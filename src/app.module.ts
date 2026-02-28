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
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: false,
        },
        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
        // entities: [join(process.cwd(), 'src/**/*.entity.{ts,js}')],
        entities: [join(process.cwd(), 'dist/**/*.entity.js')],
        synchronize: false, // ⚠️ change this
      }),
      // useFactory: (configService: ConfigService) => ({
      //   type: 'postgres',
      //   host: configService.get('DB_HOST'),
      //   port: +configService.get('DB_PORT'),
      //   username: configService.get('DB_USERNAME'),
      //   password: configService.get('DB_PASSWORD'),
      //   database: configService.get('DB_NAME'),
      //   ssl:
      //     configService.get('DB_SSL') === 'true'
      //       ? { rejectUnauthorized: false }
      //       : undefined,
      //   entities: [join(process.cwd(), 'dist/**/*.entity.js')],

      //   synchronize: true,
      // }),
    }),
    UserModule,
    AgentModule,
    AdminModule,
    MarketproductModule,
    // RolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
