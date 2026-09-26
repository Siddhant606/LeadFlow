import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthUserPayload } from '../types';

export function signToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUserPayload {
  return jwt.verify(token, config.jwtSecret) as AuthUserPayload;
}
