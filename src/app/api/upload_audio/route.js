import { NextResponse } from 'next/server';

// SECURITY HOLD: The historical endpoint accepted a caller-supplied userId,
// wrote with Admin privileges and published audio publicly. It must not be
// enabled until Firebase ID token verification, parent/child ownership checks,
// safe bounded uploads and private Storage rules are implemented and tested.
export async function POST() {
  return NextResponse.json(
    { error: 'Audio upload is temporarily unavailable pending security verification.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
