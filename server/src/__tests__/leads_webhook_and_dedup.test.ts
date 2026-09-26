import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Lead } from '../models/Lead';
import { Brokerage } from '../models/Brokerage';
import { Express } from 'express';

describe('Lead Webhook Ingestion, Idempotency & Duplicate Detection', () => {
  let app: Express;
  let brokerageA: any;
  let brokerageB: any;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    await Promise.all([Brokerage.deleteMany({}), Lead.deleteMany({})]);

    brokerageA = await Brokerage.create({
      name: 'Brokerage Alpha',
      slug: 'brokerage-webhook-alpha',
      apiKey: 'lf_webhook_alpha_key',
    });

    brokerageB = await Brokerage.create({
      name: 'Brokerage Beta',
      slug: 'brokerage-webhook-beta',
      apiKey: 'lf_webhook_beta_key',
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('rejects unauthenticated webhook requests', async () => {
    const res = await request(app).post('/api/webhooks/leads').send({
      externalId: 'EXT-101',
      name: 'Max Mustermann',
      email: 'max@test.de',
      phone: '+491701112233',
      source: 'ImmoScout',
    });
    expect(res.status).toBe(401);
  });

  it('ingests valid lead through authenticated webhook', async () => {
    const res = await request(app)
      .post('/api/webhooks/leads')
      .set('x-api-key', brokerageA.apiKey)
      .send({
        externalId: 'EXT-101',
        name: 'Max Mustermann',
        email: '  MAX@Test.DE ',
        phone: '0170 / 111-2233', // German domestic format
        source: 'ImmoScout24',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.deduplicated).toBe(false);
    expect(res.body.data.email).toBe('max@test.de'); // Normalized
    expect(res.body.data.phone).toBe('+491701112233'); // Normalized
    expect(res.body.data.stage).toBe('NEW');
  });

  it('idempotently handles duplicate webhook with identical externalId (brokerageId + externalId)', async () => {
    // Send the exact same externalId again
    const res = await request(app)
      .post('/api/webhooks/leads')
      .set('x-api-key', brokerageA.apiKey)
      .send({
        externalId: 'EXT-101',
        name: 'Max Mustermann (Updated payload)',
        email: 'max@test.de',
        phone: '+491701112233',
        source: 'ImmoScout24',
      });

    expect(res.status).toBe(200);
    expect(res.body.deduplicated).toBe(true);

    // Verify database contains only 1 lead for Brokerage A
    const count = await Lead.countDocuments({ brokerageId: brokerageA._id, externalId: 'EXT-101' });
    expect(count).toBe(1);
  });

  it('allows same externalId in a different brokerage (tenant isolation)', async () => {
    const res = await request(app)
      .post('/api/webhooks/leads')
      .set('x-api-key', brokerageB.apiKey)
      .send({
        externalId: 'EXT-101', // Same externalId as Brokerage A
        name: 'Anna Schmidt',
        email: 'anna@munich.de',
        phone: '+4989123456',
        source: 'Check24',
      });

    expect(res.status).toBe(201);
    expect(res.body.deduplicated).toBe(false);
    expect(res.body.data.brokerageId).toBe(brokerageB._id.toString());
  });

  it('detects existing person when different externalId has matching normalized email or phone', async () => {
    const res = await request(app)
      .post('/api/webhooks/leads')
      .set('x-api-key', brokerageA.apiKey)
      .send({
        externalId: 'EXT-102', // Different externalId
        name: 'Maximilian Mustermann',
        email: 'max@test.de', // Same normalized email as EXT-101
        phone: '0151 / 9988776',
        source: 'Referral',
      });

    expect(res.status).toBe(201);
    expect(res.body.duplicatePersonDetected).toBe(true);
    expect(res.body.data.metadata.duplicatePersonDetected).toBe(true);
  });
});
