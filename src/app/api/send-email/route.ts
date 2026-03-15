import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend outside the function
const resend = new Resend(process.env.RESEND_API_KEY);

// MUST be a named export called POST
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emails, subject, message } = body;

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'], 
      bcc: emails, 
      subject: subject,
      text: message,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}