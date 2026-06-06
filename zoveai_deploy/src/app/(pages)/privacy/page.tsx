'use client';
import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', color: '#F5F0E8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="rgba(122,158,130,0.2)" stroke="rgba(122,158,130,0.4)" strokeWidth="1"/><path d="M9 20 L16 10 L23 20" stroke="#7A9E82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="16" cy="10" r="1.8" fill="#D4854A"/></svg>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#F5F0E8' }}>ZoveAI</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back to ZoveAI</Link>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '42px', fontWeight: 400, color: '#F5F0E8', marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '48px' }}>Last updated: June 2026</p>

        {[
          {
            title: '1. Information We Collect',
            content: `When you use ZoveAI, we collect information you provide directly: your name, email address, and travel preferences when you create an account. We also collect information about how you use the service, including destinations you search for, trips you save, and preferences you set in your Travel DNA profile.

If you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive your Google password.

If you sign in with your phone number, we verify your number via SMS but do not store your number beyond what is needed for authentication.`
          },
          {
            title: '2. How We Use Your Information',
            content: `We use the information we collect to provide and improve ZoveAI. Specifically:

• To generate personalized travel recommendations based on your Travel DNA profile
• To remember your preferences and travel history so recommendations improve over time
• To send you service-related emails (sign-in links, trip summaries)
• To understand how people use ZoveAI so we can make it better

We do not sell your personal information to third parties. We do not use your data for advertising.`
          },
          {
            title: '3. Booking & Affiliate Links',
            content: `ZoveAI provides links to third-party booking platforms including Skyscanner, Booking.com, IRCTC, Viator, and Rome2Rio. When you click these links, you leave ZoveAI and are subject to those platforms' privacy policies. ZoveAI may earn a commission when you book through these links, at no additional cost to you.`
          },
          {
            title: '4. Data Storage',
            content: `Your data is stored securely using Supabase, a cloud database service. Your Travel DNA profile, saved trips, and search history are associated with your account. You can delete your account and all associated data at any time by contacting us at privacy@zoveai.com.`
          },
          {
            title: '5. Cookies',
            content: `ZoveAI uses cookies to keep you signed in and to remember your preferences. We do not use tracking cookies or advertising cookies. You can disable cookies in your browser settings, but this may affect your ability to sign in.`
          },
          {
            title: '6. Your Rights',
            content: `You have the right to access, correct, or delete your personal data at any time. You can export your Travel DNA profile and trip history from your dashboard. To request data deletion, email privacy@zoveai.com and we will process your request within 30 days.`
          },
          {
            title: '7. Children\'s Privacy',
            content: `ZoveAI is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.`
          },
          {
            title: '8. Changes to This Policy',
            content: `We may update this privacy policy from time to time. We will notify registered users of significant changes by email. Your continued use of ZoveAI after changes are made constitutes acceptance of the updated policy.`
          },
          {
            title: '9. Contact',
            content: `For privacy-related questions or requests, contact us at privacy@zoveai.com. For general inquiries, visit zoveai.com.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 400, color: '#D4854A', marginBottom: '12px' }}>{section.title}</h2>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
