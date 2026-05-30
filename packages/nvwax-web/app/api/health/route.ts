import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'nvwax-frontend',
    timestamp: new Date().toISOString()
  });
}
