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

  // Railway (and most PaaS hosts) terminate TLS at an edge proxy and forward
  // plain HTTP internally. Without trusting that proxy, Express's req.secure
  // is always false, and express-session silently refuses to set a `secure`
  // cookie — logins appear to succeed (200 + user data) but no session
  // persists. See: https://expressjs.com/en/guide/behind-proxies.html
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

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
        // In production the frontend (Vercel) and API (Railway) are different
        // domains, so the session cookie is cross-site and needs SameSite=None
        // (which browsers only honor alongside Secure) — in dev they share an
        // origin via the Vite proxy, where Lax is simpler and doesn't need HTTPS.
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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
