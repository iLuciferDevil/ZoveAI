'use client';
import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', color: '#F5F0E8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="rgba(122,158,130,0.2)" stroke="rgba(122,158,130,0.4)" strokeWidth="1"/><path d="M9 20 L16 10 L23 20" stroke="#7A9E82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="16" cy="10" r="1.8" fill="#D4854A"/></svg>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#F5F0E8' }}>ZoveAI</span>
        </Link>
        <Link href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Back to ZoveAI</Link>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '42px', fontWeight: 400, color: '#F5F0E8', marginBottom: '8px' }}>Terms of Service</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '48px' }}>Last updated: June 2026</p>

        {[
          { title: '1. Acceptance of Terms', content: `By accessing or using ZoveAI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. ZoveAI is operated by ZoveAI and is available at zoveai.com.` },
          { title: '2. Description of Service', content: `ZoveAI is an AI-powered travel discovery platform that provides personalized destination recommendations, trip planning assistance, and links to third-party booking services. ZoveAI is a discovery and planning tool — we do not sell travel products directly.` },
          { title: '3. AI-Generated Recommendations', content: `ZoveAI uses artificial intelligence to generate travel recommendations. While we strive for accuracy, AI-generated content may contain errors or outdated information. All recommendations including suitability scores, risk assessments, cost estimates, and travel times are indicative only.

You should independently verify all information before making travel decisions. ZoveAI is not responsible for decisions made based on AI-generated recommendations.` },
          { title: '4. Risk Information', content: `ZoveAI provides Risk Meter assessments for destinations. These are AI-estimated indicators and do not constitute professional safety advice. Travel conditions change rapidly. Always check current government travel advisories and local conditions before travelling.

ZoveAI is not liable for any harm, loss, or injury resulting from travel to destinations recommended by the Service.` },
          { title: '5. Third-Party Booking Links', content: `ZoveAI provides links to third-party booking platforms. These are separate services governed by their own terms and conditions. ZoveAI is not a party to any booking made through these links and is not responsible for the quality, accuracy, or reliability of third-party services.

ZoveAI may receive affiliate commissions from bookings made through our links at no additional cost to you.` },
          { title: '6. User Accounts', content: `You are responsible for maintaining the confidentiality of your account. You agree to notify us immediately of any unauthorized use of your account. ZoveAI reserves the right to terminate accounts that violate these terms.` },
          { title: '7. Prohibited Uses', content: `You may not use ZoveAI to scrape or harvest data, attempt to reverse engineer the recommendation system, submit false or misleading information, use the service for any illegal purpose, or attempt to gain unauthorized access to any part of the Service.` },
          { title: '8. Intellectual Property', content: `The ZoveAI name, logo, design, and AI recommendation system are owned by ZoveAI. You may not copy, reproduce, or create derivative works from any part of the Service without written permission.` },
          { title: '9. Limitation of Liability', content: `ZoveAI is provided "as is" without warranties of any kind. To the maximum extent permitted by law, ZoveAI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.` },
          { title: '10. Changes to Terms', content: `ZoveAI reserves the right to modify these terms at any time. We will notify users of material changes via email. Continued use of the Service after changes constitutes acceptance.` },
          { title: '11. Contact', content: `For questions about these Terms of Service, contact us at legal@zoveai.com.` },
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
