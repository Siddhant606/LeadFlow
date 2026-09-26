import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Lead } from '../models/Lead';
import { Brokerage } from '../models/Brokerage';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { hashPassword } from '../utils/password';
import { Express } from 'express';

describe('Dashboard Aggregations & Tenant Isolation', () => {
  let app: Express;
  let brokerageA: any;
  let brokerageB: any;
  let advisorAToken: string;
  let advisorBToken: string;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    await Promise.all([
      Brokerage.deleteMany({}),
      User.deleteMany({}),
      Lead.deleteMany({}),
      Task.deleteMany({}),
    ]);

    const pw = await hashPassword('password123');

    // Brokerage A
    brokerageA = await Brokerage.create({
      name: 'Brokerage Alpha',
      slug: 'alpha-dash',
      apiKey: 'key_dash_a',
    });

    const advA = await User.create({
      brokerageId: brokerageA._id,
      name: 'Advisor A',
      email: 'adva@dash.de',
      passwordHash: pw,
      role: 'ADVISOR',
    });

    // Brokerage B
    brokerageB = await Brokerage.create({
      name: 'Brokerage Beta',
      slug: 'beta-dash',
      apiKey: 'key_dash_b',
    });

    const advB = await User.create({
      brokerageId: brokerageB._id,
      name: 'Advisor B',
      email: 'advb@dash.de',
      passwordHash: pw,
      role: 'ADVISOR',
    });

    // Populate Brokerage A with 3 leads and 1 overdue task
    const leadA = await Lead.create({
      brokerageId: brokerageA._id,
      name: 'Lead A1',
      email: 'a1@test.de',
      phone: '+49170111111',
      source: 'Portal',
      stage: 'NEW',
    });
    await Lead.create({
      brokerageId: brokerageA._id,
      name: 'Lead A2',
      email: 'a2@test.de',
      phone: '+49170222222',
      source: 'Portal',
      stage: 'QUALIFIED',
    });

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 4);

    await Task.create({
      brokerageId: brokerageA._id,
      leadId: leadA._id,
      title: 'Overdue call for Lead A1',
      dueAt: pastDate,
      status: 'PENDING',
    });

    // Populate Brokerage B with 1 lead and 0 tasks
    await Lead.create({
      brokerageId: brokerageB._id,
      name: 'Lead B1',
      email: 'b1@test.de',
      phone: '+4989111111',
      source: 'Portal',
      stage: 'WON',
    });

    // Login tokens
    const resA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'adva@dash.de', password: 'password123' });
    advisorAToken = resA.body.data.token;

    const resB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'advb@dash.de', password: 'password123' });
    advisorBToken = resB.body.data.token;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('provides isolated stats for Brokerage A dashboard', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${advisorAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.brokerageId).toBe(brokerageA._id.toString());
    expect(res.body.data.totalLeads).toBe(2);
    expect(res.body.data.leadsByStage.NEW).toBe(1);
    expect(res.body.data.leadsByStage.QUALIFIED).toBe(1);
    expect(res.body.data.leadsByStage.WON).toBe(0); // Brokerage B has 1 WON, Brokerage A must have 0!
    expect(res.body.data.overdueTasks).toBe(1);
  });

  it('provides isolated stats for Brokerage B dashboard', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${advisorBToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.brokerageId).toBe(brokerageB._id.toString());
    expect(res.body.data.totalLeads).toBe(1);
    expect(res.body.data.leadsByStage.NEW).toBe(0);
    expect(res.body.data.leadsByStage.WON).toBe(1);
    expect(res.body.data.overdueTasks).toBe(0); // Brokerage B has no overdue tasks!
  });
});
