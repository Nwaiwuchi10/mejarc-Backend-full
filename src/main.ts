import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';

// import { AllExceptionsFilter } from './common/filters/http-exception.filter';
// import { ValidationPipe } from '@nestjs/common';

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
      'http://10.161.5.213:3000',
      'http://localhost:3000', // frontend dev server
      'http://localhost:3001',
      'http://10.161.5.213:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // app.useGlobalFilters(new AllExceptionsFilter());
  // app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 4500);
}
bootstrap();
