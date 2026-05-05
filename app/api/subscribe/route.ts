import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const apiKey = process.env.MAILERLITE_API_KEY;
    if (!apiKey) {
      console.error('MAILERLITE_API_KEY env var is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const payload = {
      email: email.toLowerCase().trim(),
      fields: { first_name: (name || '').trim() },
      groups: ['171464242535335650'],
    };

    console.log('Sending to MailerLite:', JSON.stringify({ email: payload.email, groups: payload.groups }));

    const mlRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await mlRes.json().catch(() => ({}));
    console.log('MailerLite response:', mlRes.status, JSON.stringify(responseBody));

    if (mlRes.ok) {
      return NextResponse.json({ success: true });
    }

    if (mlRes.status === 422) {
      return NextResponse.json({ success: true });
    }

    console.error('MailerLite error:', mlRes.status, JSON.stringify(responseBody));
    return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 });
  } catch (err) {
    console.error('Subscribe route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
