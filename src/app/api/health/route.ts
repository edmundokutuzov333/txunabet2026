import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    firebaseProject: Boolean(process.env.FIREBASE_PROJECT_ID),
    firestoreDatabase: Boolean(process.env.FIREBASE_FIRESTORE_DATABASE_ID),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
  const healthy = Object.values(checks).every(Boolean);
  return NextResponse.json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: healthy ? 200 : 503 });
}
