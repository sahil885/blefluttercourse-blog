import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const apiKey = process.env.SYSTEME_API_KEY;
    if (!apiKey) {
      console.error('SYSTEME_API_KEY environment variable is not set.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const systemeRes = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        firstName: name.trim(),
        tags: ['BLE_Guide_Optin'],
        fields: [],
      }),
    });

    if (!systemeRes.ok) {
      // 422 = contact already exists in systeme.io — treat as success
      if (systemeRes.status === 422) {
        return NextResponse.json({ success: true });
      }
      const errBody = await systemeRes.text();
      console.error('systeme.io error:', systemeRes.status, errBody);
      return NextResponse.json({ error: 'Could not subscribe. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Subscribe route error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}