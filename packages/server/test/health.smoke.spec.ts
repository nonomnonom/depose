import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppController } from '../src/app.controller.js';
import { DATABASE } from '../src/infrastructure/database/database.module.js';
import { RedisService } from '../src/infrastructure/redis/redis.service.js';

describe('GET /api/health', () => {
  let app: INestApplication;
  let baseUrl: string;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: DATABASE, useValue: { execute: async () => undefined } },
        {
          provide: RedisService,
          useValue: { ping: async () => true },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  after(async () => {
    await app.close();
  });

  it('returns ok without a session', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('reports readiness without a session', async () => {
    const response = await fetch(`${baseUrl}/api/health/ready`);

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'ok');
    assert.deepEqual(body.checks, { database: 'ok', redis: 'ok' });
  });
});
