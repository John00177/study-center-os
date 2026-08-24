import "reflect-metadata";
import { join } from "path";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import session from "express-session";
import passport from "passport";
import RedisStore from "connect-redis";
import Redis from "ioredis";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  const redisStore = new RedisStore({ client: redisClient, prefix: "crm-os:sess:" });

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });

  // Uploaded org logos (organizations.controller.ts POST /organizations/me/logo)
  // are stored on disk under <cwd>/uploads and served back at this path —
  // no auth needed to view a logo, since login pages show it before login.
  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  app.use(
    session({
      store: redisStore,
      name: process.env.SESSION_COOKIE_NAME ?? "crm.sid",
      secret: process.env.SESSION_SECRET ?? "change-me-to-a-long-random-string",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: Number(process.env.SESSION_MAX_AGE_MS ?? 7 * 24 * 60 * 60 * 1000),
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix("api");

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
