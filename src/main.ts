import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  // Increase payload size
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Explicit CORS setup
  app.enableCors({
    origin: [
      'https://mejarc.onrender.com',
      'https://admin-app-mv4j.onrender.com',
      'https://mejarc-admin-portal.vercel.app',
      'http://10.161.5.213:3000',
      'http://localhost:3000', // frontend dev server
      'http://localhost:3001',
      'http://10.161.5.213:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ==========================================
  // SWAGGER (OPENAPI) CONFIGURATION
  // ==========================================
  const config = new DocumentBuilder()
    .setTitle('Mejarc API')
    .setDescription(
      'Comprehensive REST API documentation for Mejarc Backend services, including Authentication, User Management, Agent Management, Marketplace, Custom Design Wizard, Orders, Payments, Wallet & Withdrawals, Notifications, and Real-Time Chat.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your Bearer token in format: Bearer <token>',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health / App', 'Root application and health check endpoints')
    .addTag('User', 'User registration, authentication, profiles, and settings')
    .addTag(
      'Agent',
      'Agent onboarding, KYC verification, profile, and analytics',
    )
    .addTag(
      'Admin',
      'Admin authentication, users, moderation, approvals, roles, and financials',
    )
    .addTag(
      'Order',
      'Order management, Paystack checkout, payments, and tracking',
    )
    .addTag(
      'Marketplace Product',
      'Listing, searching, and managing marketplace architecture and design products',
    )
    .addTag(
      'Custom Design',
      '6-step custom architectural design wizard, pricing, and project submissions',
    )
    .addTag(
      'Custom Design Workspace',
      'Custom design project workspace, milestones, files, and activity logs',
    )
    .addTag(
      'Wallet',
      'Wallet balances, bank accounts, withdrawals, and transactions',
    )
    .addTag('Notification', 'User and agent in-app notification center')
    .addTag(
      'Chat',
      'Direct messaging, custom design conversations, and attachments',
    )
    .addTag('Contact', 'Contact inquiries and customer support messages')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Serve Swagger UI at multiple friendly paths: /docs, /swagger, /api/docs
  const swaggerCustomOptions = {
    customSiteTitle: 'Mejarc API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  };

  SwaggerModule.setup('docs', app, document, swaggerCustomOptions);
  SwaggerModule.setup('swagger', app, document, swaggerCustomOptions);
  SwaggerModule.setup('api/docs', app, document, swaggerCustomOptions);
  SwaggerModule.setup('api', app, document, swaggerCustomOptions);

  // Expose Swagger JSON directly via endpoints (/swagger.json, /docs.json, /api/docs.json, /api-json)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/swagger.json', (req: any, res: any) => {
    res.json(document);
  });
  httpAdapter.get('/docs.json', (req: any, res: any) => {
    res.json(document);
  });
  httpAdapter.get('/api/docs.json', (req: any, res: any) => {
    res.json(document);
  });
  httpAdapter.get('/api-json', (req: any, res: any) => {
    res.json(document);
  });
  httpAdapter.get('/docs-json', (req: any, res: any) => {
    res.json(document);
  });

  // Write swagger.json file to disk
  try {
    const swaggerJsonPath = path.join(process.cwd(), 'swagger.json');
    fs.writeFileSync(
      swaggerJsonPath,
      JSON.stringify(document, null, 2),
      'utf8',
    );
  } catch (err) {
    console.warn('Could not write swagger.json file to disk:', err);
  }

  const port = process.env.PORT ?? 4500;
  await app.listen(port);
  console.log(`🚀 Application is running on port ${port}`);
  console.log(`📖 Swagger UI available at: http://localhost:${port}/docs`);
  console.log(
    `📄 Swagger JSON available at: http://localhost:${port}/swagger.json`,
  );
}
bootstrap();
