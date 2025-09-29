import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';
import * as path from 'path';
import * as express from 'express';

config();
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // tu frontend Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // si envías cookies
  });

  // Middleware que loguea cada request
  app.use((req, res, next) => {
    Logger.log(`${req.method} ${req.url}`, 'HTTP');
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));


  await app.listen(3001);
  console.log("Server raised on port 3001");
}
bootstrap();
