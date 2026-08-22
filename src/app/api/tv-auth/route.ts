/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

async function generateSignature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(left: string, right: string) {
  let mismatch = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

async function readToken(req: NextRequest) {
  const headerToken = req.headers.get('x-tintintv-tv-token');
  if (headerToken) return headerToken;

  try {
    const body = await req.json();
    return typeof body?.token === 'string' ? body.token : '';
  } catch {
    return '';
  }
}

async function createAuthCookie(req: NextRequest) {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage';
  const authData: any = {
    role: 'user',
    tv: true,
    timestamp: Date.now(),
  };

  if (storageType === 'localstorage') {
    if (process.env.PASSWORD) {
      authData.password = process.env.PASSWORD;
    }
  } else {
    const username = process.env.TV_AUTH_USERNAME || 'tv';
    authData.username = username;
    authData.signature = await generateSignature(
      username,
      process.env.PASSWORD || ''
    );
  }

  const response = NextResponse.json({ ok: true });
  const expires = new Date();
  expires.setDate(expires.getDate() + 365);

  response.cookies.set('auth', encodeURIComponent(JSON.stringify(authData)), {
    path: '/',
    expires,
    sameSite: 'lax',
    httpOnly: false,
    secure: req.nextUrl.protocol === 'https:',
  });

  return response;
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.TV_ACCESS_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { ok: false, error: 'TV access is not configured' },
      { status: 503 }
    );
  }

  const token = await readToken(req);
  if (!token || !constantTimeEqual(token, expectedToken)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return createAuthCookie(req);
}
