import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { Brokerage, IBrokerage } from '../models/Brokerage';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';
import { PipelineService } from './pipeline.service';
import crypto from 'crypto';

export class AuthService {
  /**
   * Authenticates user and returns JWT token + user profile
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: any; brokerage: any }> {
    const normalizedEmail = email.trim().toLowerCase();

    // Select passwordHash specifically
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    let brokerage: IBrokerage | null = null;
    if (user.brokerageId) {
      brokerage = await Brokerage.findById(user.brokerageId);
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      brokerageId: user.brokerageId ? user.brokerageId.toString() : null,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        brokerageId: user.brokerageId ? user.brokerageId.toString() : null,
      },
      brokerage: brokerage
        ? {
            id: brokerage._id.toString(),
            name: brokerage.name,
            slug: brokerage.slug,
            apiKey: brokerage.apiKey,
          }
        : null,
    };
  }

  /**
   * Registers a new brokerage with an initial admin user and seeds default stages
   */
  static async registerBrokerage(data: {
    brokerageName: string;
    brokerageSlug: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<{ token: string; user: any; brokerage: any }> {
    const slug = data.brokerageSlug.toLowerCase().trim();
    const existingBrokerage = await Brokerage.findOne({ slug });
    if (existingBrokerage) {
      throw new ConflictError('Brokerage slug is already in use');
    }

    const apiKey = `lf_live_${crypto.randomBytes(16).toString('hex')}`;

    const brokerage = await Brokerage.create({
      name: data.brokerageName.trim(),
      slug,
      apiKey,
      status: 'ACTIVE',
    });

    const passwordHash = await hashPassword(data.adminPassword);
    const user = await User.create({
      brokerageId: brokerage._id,
      name: data.adminName.trim(),
      email: data.adminEmail.toLowerCase().trim(),
      passwordHash,
      role: 'BROKERAGE_ADMIN',
      isActive: true,
    });

    // Seed default pipeline stages and email template
    await PipelineService.seedBrokerageDefaults(brokerage._id);

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      brokerageId: brokerage._id.toString(),
      name: user.name,
    });

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        brokerageId: brokerage._id.toString(),
      },
      brokerage: {
        id: brokerage._id.toString(),
        name: brokerage.name,
        slug: brokerage.slug,
        apiKey: brokerage.apiKey,
      },
    };
  }

  static async createUser(
    brokerageId: mongoose.Types.ObjectId,
    userData: {
      name: string;
      email: string;
      password: string;
      role: 'BROKERAGE_ADMIN' | 'ADVISOR' | 'CLIENT';
    }
  ): Promise<IUser> {
    const normalizedEmail = userData.email.toLowerCase().trim();

    const existing = await User.findOne({
      brokerageId,
      email: normalizedEmail,
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists in your brokerage');
    }

    const passwordHash = await hashPassword(userData.password);

    const user = await User.create({
      brokerageId,
      name: userData.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: userData.role,
      isActive: true,
    });

    return user;
  }

  static async getAdvisors(brokerageId: mongoose.Types.ObjectId): Promise<IUser[]> {
    return User.find({
      brokerageId,
      role: { $in: ['ADVISOR', 'BROKERAGE_ADMIN'] },
      isActive: true,
    }).select('-passwordHash');
  }
}
