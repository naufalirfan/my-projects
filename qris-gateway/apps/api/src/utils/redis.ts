import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client: Redis | null = null;

try {
  client = new Redis(REDIS_URL, { lazyConnect: true });
  client.on("error", () => {
    // Redis optional in dev mode
  });
} catch {
  client = null;
}

export function getRedis(): Redis | null {
  return client;
}

export default client as Redis | null;
