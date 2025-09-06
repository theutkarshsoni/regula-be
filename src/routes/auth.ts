import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RegisterSchema, LoginSchema } from '../utils/validation.js';
import { validateBody } from '../middleware/validate.js';
import { pquery } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const TTL_HOURS = parseInt(process.env.TOKEN_TTL_HOURS || '12', 10);

/**
 * POST /auth/register
 * body: { email: string, password: string, name: string, role: 'analyst'|'admin' }
 */

router.post('/register', validateBody(RegisterSchema), async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const newuser = await pquery(
      `INSERT INTO users(email, password_hash, name, role)
       VALUES ($1,$2,$3,$4) RETURNING id, email, name, role`,
      [email, hash, name, role]
    );
    res.status(201).json(newuser.rows[0]);
  } catch (e:any) {
    if (e.code === '23505') return res.status(409).json({ error: 'email already exists' });
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors.map((i:any)=>i.message).join(', ') });
    console.error('Registration failed', e);
    next(e);
  }
});

/**
 * POST /auth/login
 * body: { email: string, password: string }
 */

router.post('/login', validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const userRes = await pquery(`SELECT id, email, name, role, password_hash FROM users WHERE email=$1`, [email]);
    
    const user = userRes.rows?.[0];
    if (!user) return res.status(401).json({ error: 'user not found' });
    
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    
    const token = jwt.sign({ identifier: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: `${TTL_HOURS}h` });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e:any) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors.map((i:any)=>i.message).join(', ') });
    console.error('Login failed', e);
    next(e);
  }
});

export default router;
