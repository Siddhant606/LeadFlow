import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Lead } from '../models/Lead';
import { Brokerage } from '../models/Brokerage';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { PipelineService } from '../services/pipeline.service';
import { hashPassword } from '../utils/password';
import { Express } from 'express';

describe('Pipeline Transitions, Automations & Concurrency', () => {
  let app: Express;
  let brokerageA: any;
  let brokerageB: any;
  let advisorAToken: string;
  let advisorBToken: string;
  let testLeadA: any;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    await Promise.all([
      Brokerage.deleteMany({}),
      User.deleteMany({}),
      Lead.deleteMany({}),
      Task.deleteMany({}),
    ]);

    const pw = await hashPassword('pass123');

    brokerageA = await Brokerage.create({
      name: 'Brokerage A',
      slug: 'brokerage-a',
      apiKey: 'key_a',
    });
    await PipelineService.seedBrokerageDefaults(brokerageA._id);

    const advA = await User.create({
      brokerageId: brokerageA._id,
      name: 'Advisor A',
      email: 'advisora@flow.de',
      passwordHash: pw,
      role: 'ADVISOR',
    });

    brokerageB = await Brokerage.create({
      name: 'Brokerage B',
      slug: 'brokerage-b',
      apiKey: 'key_b',
    });
    await PipelineService.seedBrokerageDefaults(brokerageB._id);

    const advB = await User.create({
      brokerageId: brokerageB._id,
      name: 'Advisor B',
      email: 'advisorb@flow.de',
      passwordHash: pw,
      role: 'ADVISOR',
    });

    const resA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advisora@flow.de', password: 'pass123' });
    advisorAToken = resA.body.data.token;

    const resB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advisorb@flow.de', password: 'pass123' });
    advisorBToken = resB.body.data.token;

    testLeadA = await Lead.create({
      brokerageId: brokerageA._id,
      name: 'Pipeline Test Lead',
      email: 'lead@berlin.de',
      phone: '+49170123987',
      source: 'Test',
      stage: 'NEW',
      assignedAdvisorId: advA._id,
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('updates lead stage and triggers configured tasks', async () => {
    // Stage CONTACTED has task: 'Send mortgage inquiry questionnaire'
    const res = await request(app)
      .patch(`/api/leads/${testLeadA._id}/stage`)
      .set('Authorization', `Bearer ${advisorAToken}`)
      .send({ stage: 'CONTACTED' });

    expect(res.status).toBe(200);
    expect(res.body.data.stage).toBe('CONTACTED');

    // Verify task was automatically created
    const createdTasks = await Task.find({
      brokerageId: brokerageA._id,
      leadId: testLeadA._id,
    });

    expect(createdTasks.length).toBeGreaterThan(0);
    expect(createdTasks[0].status).toBe('PENDING');
  });

  it('protects against IDOR: Advisor B cannot update Brokerage A lead', async () => {
    const res = await request(app)
      .patch(`/api/leads/${testLeadA._id}/stage`)
      .set('Authorization', `Bearer ${advisorBToken}`)
      .send({ stage: 'QUALIFIED' });

    expect(res.status).toBe(404); // Tenant scope hides Lead A completely from Advisor B
  });

  it('handles simultaneous concurrent stage updates cleanly', async () => {
    // 5 concurrent requests updating the stage
    const promises = [
      request(app)
        .patch(`/api/leads/${testLeadA._id}/stage`)
        .set('Authorization', `Bearer ${advisorAToken}`)
        .send({ stage: 'QUALIFIED' }),
      request(app)
        .patch(`/api/leads/${testLeadA._id}/stage`)
        .set('Authorization', `Bearer ${advisorAToken}`)
        .send({ stage: 'APPLICATION' }),
      request(app)
        .patch(`/api/leads/${testLeadA._id}/stage`)
        .set('Authorization', `Bearer ${advisorAToken}`)
        .send({ stage: 'WON' }),
    ];

    const results = await Promise.all(promises);
    for (const r of results) {
      expect(r.status).toBe(200);
    }

    const finalLead = await Lead.findById(testLeadA._id);
    expect(['QUALIFIED', 'APPLICATION', 'WON']).toContain(finalLead?.stage);
  });
});
