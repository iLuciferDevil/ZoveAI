import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const baseUrl = process.env.NEXTAUTH_URL || 'https://zoveai.com';
    const token = Buffer.from(`${email}:${Date.now()}:${Math.random()}`).toString('base64url');
    const magicLink = `${baseUrl}/?magic=${token}&email=${encodeURIComponent(email)}`;

    const { error } = await resend.emails.send({
      from: 'ZoveAI <hello@zoveai.com>',
      to: email,
      subject: '✦ Your ZoveAI sign-in link',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0D0F0E;font-family:system-ui,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0F0E;padding:40px 20px;"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border-radius:20px;border:1px solid rgba(255,255,255,0.1);"><tr><td style="padding:40px;text-align:center;"><div style="width:48px;height:48px;background:linear-gradient(135deg,#D4854A,#E8A46A);border-radius:50%;display:inline-block;line-height:48px;font-size:22px;margin-bottom:20px;">✦</div><h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#F5F0E8;margin:0 0 8px;">Sign in to ZoveAI</h1><p style="color:rgba(245,240,232,0.6);font-size:15px;margin:0 0 32px;line-height:1.6;">Click below to sign in. Link expires in 10 minutes.</p><a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#D4854A,#E8A46A);color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:15px;font-weight:500;">Sign in to ZoveAI →</a><p style="color:rgba(245,240,232,0.35);font-size:12px;margin:24px 0 0;">If you didn't request this, ignore this email.</p></td></tr><tr><td style="padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.07);"><p style="color:rgba(245,240,232,0.3);font-size:11px;margin:0;">ZoveAI · AI-powered travel discovery · Free forever</p></td></tr></table></td></tr></table></body></html>`,
    });

    if (error) return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Magic link error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
