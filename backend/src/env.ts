import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  MONGO_URI: required("MONGO_URI", "mongodb://localhost:27017/vedaai"),
  REDIS_URL: process.env.REDIS_URL || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  REDIS_TLS: process.env.REDIS_TLS === "true",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  JWT_SECRET: process.env.JWT_SECRET || "dev-only-secret-change-me",
  COOKIE_NAME: process.env.COOKIE_NAME || "vedaai_session",
};
