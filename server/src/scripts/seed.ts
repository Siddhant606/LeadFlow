import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Brokerage } from '../models/Brokerage';
import { User } from '../models/User';
import { Lead } from '../models/Lead';
import { Client } from '../models/Client';
import { Task } from '../models/Task';
import { DocumentModel } from '../models/Document';
import { PipelineService } from '../services/pipeline.service';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';

async function seed() {
  try {
    logger.info('Connecting to database for seeding...');
    await connectDatabase();

    logger.info('Clearing existing collections...');
    await Promise.all([
      Brokerage.deleteMany({}),
      User.deleteMany({}),
      Lead.deleteMany({}),
      Client.deleteMany({}),
      Task.deleteMany({}),
      DocumentModel.deleteMany({}),
    ]);

    const passwordHash = await hashPassword('password123');

    // 1. Create Brokerage A: HypoTech Berlin GmbH
    const brokerageA = await Brokerage.create({
      name: 'HypoTech Berlin GmbH',
      slug: 'hypotech-berlin',
      apiKey: 'lf_hypotech_berlin_key_123',
      status: 'ACTIVE',
    });
    await PipelineService.seedBrokerageDefaults(brokerageA._id);

    // 2. Create Users for Brokerage A
    const adminA = await User.create({
      brokerageId: brokerageA._id,
      name: 'Max Mustermann (Admin)',
      email: 'admin@hypotech.de',
      passwordHash,
      role: 'BROKERAGE_ADMIN',
      isActive: true,
    });

    const advisorA = await User.create({
      brokerageId: brokerageA._id,
      name: 'Lukas Weber (Advisor)',
      email: 'lukas.advisor@hypotech.de',
      passwordHash,
      role: 'ADVISOR',
      isActive: true,
    });

    // 3. Create Brokerage B: München Baufinanz AG (to prove tenant isolation)
    const brokerageB = await Brokerage.create({
      name: 'München Baufinanz AG',
      slug: 'muenchen-baufinanz',
      apiKey: 'lf_muenchen_baufinanz_key_456',
      status: 'ACTIVE',
    });
    await PipelineService.seedBrokerageDefaults(brokerageB._id);

    const adminB = await User.create({
      brokerageId: brokerageB._id,
      name: 'Dr. Stefan Müller (Admin)',
      email: 'admin@muenchen-baufinanz.de',
      passwordHash,
      role: 'BROKERAGE_ADMIN',
      isActive: true,
    });

    const advisorB = await User.create({
      brokerageId: brokerageB._id,
      name: 'Sophia Lindemann (Advisor)',
      email: 'stefan.advisor@muenchen-baufinanz.de',
      passwordHash,
      role: 'ADVISOR',
      isActive: true,
    });

    // 4. Create Leads for Brokerage A
    const leadA1 = await Lead.create({
      brokerageId: brokerageA._id,
      externalId: 'EXT-BER-1001',
      name: 'Hanna Schmidt',
      email: 'hanna.schmidt@gmail.com',
      phone: '+491701234567',
      source: 'ImmoScout24',
      stage: 'APPLICATION',
      assignedAdvisorId: advisorA._id,
      metadata: { loanAmount: 420000, city: 'Berlin Mitte' },
    });

    const leadA2 = await Lead.create({
      brokerageId: brokerageA._id,
      externalId: 'EXT-BER-1002',
      name: 'Felix Becker',
      email: 'felix.becker@outlook.de',
      phone: '+491718899001',
      source: 'Check24',
      stage: 'QUALIFIED',
      assignedAdvisorId: advisorA._id,
      metadata: { loanAmount: 650000, city: 'Potsdam' },
    });

    const leadA3 = await Lead.create({
      brokerageId: brokerageA._id,
      externalId: 'EXT-BER-1003',
      name: 'Lena Wagner',
      email: 'lena.wagner@web.de',
      phone: '+491605544332',
      source: 'Google Ads',
      stage: 'NEW',
      metadata: { loanAmount: 310000, city: 'Berlin Kreuzberg' },
    });

    const leadA4 = await Lead.create({
      brokerageId: brokerageA._id,
      externalId: 'EXT-BER-1004',
      name: 'Thomas Meier',
      email: 'thomas.meier@t-online.de',
      phone: '+491512349876',
      source: 'Interhyp Partner',
      stage: 'WON',
      assignedAdvisorId: advisorA._id,
      metadata: { loanAmount: 510000, city: 'Berlin Charlottenburg' },
    });

    // 5. Convert leadA1 to Client
    const clientUserA = await User.create({
      brokerageId: brokerageA._id,
      name: leadA1.name,
      email: leadA1.email,
      passwordHash,
      role: 'CLIENT',
      isActive: true,
    });

    const clientA1 = await Client.create({
      brokerageId: brokerageA._id,
      userId: clientUserA._id,
      leadId: leadA1._id,
      caseStatus: 'PENDING_DOCUMENTS',
      notes: 'Initial mortgage pre-approval prepared with Commerzbank',
    });

    leadA1.clientId = clientA1._id;
    await leadA1.save();

    // 6. Create Documents for Client A1
    await DocumentModel.create([
      {
        brokerageId: brokerageA._id,
        clientId: clientA1._id,
        uploadedBy: clientUserA._id,
        originalName: 'Gehaltsabrechnung_Januar_2025.pdf',
        storageKey: 'seed_gehalt_jan_2025.pdf',
        mimeType: 'application/pdf',
        size: 245000,
        status: 'PASSED',
        verificationDetails: {
          ocrPassed: true,
          confidenceScore: 0.98,
          verifiedFields: ['Salary: €4,250 Net', 'Employer: Siemens AG', 'Tax Class I'],
        },
      },
      {
        brokerageId: brokerageA._id,
        clientId: clientA1._id,
        uploadedBy: clientUserA._id,
        originalName: 'SCHUFA_Bonitaetsauskunft_2025.pdf',
        storageKey: 'seed_schufa_2025.pdf',
        mimeType: 'application/pdf',
        size: 380000,
        status: 'PROCESSING',
      },
      {
        brokerageId: brokerageA._id,
        clientId: clientA1._id,
        uploadedBy: clientUserA._id,
        originalName: 'Kaufvertragsentwurf_Grundstueck.pdf',
        storageKey: 'seed_kaufvertrag_draft.pdf',
        mimeType: 'application/pdf',
        size: 720000,
        status: 'FAILED',
        failureReason: 'Document scan illegible: Missing notary signature page.',
      },
    ]);

    // 7. Create Tasks for Brokerage A (including an overdue task to demonstrate dashboard KPI!)
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 3); // 3 days ago

    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 2); // 2 days ahead

    await Task.create([
      {
        brokerageId: brokerageA._id,
        leadId: leadA1._id,
        assignedTo: advisorA._id,
        title: 'Submit mortgage application to Sparkasse Berlin',
        description: 'Verify all 3 monthly salary slips prior to final submission',
        dueAt: overdueDate,
        status: 'PENDING',
      },
      {
        brokerageId: brokerageA._id,
        leadId: leadA2._id,
        assignedTo: advisorA._id,
        title: 'Follow-up call on equity contribution',
        description: 'Check if buyer has 20% equity for lower interest tier',
        dueAt: upcomingDate,
        status: 'PENDING',
      },
      {
        brokerageId: brokerageA._id,
        leadId: leadA3._id,
        assignedTo: advisorA._id,
        title: 'Initial phone introduction',
        description: 'Discuss purchase target and budget limit',
        dueAt: upcomingDate,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    ]);

    // 8. Create Isolated Leads for Brokerage B
    await Lead.create([
      {
        brokerageId: brokerageB._id,
        externalId: 'EXT-MUC-5001',
        name: 'Maximilian Huber',
        email: 'max.huber@bayern.de',
        phone: '+498912345678',
        source: 'ImmoScout24 Bayern',
        stage: 'NEW',
        assignedAdvisorId: advisorB._id,
        metadata: { loanAmount: 890000, city: 'München Bogenhausen' },
      },
      {
        brokerageId: brokerageB._id,
        externalId: 'EXT-MUC-5002',
        name: 'Theresa Brunner',
        email: 'theresa.brunner@bmw.de',
        phone: '+498998765432',
        source: 'Referral',
        stage: 'QUALIFIED',
        assignedAdvisorId: advisorB._id,
        metadata: { loanAmount: 1100000, city: 'Starnberg' },
      },
    ]);

    logger.info('Database seeded successfully with demo German mortgage brokerages!');
    logger.info('================ DEMO CREDENTIALS ================');
    logger.info('BROKERAGE A (Berlin):');
    logger.info('  Admin:   admin@hypotech.de            | Password: password123');
    logger.info('  Advisor: lukas.advisor@hypotech.de    | Password: password123');
    logger.info('  Client:  hanna.schmidt@gmail.com      | Password: password123');
    logger.info('  API Key: lf_hypotech_berlin_key_123');
    logger.info('BROKERAGE B (München):');
    logger.info('  Admin:   admin@muenchen-baufinanz.de  | Password: password123');
    logger.info('  Advisor: stefan.advisor@muenchen-baufinanz.de | Password: password123');
    logger.info('  API Key: lf_muenchen_baufinanz_key_456');
    logger.info('==================================================');

    await disconnectDatabase();
  } catch (error) {
    logger.error('Seeding error:', error);
    process.exit(1);
  }
}

seed();
