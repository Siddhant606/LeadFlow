import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

let sharedRedisClient: Redis | null = null;
let memoryServerInstance: any = null;
let resolvedPort: number | null = null;
let resolvedHost: string | null = null;

export async function initRedis(): Promise<{ host: string; port: number }> {
  if (resolvedHost && resolvedPort) {
    return { host: resolvedHost, port: resolvedPort };
  }

  // Parse default REDIS_URL
  const parsed = new URL(config.redisUrl);
  const defaultHost = parsed.hostname || '127.0.0.1';
  const defaultPort = parseInt(parsed.port || '6379', 10);

  // Attempt connection to configured Redis
  const testClient = new Redis({
    host: defaultHost,
    port: defaultPort,
    lazyConnect: true,
    connectTimeout: 2000,
    retryStrategy: () => null, // don't loop on failure
  });

  try {
    await testClient.connect();
    await testClient.ping();
    await testClient.quit();

    resolvedHost = defaultHost;
    resolvedPort = defaultPort;
    logger.info(`Connected to external Redis at ${resolvedHost}:${resolvedPort}`);
    return { host: resolvedHost, port: resolvedPort };
  } catch {
    // External Redis not responding, fallback to in-memory Redis for dev & testing!
    logger.warn(`External Redis not accessible at ${defaultHost}:${defaultPort}. Starting embedded RedisMemoryServer...`);
    try {
      const { RedisMemoryServer } = await import('redis-memory-server');
      memoryServerInstance = new RedisMemoryServer();
      const host = await memoryServerInstance.getHost();
      const port = await memoryServerInstance.getPort();

      resolvedHost = host;
      resolvedPort = port;
      logger.info(`RedisMemoryServer started successfully on ${host}:${port}`);
      return { host, port };
    } catch (memErr) {
      logger.error('Failed to start RedisMemoryServer fallback', memErr);
      // Fallback to configured params as last resort
      resolvedHost = defaultHost;
      resolvedPort = defaultPort;
      return { host: defaultHost, port: defaultPort };
    }
  }
}

export async function getRedisConnectionConfig(): Promise<RedisOptions> {
  const { host, port } = await initRedis();
  return {
    host,
    port,
    maxRetriesPerRequest: null, // Required by BullMQ
  };
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
    await sharedRedisClient.quit();
    sharedRedisClient = null;
  }
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
  resolvedHost = null;
  resolvedPort = null;
  logger.info('Redis connections closed');
}
