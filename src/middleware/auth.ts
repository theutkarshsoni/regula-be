import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

export function requireAuth(req: import('express').Request, res: any, next: any) {
  const hdrAuth = req.headers.authorization || '';
  const token = hdrAuth.startsWith('Bearer ') ? hdrAuth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: payload.identifier, role: payload.role, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

export function requireRole(...roles: ('analyst'|'admin')[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
