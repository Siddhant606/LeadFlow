import { Brokerage } from '../models/Brokerage';
import { User } from '../models/User';
import { Lead } from '../models/Lead';
import { Client } from '../models/Client';
import { Task } from '../models/Task';
import { DocumentModel } from '../models/Document';
import { PipelineService } from '../services/pipeline.service';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';

export async function seedIfEmpty(): Promise<void> {
  const brokerageCount = await Brokerage.countDocuments();
  if (brokerageCount > 0) {
    logger.info(`Database already populated (${brokerageCount} brokerages found). Skipping auto-seed.`);
    return;
  }

  logger.info('Empty database detected. Running automatic initial seed for demo tenants & users...');

  const passwordHash = await hashPassword('password123');

  // 1. Create Brokerage A: HypoTech Berlin GmbH
  const brokerageA = await Brokerage.create({
    name: 'HypoTech Berlin GmbH',
    slug: 'hypotech-berlin',
    apiKey: 'lf_hypotech_berlin_key_123',
    status: 'ACTIVE',
  });
  await PipelineService.seedBrokerageDefaults(brokerageA._id);

  // Users for Brokerage A
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

  // 2. Create Brokerage B: München Baufinanz AG (to prove tenant isolation)
  const brokerageB = await Brokerage.create({
    name: 'München Baufinanz AG',
    slug: 'muenchen-baufinanz',
    apiKey: 'lf_muenchen_key_999',
    status: 'ACTIVE',
  });
  await PipelineService.seedBrokerageDefaults(brokerageB._id);

  await User.create({
    brokerageId: brokerageB._id,
    name: 'Stefan Meyer (Munich Admin)',
    email: 'admin@muenchen-baufinanz.de',
    passwordHash,
    role: 'BROKERAGE_ADMIN',
    isActive: true,
  });

  await User.create({
    brokerageId: brokerageB._id,
    name: 'Anna Schmidt (Munich Advisor)',
    email: 'advisor@muenchen-baufinanz.de',
    passwordHash,
    role: 'ADVISOR',
    isActive: true,
  });

  // 3. Create Sample Leads for Brokerage A
  const lead1 = await Lead.create({
    brokerageId: brokerageA._id,
    externalId: 'ext-webform-101',
    name: 'Hans Becker',
    email: 'hans.becker@beispiel.de',
    phone: '+49 170 1234567',
    source: 'WEBSITE',
    stage: 'NEW',
    assignedAdvisorId: advisorA._id,
    metadata: {
      loanAmount: '450.000 €',
      propertyType: 'Single Family Home in Potsdam',
      downPayment: '90.000 €',
    },
  });

  const lead2 = await Lead.create({
    brokerageId: brokerageA._id,
    externalId: 'ext-adwords-202',
    name: 'Sophie Müller',
    email: 'sophie.mueller@example.com',
    phone: '+49 171 9876543',
    source: 'GOOGLE_ADS',
    stage: 'QUALIFIED',
    assignedAdvisorId: advisorA._id,
    metadata: {
      loanAmount: '320.000 €',
      propertyType: 'Condo in Berlin-Mitte',
      downPayment: '50.000 €',
    },
  });

  // Client user for converted lead
  const clientUser = await User.create({
    brokerageId: brokerageA._id,
    name: 'Sophie Müller',
    email: 'sophie.mueller@example.com',
    passwordHash,
    role: 'CLIENT',
    isActive: true,
  });

  const client2 = await Client.create({
    brokerageId: brokerageA._id,
    userId: clientUser._id,
    leadId: lead2._id,
    caseStatus: 'DOCUMENTS_SUBMITTED',
    notes: 'Pre-approval request for 320k loan. Documents under review.',
  });

  lead2.clientId = client2._id;
  await lead2.save();

  // Document for Client 2
  await DocumentModel.create({
    brokerageId: brokerageA._id,
    clientId: client2._id,
    uploadedBy: clientUser._id,
    originalName: 'Gehaltsnachweis_Januar_2025.pdf',
    storageKey: 'mock/gehaltsnachweis_jan_2025.pdf',
    mimeType: 'application/pdf',
    size: 245000,
    status: 'PASSED',
    verificationDetails: {
      ocrPassed: true,
      incomeVerified: true,
      extractedSalary: '4.200 € net/mo',
      confidence: 0.98,
      verifiedAt: new Date(),
    },
  });

  // Tasks
  await Task.create({
    brokerageId: brokerageA._id,
    leadId: lead1._id,
    assignedTo: advisorA._id,
    title: 'Initial Discovery Call',
    description: 'Call Hans Becker regarding Potsdam mortgage application and verify income requirements.',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'PENDING',
  });

  logger.info('Auto-seed completed successfully! Default demo accounts are ready.');
}
