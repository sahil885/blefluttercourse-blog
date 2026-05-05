import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const apiKey = process.env.MAILERLITE_API_KEY;
    if (!apiKey) {
      console.error('MAILERLITE_API_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const mlRes = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        fields: { name: name.trim() },
        groups: ['171464242535335650'],
      }),
    });

    // 200 = existing subscriber updated, 201 = new subscriber created
    if (mlRes.ok) {
      return NextResponse.json({ success: true });
    }

    const errBody = await mlRes.json().catch(() => ({}));
    console.error('MailerLite error:', mlRes.status, errBody);

    // 422 with "already subscribed" is still a success
    if (mlRes.status === 422) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 });

  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}