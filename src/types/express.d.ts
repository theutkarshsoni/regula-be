import { JwtPayload } from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number | string;
      email: string;
      role: 'admin' | 'analyst';
    };
  }
}
