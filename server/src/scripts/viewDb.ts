import { connectDatabase, disconnectDatabase } from '../config/database';
import { Brokerage } from '../models/Brokerage';
import { User } from '../models/User';
import { Lead } from '../models/Lead';
import { Client } from '../models/Client';
import { Task } from '../models/Task';
import { DocumentModel } from '../models/Document';

async function viewDatabase() {
  try {
    await connectDatabase();
    console.log('\n================== DATABASE OVERVIEW (MongoDB: leadflow) ==================\n');

    // 1. Brokerages
    const brokerages = await Brokerage.find({});
    console.log(`🏢 BROKERAGES (${brokerages.length}):`);
    console.table(
      brokerages.map((b) => ({
        ID: b._id.toString(),
        Name: b.name,
        Slug: b.slug,
        ApiKey: b.apiKey,
        Status: b.status,
      }))
    );

    // 2. Users
    const users = await User.find({});
    console.log(`\n👤 USERS (${users.length}):`);
    console.table(
      users.map((u) => ({
        ID: u._id.toString(),
        Name: u.name,
        Email: u.email,
        Role: u.role,
        BrokerageId: u.brokerageId ? u.brokerageId.toString() : 'None',
      }))
    );

    // 3. Leads
    const leads = await Lead.find({}).sort({ createdAt: -1 });
    console.log(`\n📋 LEADS (${leads.length}):`);
    console.table(
      leads.map((l) => ({
        ID: l._id.toString(),
        Name: l.name,
        Email: l.email,
        Phone: l.phone,
        Stage: l.stage,
        Source: l.source,
        ExternalId: l.externalId || 'None',
        BrokerageId: l.brokerageId.toString().substring(0, 8) + '...',
      }))
    );

    // 4. Clients
    const clients = await Client.find({}).populate('userId', 'email name');
    console.log(`\n🤝 CLIENT CASES (${clients.length}):`);
    console.table(
      clients.map((c) => ({
        ID: c._id.toString(),
        ClientUser: (c.userId as any)?.email,
        CaseStatus: c.caseStatus,
        Notes: c.notes,
        BrokerageId: c.brokerageId.toString().substring(0, 8) + '...',
      }))
    );

    // 5. Documents
    const docs = await DocumentModel.find({}).sort({ createdAt: -1 });
    console.log(`\n📄 DOCUMENTS (${docs.length}):`);
    console.table(
      docs.map((d) => ({
        ID: d._id.toString(),
        Name: d.originalName,
        Status: d.status,
        SizeKB: (d.size / 1024).toFixed(1),
        FailureReason: d.failureReason || 'N/A',
        StorageKey: d.storageKey,
      }))
    );

    // 6. Tasks
    const tasks = await Task.find({}).sort({ dueAt: 1 });
    console.log(`\n✅ TASKS (${tasks.length}):`);
    console.table(
      tasks.map((t) => ({
        ID: t._id.toString(),
        Title: t.title,
        Status: t.status,
        Due: new Date(t.dueAt).toLocaleDateString('de-DE'),
        IsOverdue: t.status === 'PENDING' && new Date(t.dueAt) < new Date(),
      }))
    );

    console.log('\n==========================================================================\n');
    await disconnectDatabase();
  } catch (error) {
    console.error('Failed to view database:', error);
    process.exit(1);
  }
}

viewDatabase();
