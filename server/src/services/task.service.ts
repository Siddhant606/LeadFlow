import mongoose from 'mongoose';
import { Task, ITask } from '../models/Task';
import { ITaskTemplate } from '../models/PipelineStage';
import { logger } from '../utils/logger';
import { emitToTenant } from '../sockets';

export class TaskService {
  /**
   * Generates tasks configured for a stage transition
   */
  static async createTasksFromTemplates(
    brokerageId: mongoose.Types.ObjectId,
    leadId: mongoose.Types.ObjectId,
    taskTemplates: ITaskTemplate[],
    assignedAdvisorId?: mongoose.Types.ObjectId | null
  ): Promise<ITask[]> {
    if (!taskTemplates || taskTemplates.length === 0) {
      return [];
    }

    const createdTasks: ITask[] = [];

    for (const tpl of taskTemplates) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + (tpl.dueDays || 2));

      const task = await Task.create({
        brokerageId,
        leadId,
        assignedTo: assignedAdvisorId || null,
        title: tpl.title,
        description: tpl.description || '',
        dueAt,
        status: 'PENDING',
      });

      createdTasks.push(task);
      logger.info(`Task created: "${task.title}" for lead ${leadId} (due: ${dueAt.toISOString()})`);
      emitToTenant(brokerageId, 'task:created', task);
    }

    return createdTasks;
  }

  static async getTasks(
    brokerageId: mongoose.Types.ObjectId,
    filter: { status?: string; leadId?: string; assignedTo?: string }
  ): Promise<any[]> {
    const query: any = { brokerageId };

    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.leadId) {
      query.leadId = new mongoose.Types.ObjectId(filter.leadId);
    }
    if (filter.assignedTo) {
      query.assignedTo = new mongoose.Types.ObjectId(filter.assignedTo);
    }

    const tasks = await Task.find(query)
      .populate('leadId', 'name email phone stage')
      .populate('assignedTo', 'name email')
      .sort({ dueAt: 1 });

    const now = new Date();
    return tasks.map((task) => {
      const doc = task.toObject();
      return {
        ...doc,
        isOverdue: task.status === 'PENDING' && new Date(task.dueAt) < now,
      };
    });
  }

  static async updateTaskStatus(
    brokerageId: mongoose.Types.ObjectId,
    taskId: string,
    status: 'PENDING' | 'COMPLETED'
  ): Promise<ITask | null> {
    const task = await Task.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(taskId), brokerageId },
      {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
      { new: true }
    )
      .populate('leadId', 'name email phone stage')
      .populate('assignedTo', 'name email');

    if (task) {
      emitToTenant(brokerageId, 'task:updated', task);
    }
    return task;
  }
}
