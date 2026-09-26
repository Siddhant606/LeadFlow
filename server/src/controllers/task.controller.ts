import { Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { AuthenticatedRequest } from '../types';

export class TaskController {
  static async getTasks(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, leadId, assignedTo } = req.query;
      const tasks = await TaskService.getTasks(req.brokerageId!, {
        status: status as string,
        leadId: leadId as string,
        assignedTo: assignedTo as string,
      });
      res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
      next(error);
    }
  }

  static async updateTaskStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status } = req.body;
      const task = await TaskService.updateTaskStatus(req.brokerageId!, req.params.id, status);
      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  }
}
