import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Brokerage } from '../models/Brokerage';
import { hashPassword } from '../utils/password';
import { Express } from 'express';

describe('Authentication & RBAC & Cross-Tenant Rejection', () => {
  let app: Express;
  let brokerageAId: string;
  let brokerageBId: string;
  let advisorAToken: string;
  let clientAToken: string;
  let advisorBToken: string;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    // Clean test db
    await Promise.all([Brokerage.deleteMany({}), User.deleteMany({})]);

    const pw = await hashPassword('secret123');

    // Setup Brokerage A
    const bA = await Brokerage.create({
      name: 'Brokerage Alpha',
      slug: 'brokerage-auth-alpha',
      apiKey: 'key_alpha_auth_123',
    });
    brokerageAId = bA._id.toString();

    const advA = await User.create({
      brokerageId: bA._id,
      name: 'Advisor Alpha',
      email: 'advisor@alpha.de',
      passwordHash: pw,
      role: 'ADVISOR',
    });

    const cliA = await User.create({
      brokerageId: bA._id,
      name: 'Client Alpha',
      email: 'client@alpha.de',
      passwordHash: pw,
      role: 'CLIENT',
    });

    // Setup Brokerage B
    const bB = await Brokerage.create({
      name: 'Brokerage Beta',
      slug: 'brokerage-auth-beta',
      apiKey: 'key_beta_auth_456',
    });
    brokerageBId = bB._id.toString();

    const advB = await User.create({
      brokerageId: bB._id,
      name: 'Advisor Beta',
      email: 'advisor@beta.de',
      passwordHash: pw,
      role: 'ADVISOR',
    });

    // Obtain tokens
    const resAdvA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advisor@alpha.de', password: 'secret123' });
    advisorAToken = resAdvA.body.data.token;

    const resCliA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@alpha.de', password: 'secret123' });
    clientAToken = resCliA.body.data.token;

    const resAdvB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advisor@beta.de', password: 'secret123' });
    advisorBToken = resAdvB.body.data.token;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advisor@alpha.de', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('authenticates valid credentials and returns JWT with user info', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advisor@alpha.de', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADVISOR');
    expect(res.body.data.user.brokerageId).toBe(brokerageAId);
  });

  it('rejects access to protected routes without a token', async () => {
    const res = await request(app).get('/api/leads');
    expect(res.status).toBe(401);
  });

  it('enforces RBAC: rejects CLIENT role from accessing Advisor Lead Pipeline', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/lacks required permissions/i);
  });

  it('rejects cross-tenant access tampering: Advisor A trying to query Brokerage B', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${advisorAToken}`)
      .set('x-brokerage-id', brokerageBId); // Attempting IDOR header switch!

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/cross-tenant/i);
  });
});
