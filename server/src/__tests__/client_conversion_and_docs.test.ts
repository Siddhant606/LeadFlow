import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Lead } from '../models/Lead';
import { Brokerage } from '../models/Brokerage';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { DocumentModel } from '../models/Document';
import { hashPassword } from '../utils/password';
import { Express } from 'express';
import { createDocumentWorker } from '../workers/document.worker';
import { closeRedis } from '../config/redis';

describe('Client Conversion, Document Upload & Async Processing', () => {
  let app: Express;
  let brokerageA: any;
  let brokerageB: any;
  let advisorAToken: string;
  let leadToConvert: any;
  let convertedClientId: string;
  let clientToken: string;
  let testFilePath: string;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    // Start background document worker for async test
    createDocumentWorker();

    await Promise.all([
      Brokerage.deleteMany({}),
      User.deleteMany({}),
      Lead.deleteMany({}),
      Client.deleteMany({}),
      DocumentModel.deleteMany({}),
    ]);

    const pw = await hashPassword('password123');

    brokerageA = await Brokerage.create({
      name: 'Brokerage Alpha',
      slug: 'brokerage-client-alpha',
      apiKey: 'key_alpha_doc',
    });

    brokerageB = await Brokerage.create({
      name: 'Brokerage Beta',
      slug: 'brokerage-client-beta',
      apiKey: 'key_beta_doc',
    });

    const advisorA = await User.create({
      brokerageId: brokerageA._id,
      name: 'Advisor Alpha',
      email: 'advisor.alpha@leadflow.de',
      passwordHash: pw,
      role: 'ADVISOR',
    });

    const resAdv = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advisor.alpha@leadflow.de', password: 'password123' });
    advisorAToken = resAdv.body.data.token;

    leadToConvert = await Lead.create({
      brokerageId: brokerageA._id,
      name: 'Klara Becker',
      email: 'klara.becker@outlook.de',
      phone: '+491708877665',
      source: 'Direct Portal',
      stage: 'QUALIFIED',
      assignedAdvisorId: advisorA._id,
    });

    // Create a temporary dummy file for upload testing
    testFilePath = path.join(__dirname, 'test_salary_slip.pdf');
    fs.writeFileSync(testFilePath, 'DUMMY PDF CONTENT FOR MORTGAGE SALARY STATEMENT');
  });

  afterAll(async () => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    await disconnectDatabase();
    await closeRedis();
  });

  it('converts lead to client and provisions CLIENT user account', async () => {
    const res = await request(app)
      .post(`/api/clients/convert/${leadToConvert._id}`)
      .set('Authorization', `Bearer ${advisorAToken}`)
      .send({ password: 'ClientPassword2025!', notes: 'Converted for mortgage application' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.client).toBeDefined();
    expect(res.body.data.user.email).toBe('klara.becker@outlook.de');
    expect(res.body.data.user.role).toBe('CLIENT');

    convertedClientId = res.body.data.client._id;

    // Verify lead now references client
    const updatedLead = await Lead.findById(leadToConvert._id);
    expect(updatedLead?.clientId?.toString()).toBe(convertedClientId);
  });

  it('prevents duplicate conversion of the same lead', async () => {
    const res = await request(app)
      .post(`/api/clients/convert/${leadToConvert._id}`)
      .set('Authorization', `Bearer ${advisorAToken}`)
      .send({});

    expect(res.status).toBe(409); // Conflict
    expect(res.body.error.message).toMatch(/already been converted/i);
  });

  it('allows newly created CLIENT to log in and view their case', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'klara.becker@outlook.de', password: 'ClientPassword2025!' });

    expect(loginRes.status).toBe(200);
    clientToken = loginRes.body.data.token;
    expect(loginRes.body.data.user.role).toBe('CLIENT');

    // Access self-service client profile
    const profileRes = await request(app)
      .get('/api/clients/me')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data._id).toBe(convertedClientId);
  });

  it('uploads document with fast return and queues async verification', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('file', testFilePath, 'salary_slip_2025.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Fast return check: initial status must be UPLOADED
    expect(res.body.data.status).toBe('UPLOADED');
    expect(res.body.data.originalName).toBe('salary_slip_2025.pdf');

    const docId = res.body.data._id;

    // Wait for the background BullMQ worker to process the simulated slow verification
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const processedDoc = await DocumentModel.findById(docId);
    expect(processedDoc?.status).toBe('PASSED');
    expect(processedDoc?.verificationDetails?.ocrPassed).toBe(true);
  });

  it('simulates document verification failure when file indicates error condition', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('file', testFilePath, 'fail_illegible_notary_document.pdf');

    expect(res.status).toBe(201);
    const docId = res.body.data._id;

    // Wait for worker processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const failedDoc = await DocumentModel.findById(docId);
    expect(failedDoc?.status).toBe('FAILED');
    expect(failedDoc?.failureReason).toBeDefined();
  });
});
