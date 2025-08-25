import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';

import { AppModule } from './app.module';
import { JsonLoggerInterceptor } from './common/interceptors/json-logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const fastify = app.getHttpAdapter().getInstance();

  await fastify.register(fastifyHelmet as any, { contentSecurityPolicy: false });
  await fastify.register(fastifyCompress as any);
  await fastify.register(fastifyCookie as any, { hook: 'onRequest' });

  const origins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
  interface CorsOriginCallback {
    (error: Error | null, allow: boolean): void;
  }

  interface CorsOriginHandler {
    (origin: string | undefined, cb: CorsOriginCallback): void;
  }

  interface CorsOptions {
    origin: CorsOriginHandler;
    credentials: boolean;
  }

  await fastify.register(
    fastifyCors as any,
    {
      origin: (origin: string | undefined, cb: CorsOriginCallback) => {
        if (!origin || origins.length === 0 || origins.includes(origin)) cb(null, true);
        else cb(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    } as CorsOptions,
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new JsonLoggerInterceptor());

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 HTTP listening on http://localhost:${port}`);
}
bootstrap();
