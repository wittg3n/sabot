'use strict';

const { createClient } = require('redis');

class RedisSessionStore {
  constructor(client, { ttlSeconds = 60 * 60 } = {}) {
    this.client = client;
    this.ttlSeconds = ttlSeconds;
  }

  key(name) {
    return `session:${name}`;
  }

  async get(name) {
    const raw = await this.client.get(this.key(name));
    return raw ? JSON.parse(raw) : undefined;
  }

  async set(name, value) {
    if (value === undefined) {
      return;
    }

    await this.client.set(this.key(name), JSON.stringify(value), {
      EX: this.ttlSeconds,
    });
  }

  async delete(name) {
    await this.client.del(this.key(name));
  }
}

async function createRedisClient(redisUrl) {
  const client = createClient({ url: redisUrl });

  client.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  await client.connect();
  return client;
}

module.exports = {
  createRedisClient,
  RedisSessionStore,
};
