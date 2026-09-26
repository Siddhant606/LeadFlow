import mongoose from 'mongoose';
import { Lead } from '../models/Lead';
import { Task } from '../models/Task';
import { DocumentModel } from '../models/Document';
import { Client } from '../models/Client';

export interface DashboardStats {
  brokerageId: string;
  totalLeads: number;
  totalClients: number;
  leadsByStage: Record<string, number>;
  pendingTasks: number;
  overdueTasks: number;
  documentsProcessing: number;
  documentsFailed: number;
  documentsPassed: number;
  recentLeads: any[];
  recentTasks: any[];
}

export class DashboardService {
  /**
   * Retrieves tenant-isolated dashboard statistics using index-covered MongoDB queries & aggregations.
   */
  static async getDashboardStats(brokerageId: mongoose.Types.ObjectId): Promise<DashboardStats> {
    const now = new Date();

    const [
      totalLeads,
      totalClients,
      leadsByStageAgg,
      pendingTasks,
      overdueTasks,
      docStatsAgg,
      recentLeads,
      recentTasks,
    ] = await Promise.all([
      // Total leads count (uses { brokerageId: 1 })
      Lead.countDocuments({ brokerageId }),

      // Total clients count
      Client.countDocuments({ brokerageId }),

      // Group leads by stage
      Lead.aggregate([
        { $match: { brokerageId } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),

      // Pending tasks
      Task.countDocuments({ brokerageId, status: 'PENDING' }),

      // Overdue tasks: status PENDING and dueAt < now
      Task.countDocuments({
        brokerageId,
        status: 'PENDING',
        dueAt: { $lt: now },
      }),

      // Document counts by status
      DocumentModel.aggregate([
        { $match: { brokerageId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // 5 most recent leads
      Lead.find({ brokerageId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('assignedAdvisorId', 'name email'),

      // 5 most urgent pending tasks
      Task.find({ brokerageId, status: 'PENDING' })
        .sort({ dueAt: 1 })
        .limit(5)
        .populate('leadId', 'name')
        .populate('assignedTo', 'name email'),
    ]);

    // Format leads by stage
    const leadsByStage: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      APPLICATION: 0,
      WON: 0,
      LOST: 0,
    };
    for (const item of leadsByStageAgg) {
      leadsByStage[item._id] = item.count;
    }

    // Format doc stats
    const docMap: Record<string, number> = {
      PROCESSING: 0,
      PASSED: 0,
      FAILED: 0,
      UPLOADED: 0,
    };
    for (const item of docStatsAgg) {
      docMap[item._id] = item.count;
    }

    return {
      brokerageId: brokerageId.toString(),
      totalLeads,
      totalClients,
      leadsByStage,
      pendingTasks,
      overdueTasks,
      documentsProcessing: docMap['PROCESSING'] + docMap['UPLOADED'],
      documentsFailed: docMap['FAILED'],
      documentsPassed: docMap['PASSED'],
      recentLeads,
      recentTasks: recentTasks.map((t) => ({
        ...t.toObject(),
        isOverdue: new Date(t.dueAt) < now,
      })),
    };
  }
}
