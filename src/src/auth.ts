import { createHmac } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const SALT = 'nusuk-auth-salt-v1';
const ADMIN_EMAIL = 'r.endargiri@gmail.com';
const ADMIN_HASH = '408b38dc490dd3db64eabd46128385801a726ea13d87d593f99fded77743a596';
const TOKEN_SECRET = process.env['AUTH_SECRET'] ?? 'nusuk-default-secret-change-me';
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

function hashPassword(password: string): string {
  return createHmac('sha256', SALT).update(password).digest('hex');
}

function sign(payload: string): string {
  return createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
}

export function login(email: string, password: string): string | null {
  if (email.toLowerCase() !== ADMIN_EMAIL) return null;
  if (hashPassword(password) !== ADMIN_HASH) return null;
  const payload = Buffer.from(
    JSON.stringify({ email: ADMIN_EMAIL, exp: Date.now() + TOKEN_TTL }),
  ).toString('base64url');
  return payload + '.' + sign(payload);
}

export function verifyToken(token: string): { email: string } | null {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      email: string;
      exp: number;
    };
    if (data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'];
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
