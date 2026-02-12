import * as jose from 'jose';
import { cookies } from 'next/headers';

function getSecret(): Uint8Array {
  // In production, require a configured secret for security.
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is not configured in production');
  }
  if (!secret) {
    console.warn('NEXTAUTH_SECRET not set; using development fallback secret.');
  }
  return new TextEncoder().encode(secret ?? 'fallback-secret-for-dev');
}

export async function signToken(payload: jose.JWTPayload) {
  const key = getSecret();
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const key = getSecret();
    const { payload } = await jose.jwtVerify(token, key);
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload || typeof payload !== 'object' || !('id' in payload)) return null;
  
  return {
    id: (payload as { id: string }).id,
    email: (payload as { email: string }).email,
  };
}
