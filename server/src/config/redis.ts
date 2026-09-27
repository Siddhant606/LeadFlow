import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

let sharedRedisClient: Redis | null = null;
let memoryServerInstance: any = null;
let cachedRedisOptions: RedisOptions | null = null;

export function cleanRedisUrl(input: string): string {
  if (!input) return 'redis://127.0.0.1:6379';
  let str = input.trim();
  // Strip CLI prefix if user pasted "redis-cli --tls -u redis://..."
  const urlMatch = str.match(/(rediss?:\/\/[^\s'"]+)/i);
  if (urlMatch) {
    str = urlMatch[1];
  }
  // If --tls was present or it's an Upstash host, ensure rediss:// is used
  if ((input.includes('--tls') || str.includes('upstash.io')) && str.startsWith('redis://')) {
    str = str.replace(/^redis:\/\//, 'rediss://');
  }
  return str;
}

export function parseRedisOptions(rawUrl: string): RedisOptions {
  const cleaned = cleanRedisUrl(rawUrl);
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    parsed = new URL('redis://127.0.0.1:6379');
  }

  const isTls = parsed.protocol === 'rediss:' || cleaned.includes('upstash.io');
  const port = parseInt(parsed.port || '6379', 10);
  const host = parsed.hostname || '127.0.0.1';
  const username = parsed.username ? decodeURIComponent(parsed.username) : undefined;
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined;

  const opts: RedisOptions = {
    host,
    port,
    username: username || undefined,
    password: password || undefined,
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 500, 3000),
  };

  if (isTls) {
    opts.tls = {
      rejectUnauthorized: false,
    };
  }

  return opts;
}

export async function initRedis(): Promise<RedisOptions> {
  if (cachedRedisOptions) {
    return cachedRedisOptions;
  }

  const options = parseRedisOptions(config.redisUrl);

  // Test external connection
  const testClient = new Redis({
    ...options,
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy: () => null, // don't loop during test
  });

  try {
    await testClient.connect();
    await testClient.ping();
    await testClient.quit();

    cachedRedisOptions = options;
    logger.info(`Connected to external Redis at ${options.host}:${options.port}`);
    return cachedRedisOptions;
  } catch (err: any) {
    logger.warn(`External Redis not responding at ${options.host}:${options.port} (${err.message}).`);

    // In local dev/test, fallback to in-memory Redis if available
    try {
      const { RedisMemoryServer } = await import('redis-memory-server');
      memoryServerInstance = new RedisMemoryServer();
      const host = await memoryServerInstance.getHost();
      const port = await memoryServerInstance.getPort();

      cachedRedisOptions = {
        host,
        port,
        maxRetriesPerRequest: null,
      };
      logger.info(`RedisMemoryServer started successfully on ${host}:${port}`);
      return cachedRedisOptions;
    } catch {
      // In production (Render), return the parsed options without crashing
      logger.warn('Proceeding with configured Redis parameters in background mode.');
      cachedRedisOptions = options;
      return cachedRedisOptions;
    }
  }
}

export async function getRedisConnectionConfig(): Promise<RedisOptions> {
  if (!cachedRedisOptions) {
    return initRedis();
  }
  return cachedRedisOptions;
}

export async function getRedisClient(): Promise<Redis> {
  if (!sharedRedisClient) {
    const redisOptions = await getRedisConnectionConfig();
    sharedRedisClient = new Redis(redisOptions);
    sharedRedisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err.message);
    });
  }
  return sharedRedisClient;
}

export async function closeRedis(): Promise<void> {
  if (sharedRedisClient) {
    try {
      await sharedRedisClient.quit();
    } catch {
      // Ignore disconnect errors
    }
    sharedRedisClient = null;
  }
  if (memoryServerInstance) {
    try {
      await memoryServerInstance.stop();
    } catch {
      // Ignore stop errors
    }
    memoryServerInstance = null;
  }
  cachedRedisOptions = null;
  logger.info('Redis connections closed');
}
