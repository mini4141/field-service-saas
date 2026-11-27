export const config = {
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  hmacSecret: process.env.INTERNAL_HMAC_SECRET ?? "dev-only-hmac",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};

export function redisConnection() {
  const u = new URL(config.redisUrl);
  return { host: u.hostname, port: Number(u.port || 6379), password: u.password || undefined, maxRetriesPerRequest: null as null };
}
