import IORedis, { RedisOptions } from "ioredis";
import { env } from "./env";

// Support both a full REDIS_URL (Upstash, Heroku, etc.) and host/port pairs (local).
function buildConnection(): IORedis {
  if (env.REDIS_URL) {
    return new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  const opts: RedisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
  };
  if (env.REDIS_PASSWORD) opts.password = env.REDIS_PASSWORD;
  if (env.REDIS_TLS) opts.tls = {};
  return new IORedis(opts);
}

export const redisConnection = buildConnection();

redisConnection.on("connect", () => console.log("[redis] connected"));
redisConnection.on("error", (e) => console.error("[redis] error", e.message));
