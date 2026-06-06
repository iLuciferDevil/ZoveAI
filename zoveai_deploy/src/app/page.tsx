'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { firebaseAuth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

// ── Types ──────────────────────────────────────────────────────────────────
interface RiskMeter {
  road_quality: number; medical_access: number; mobile_signal: number;
  weather_risk: number; solo_female_safety: number; crowd_level: number;
  overall_risk: number; risk_notes: string;
}
interface Destination {
  name: string; country: string; region: string; tagline: string;
  hero_image_query: string; why_recommended: string; best_for: string[];
  travel_from_origin: { origin: string; by_road: string; by_train: string; by_flight: string; recommended_mode: string; recommended_reason: string; };
  estimated_cost: { budget_per_day: string; total_trip_estimate: string; currency_note: string };
  best_time: string; duration_ideal: string;
  suitability_scores: Record<string, number>;
  risk_meter: RiskMeter;
  reality_check: string[];
  day_sketch: { day: number; title: string; highlight: string }[];
  booking: { flight_origin: string; flight_destination: string; train_from: string; train_to: string; hotel_city: string };
  bookingContext?: { origin: string; startDate: string; endDate: string; days: string };
}
interface Result { interpretation: string; destinations: Destination[]; }

// ── Background images ──────────────────────────────────────────────────────
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920&q=80&fit=crop',
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1920&q=80&fit=crop',
];

// ── Constants ──────────────────────────────────────────────────────────────
const COMPANIONS = [
  { value: 'Solo', icon: '🧍', label: 'Just me', sub: 'Solo adventure' },
  { value: 'Couple', icon: '💑', label: 'My partner', sub: 'Couple escape' },
  { value: 'Friends', icon: '👯', label: 'Friends', sub: 'Squad trip' },
  { value: 'Family with kids', icon: '👨‍👩‍👧', label: 'Family', sub: 'Kids in tow' },
  { value: 'With parents', icon: '👴', label: 'Parents', sub: 'Family retreat' },
  { value: 'Group', icon: '👥', label: 'Group', sub: '6+ people' },
];
const TRANSPORTS = [
  { value: 'car', icon: '🚗', label: 'Road Trip', sub: 'Self-drive' },
  { value: 'motorcycle', icon: '🏍', label: 'Bike', sub: 'Open roads' },
  { value: 'train', icon: '🚆', label: 'Train', sub: 'Rail journey' },
  { value: 'flight', icon: '✈', label: 'Flight', sub: 'Fly there' },
  { value: 'bus', icon: '🚌', label: 'Bus', sub: 'Budget travel' },
  { value: 'any', icon: '🗺', label: 'Best way', sub: 'AI decides' },
];
const BUDGET_TIERS = [
  { value: 'budget', emoji: '🎒', label: 'Budget', desc: 'Under ₹2K/day' },
  { value: 'comfortable', emoji: '💰', label: 'Comfortable', desc: '₹2–5K/day' },
  { value: 'premium', emoji: '✨', label: 'Premium', desc: '₹5–12K/day' },
  { value: 'luxury', emoji: '💎', label: 'Luxury', desc: '₹12–25K/day' },
  { value: 'ultraluxury', emoji: '👑', label: 'Ultra Luxury', desc: '₹25K+/day' },
];
const SURPRISE_PROMPTS = [
  { icon: '🏔', text: 'Take me somewhere cold and quiet' },
  { icon: '🌊', text: 'I need to hear the ocean' },
  { icon: '🛕', text: 'Something spiritual and ancient' },
  { icon: '🌲', text: 'Deep forest, no phone signal' },
  { icon: '🎒', text: 'Offbeat — where tourists don\'t go' },
  { icon: '🍜', text: 'A food journey I\'ll never forget' },
  { icon: '🏍', text: 'Epic roads for a bike trip' },
  { icon: '⭐', text: 'Surprise me completely' },
];
const VIBE_FILTERS = [
  { value: 'mountains', icon: '🏔', label: 'Mountains' },
  { value: 'beaches', icon: '🏖', label: 'Beaches' },
  { value: 'cities', icon: '🏙', label: 'Cities' },
  { value: 'villages', icon: '🏘', label: 'Villages' },
  { value: 'hidden gems', icon: '💎', label: 'Hidden Gems' },
  { value: 'spiritual', icon: '🛕', label: 'Spiritual' },
  { value: 'adventure', icon: '🧗', label: 'Adventure' },
  { value: 'food', icon: '🍜', label: 'Food & Culture' },
  { value: 'nature', icon: '🌿', label: 'Nature' },
  { value: 'winter', icon: '❄️', label: 'Snow & Winter' },
];

// ── Risk color helper ───────────────────────────────────────────────────────
function riskColor(score: number): string {
  if (score <= 3) return '#4CAF50';
  if (score <= 6) return '#FF9800';
  return '#F44336';
}
function riskLabel(score: number): string {
  if (score <= 3) return 'Low Risk';
  if (score <= 6) return 'Moderate';
  return 'High Risk';
}

// ── Booking URLs ────────────────────────────────────────────────────────────
function buildBookingUrls(dest: Destination) {
  const ctx = dest.bookingContext;
  const b = dest.booking;
  const dep = ctx?.startDate?.replace(/-/g, '') || '';
  const ret = ctx?.endDate?.replace(/-/g, '') || '';
  return {
    flights: `https://www.skyscanner.net/transport/flights/${encodeURIComponent(b?.flight_origin || ctx?.origin || '')}/${encodeURIComponent(b?.flight_destination || dest.name)}/${dep}/${ret}/`,
    hotels: `https://www.booking.com/search.html?ss=${encodeURIComponent(b?.hotel_city || dest.name)}&checkin=${ctx?.startDate || ''}&checkout=${ctx?.endDate || ''}`,
    trains: `https://www.irctc.co.in/nget/train-search?from=${encodeURIComponent(b?.train_from || '')}&to=${encodeURIComponent(b?.train_to || dest.name)}&journeyDate=${ctx?.startDate || ''}`,
    route: `https://www.rome2rio.com/s/${encodeURIComponent(ctx?.origin || '')}/${encodeURIComponent(dest.name)}`,
    activities: `https://www.viator.com/search/${encodeURIComponent(dest.name)}`,
  };
}

// ── Score bar ───────────────────────────────────────────────────────────────
function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? '#7A9E82' : score >= 6 ? '#D4854A' : 'rgba(255,255,255,0.25)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', width: '100px', flexShrink: 0, textTransform: 'capitalize' }}>{label.replace('_', ' ')}</span>
      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${score * 10}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 1s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 500, color, width: '18px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

// ── Risk Meter Component ────────────────────────────────────────────────────
function RiskMeterDisplay({ risk }: { risk: RiskMeter }) {
  const overall = risk.overall_risk;
  const color = riskColor(overall);
  const label = riskLabel(overall);
  const riskItems = [
    { key: 'road_quality', label: 'Road Quality', invert: true },
    { key: 'medical_access', label: 'Medical Access', invert: true },
    { key: 'mobile_signal', label: 'Mobile Signal', invert: true },
    { key: 'weather_risk', label: 'Weather Risk', invert: false },
    { key: 'solo_female_safety', label: 'Solo Female Safety', invert: true },
    { key: 'crowd_level', label: 'Crowd Level', invert: false },
  ];

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk Meter</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>({overall}/10)</span>
        </div>
      </div>

      {/* Overall risk bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ width: `${overall * 10}%`, height: '100%', background: `linear-gradient(90deg, #4CAF50, ${color})`, borderRadius: '99px', transition: 'width 1s' }} />
        </div>
      </div>

      {/* Individual risk scores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
        {riskItems.map(item => {
          const rawScore = (risk as any)[item.key] as number;
          const displayScore = item.invert ? 11 - rawScore : rawScore;
          const itemColor = riskColor(item.invert ? rawScore : rawScore);
          return (
            <div key={item.key} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${displayScore * 10}%`, height: '100%', background: itemColor, borderRadius: '99px' }} />
                </div>
                <span style={{ fontSize: '10px', color: itemColor, fontWeight: 600, width: '24px', textAlign: 'right' }}>
                  {item.invert ? (rawScore <= 3 ? '✓' : rawScore <= 6 ? '~' : '!') : (rawScore <= 3 ? '✓' : rawScore <= 6 ? '~' : '!')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {risk.risk_notes && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', padding: '8px 12px', background: `rgba(${overall > 6 ? '244,67,54' : overall > 3 ? '255,152,0' : '76,175,80'},0.08)`, borderRadius: '8px', borderLeft: `2px solid ${color}`, lineHeight: 1.5 }}>
          {risk.risk_notes}
        </div>
      )}
    </div>
  );
}

// ── Destination Card ────────────────────────────────────────────────────────
function DestinationCard({ dest, index, isUnlocked, onUnlock }: {
  dest: Destination; index: number; isUnlocked: boolean; onUnlock: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const seed = dest.name.split('').reduce((a, c) => a + c.charCodeAt(0), index * 137 + 500);
  const imgUrl = `https://picsum.photos/seed/${seed}/900/600`;
  const urls = buildBookingUrls(dest);
  const tfo = dest.travel_from_origin;
  const overall = dest.risk_meter?.overall_risk || 5;
  const rColor = riskColor(overall);

  return (
    <div style={{ background: 'rgba(15,18,16,0.88)', backdropFilter: 'blur(20px)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.3s, box-shadow 0.3s', animation: `scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) ${(index % 3) * 0.15}s both` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 24px 60px rgba(0,0,0,0.6)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {/* Hero */}
      <div style={{ position: 'relative', height: '220px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}
        <img src={imgUrl} alt={dest.name} onLoad={() => setImgLoaded(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.5s' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,15,14,0.95) 0%, rgba(13,15,14,0.2) 55%, transparent 100%)' }} />
        {/* Risk badge on hero */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', borderRadius: '99px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px', border: `1px solid ${rColor}40` }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: rColor, boxShadow: `0 0 4px ${rColor}` }} />
          <span style={{ fontSize: '10px', fontWeight: 600, color: rColor }}>{riskLabel(overall)}</span>
        </div>
        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderRadius: '99px', padding: '4px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {dest.country} · {dest.region}
        </div>
        <div style={{ position: 'absolute', bottom: '16px', left: '18px', right: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
            {dest.best_for.slice(0, 3).map((tag, i) => (
              <span key={i} style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '10px', background: 'rgba(212,133,74,0.25)', color: '#E8A46A', border: '1px solid rgba(212,133,74,0.35)' }}>{tag}</span>
            ))}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>{dest.name}</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', fontStyle: 'italic' }}>{dest.tagline}</p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '16px' }}>{dest.why_recommended}</p>

        {tfo && (
          <div style={{ background: 'rgba(122,158,130,0.1)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', border: '1px solid rgba(122,158,130,0.2)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A9E82', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>From {tfo.origin}</div>
            {[{ i: '🚗', t: tfo.by_road }, { i: '🚆', t: tfo.by_train }, { i: '✈', t: tfo.by_flight }]
              .filter(r => r.t && r.t !== 'N/A' && !r.t.toLowerCase().includes('no direct') && !r.t.toLowerCase().includes('no nearby'))
              .slice(0, 2).map((r, i) => <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}><span>{r.i}</span><span>{r.t}</span></div>)}
            {tfo.recommended_reason && <div style={{ marginTop: '7px', fontSize: '12px', color: '#7A9E82', fontWeight: 500 }}>✓ {tfo.recommended_reason}</div>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[{ l: 'Best time', v: dest.best_time, i: '🗓' }, { l: 'Duration', v: dest.duration_ideal, i: '⏱' }, { l: 'Per day', v: dest.estimated_cost.budget_per_day, i: '💰' }].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '14px', marginBottom: '3px' }}>{s.i}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>{s.l}</div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#F5F0E8' }}>{s.v}</div>
            </div>
          ))}
        </div>

        {!isUnlocked ? (
          <div style={{ position: 'relative' }}>
            <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.35 }}>
              {dest.risk_meter && <RiskMeterDisplay risk={dest.risk_meter} />}
              {Object.entries(dest.suitability_scores).slice(0, 3).map(([k, v]) => <ScoreBar key={k} label={k} score={v} />)}
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button onClick={onUnlock} style={{ background: 'linear-gradient(135deg, #D4854A, #E8A46A)', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px 26px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 8px 30px rgba(212,133,74,0.35)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔓 Unlock full details — free
              </button>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Risk meter · Suitability · Reality check · Booking</p>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            {dest.risk_meter && <RiskMeterDisplay risk={dest.risk_meter} />}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Suitability</div>
              {Object.entries(dest.suitability_scores).map(([k, v]) => <ScoreBar key={k} label={k} score={v} />)}
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#D4854A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>⚠ Reality Check</div>
              {dest.reality_check.map((w, i) => <div key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', padding: '8px 12px', background: 'rgba(212,133,74,0.07)', borderRadius: '8px', marginBottom: '5px', borderLeft: '2px solid #D4854A', lineHeight: 1.5 }}>{w}</div>)}
            </div>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Day by Day</div>
              {dest.day_sketch.map((day, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #D4854A, #E8A46A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>{day.day}</div>
                  <div><div style={{ fontSize: '12px', fontWeight: 500, color: '#F5F0E8' }}>{day.title}</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{day.highlight}</div></div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Trip Estimate</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#C9A96E' }}>{dest.estimated_cost.total_trip_estimate}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{dest.estimated_cost.currency_note}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: '✈ Flights', url: urls.flights, sub: dest.bookingContext?.origin ? `from ${dest.bookingContext.origin}` : '' },
                { label: '🏨 Hotels', url: urls.hotels, sub: dest.bookingContext?.startDate || '' },
                { label: '🚆 IRCTC', url: urls.trains, sub: 'Book train' },
                { label: '🗺 Route', url: urls.route, sub: 'All options' },
                { label: '🎭 Activities', url: urls.activities, sub: `in ${dest.name}`, full: true },
              ].map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', textDecoration: 'none', transition: 'all 0.2s', gridColumn: (link as any).full ? 'span 2' : 'span 1' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,133,74,0.12)'; e.currentTarget.style.borderColor = 'rgba(212,133,74,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#E8A46A' }}>{link.label}</div>
                  {link.sub && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{link.sub}</div>}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Auth Modal with Firebase Phone OTP ─────────────────────────────────────
function AuthModal({ onClose, pendingUnlock, onGoogleSignIn }: { onClose: () => void; pendingUnlock: number | null; onGoogleSignIn: () => void }) {
  const [tab, setTab] = useState<'google' | 'email' | 'phone'>('google');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const recaptchaRef = useRef<HTMLDivElement>(null);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s',
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: active ? '#F5F0E8' : 'rgba(255,255,255,0.4)',
  });

  const sendOTP = async () => {
    if (phone.length !== 10) return;
    setLoading(true); setError('');
    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber(firebaseAuth, `+91${phone}`, (window as any).recaptchaVerifier);
      setConfirmResult(result);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  const verifyOTP = async () => {
    if (!confirmResult || otp.length !== 6) return;
    setLoading(true); setError('');
    try {
      await confirmResult.confirm(otp);
      onClose();
    } catch (e: any) {
      setError('Invalid OTP. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div id="recaptcha-container" ref={recaptchaRef} />
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(18,22,18,0.97)', backdropFilter: 'blur(24px)', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.12)', animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '24px', lineHeight: 1 }}>×</button>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: '#D4854A', marginBottom: '8px' }}>✦</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 400, color: '#F5F0E8', marginBottom: '8px' }}>Join ZoveAI</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>Free forever. Unlock full details, save trips, and get smarter recommendations.</p>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
          <button style={tabStyle(tab === 'google')} onClick={() => setTab('google')}>Google</button>
          <button style={tabStyle(tab === 'email')} onClick={() => setTab('email')}>Email</button>
          <button style={tabStyle(tab === 'phone')} onClick={() => setTab('phone')}>Phone</button>
        </div>

        {tab === 'google' && (
          <button onClick={() => { onGoogleSignIn(); setLoading(true); signIn('google', { callbackUrl: window.location.href }); }} disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', color: '#F5F0E8', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {loading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        )}

        {tab === 'email' && (
          <div>
            {!sent ? (
              <>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', fontSize: '14px', fontFamily: 'var(--font-body)', color: '#F5F0E8', outline: 'none', marginBottom: '10px' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(212,133,74,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
                <button onClick={() => email && setSent(true)} disabled={!email}
                  style={{ width: '100%', padding: '13px', borderRadius: '12px', background: email ? 'linear-gradient(135deg, #D4854A, #E8A46A)' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: email ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
                  Send magic link
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📧</div>
                <p style={{ color: '#F5F0E8', fontWeight: 500, marginBottom: '6px' }}>Check your inbox</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Magic link sent to <strong style={{ color: '#E8A46A' }}>{email}</strong></p>
                <button onClick={() => setSent(false)} style={{ marginTop: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)' }}>Use different email</button>
              </div>
            )}
          </div>
        )}

        {tab === 'phone' && (
          <div>
            {error && <div style={{ fontSize: '12px', color: '#F44336', marginBottom: '10px', padding: '8px 12px', background: 'rgba(244,67,54,0.1)', borderRadius: '8px' }}>{error}</div>}
            {!sent ? (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ padding: '13px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#F5F0E8', fontSize: '14px', whiteSpace: 'nowrap' }}>🇮🇳 +91</div>
                  <input type="tel" placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ flex: 1, padding: '13px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', fontSize: '14px', fontFamily: 'var(--font-body)', color: '#F5F0E8', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(212,133,74,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                  />
                </div>
                <button onClick={sendOTP} disabled={phone.length !== 10 || loading}
                  style={{ width: '100%', padding: '13px', borderRadius: '12px', background: phone.length === 10 && !loading ? 'linear-gradient(135deg, #D4854A, #E8A46A)' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: phone.length === 10 && !loading ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '10px' }}>India numbers only · OTP valid for 10 minutes</p>
              </>
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱</div>
                  <p style={{ color: '#F5F0E8', fontWeight: 500, marginBottom: '4px' }}>Enter OTP</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Sent to +91 {phone}</p>
                </div>
                <input type="text" placeholder="• • • • • •" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', fontSize: '24px', fontFamily: 'monospace', color: '#F5F0E8', outline: 'none', textAlign: 'center', letterSpacing: '12px', marginBottom: '10px' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(212,133,74,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
                <button onClick={verifyOTP} disabled={otp.length !== 6 || loading}
                  style={{ width: '100%', padding: '13px', borderRadius: '12px', background: otp.length === 6 ? 'linear-gradient(135deg, #D4854A, #E8A46A)' : 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', cursor: otp.length === 6 ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 500, fontFamily: 'var(--font-body)', marginBottom: '8px' }}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button onClick={() => { setSent(false); setOtp(''); setError(''); }} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-body)', padding: '6px' }}>← Change number</button>
              </div>
            )}
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '18px' }}>No credit card · No spam · Free forever</p>
      </div>
    </div>
  );
}

// ── Background ──────────────────────────────────────────────────────────────
function TravelBackground({ currentBg }: { currentBg: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      {BG_IMAGES.map((url, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === currentBg ? 1 : 0, transition: 'opacity 2s ease' }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.65) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [wizardStep, setWizardStep] = useState(0);
  const [pageMode, setPageMode] = useState<'wizard' | 'results'>('wizard');

  const [origin, setOrigin] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('');
  const [companions, setCompanions] = useState('');
  const [transport, setTransport] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [error, setError] = useState('');
  const [unlockedCards, setUnlockedCards] = useState<Set<number>>(new Set());
  const [pendingUnlock, setPendingUnlock] = useState<number | null>(null);
  const [showVibeFilters, setShowVibeFilters] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<any>(null);

  const originRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentBg(b => (b + 1) % BG_IMAGES.length), 7000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const diff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
      if (diff > 0) setDays(String(diff));
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (session && pendingUnlock !== null) {
      setUnlockedCards(prev => new Set([...prev, pendingUnlock]));
      setPendingUnlock(null);
      setShowAuth(false);
    }
  }, [session, pendingUnlock]);

  const detectLocation = useCallback(() => {
    setLocationLoading(true);
    if (!navigator.geolocation) { setLocationLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          setOrigin(data.address?.city || data.address?.town || data.address?.state || 'India');
        } catch { setOrigin('India'); }
        finally { setLocationLoading(false); }
      },
      () => setLocationLoading(false)
    );
  }, []);

  useEffect(() => {
    detectLocation();
    setTimeout(() => originRef.current?.focus(), 600);
  }, []);

  // Restore full state after Google auth redirect
  useEffect(() => {
    if (session) {
      try {
        const saved = sessionStorage.getItem('zove_restore');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.origin) setOrigin(s.origin);
          if (s.startDate) setStartDate(s.startDate);
          if (s.endDate) setEndDate(s.endDate);
          if (s.days) setDays(s.days);
          if (s.companions) setCompanions(s.companions);
          if (s.transport) setTransport(s.transport);
          if (s.budget) setBudget(s.budget);
          if (s.notes) setNotes(s.notes);
          if (s.wizardStep !== undefined) setWizardStep(s.wizardStep);
          if (s.pageMode) setPageMode(s.pageMode);
          if (s.interpretation) setInterpretation(s.interpretation);
          if (s.allDestinations?.length) {
            setAllDestinations(s.allDestinations);
            // Unlock the card they were trying to unlock
            if (s.pendingUnlock !== null && s.pendingUnlock !== undefined) {
              setUnlockedCards(new Set([s.pendingUnlock]));
            }
          }
          sessionStorage.removeItem('zove_restore');
        }
      } catch {}
    }
  }, [session]);

  const buildSearchParams = useCallback(() => {
    const budgetTier = BUDGET_TIERS.find(t => t.value === budget);
    return {
      origin: origin || 'India',
      startDate, endDate, days, companions, transport,
      budget: budgetTier?.desc || budget,
      currency: '₹',
    };
  }, [origin, startDate, endDate, days, companions, transport, budget]);

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    setLoading(true); setError('');
    setAllDestinations([]); setUnlockedCards(new Set());
    setPageMode('results'); setShowVibeFilters(false);
    const params = buildSearchParams();
    setSearchParams(params);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: overrideQuery || notes || `Find me a perfect trip from ${origin}`,
          structured: params,
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setAllDestinations(data.destinations || []); setInterpretation(data.interpretation || ''); }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }, [origin, notes, buildSearchParams]);

  const handleShowMore = useCallback(async () => {
    setLoadingMore(true);
    const excluded = allDestinations.map(d => d.name);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: notes || `More destinations from ${origin}`,
          structured: searchParams,
          vibes: selectedVibes,
          exclude: excluded,
        }),
      });
      const data = await res.json();
      if (data.destinations) setAllDestinations(prev => [...prev, ...data.destinations]);
    } catch { }
    finally { setLoadingMore(false); setShowVibeFilters(false); }
  }, [allDestinations, searchParams, selectedVibes, notes, origin]);

  const saveStateForAuth = useCallback(() => {
    try {
      sessionStorage.setItem('zove_restore', JSON.stringify({
        origin, startDate, endDate, days, companions, transport, budget, notes,
        wizardStep, pageMode, pendingUnlock, allDestinations, interpretation,
      }));
    } catch {}
  }, [origin, startDate, endDate, days, companions, transport, budget, notes, wizardStep, pageMode, pendingUnlock, allDestinations, interpretation]);

  const handleUnlock = (i: number) => {
    if (session) setUnlockedCards(prev => new Set([...prev, i]));
    else { setPendingUnlock(i); setShowAuth(true); }
  };

  const toggleVibe = (v: string) => setSelectedVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  // ── Shared styles ──
  const glassCard: React.CSSProperties = { background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)', padding: '32px' };
  const labelStyle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 400, color: '#FFFFFF', lineHeight: 1.15, marginBottom: '28px', letterSpacing: '-0.01em', textShadow: '0 2px 20px rgba(0,0,0,0.5)' };
  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '16px 20px', fontSize: '16px', fontFamily: 'var(--font-body)', color: '#FFFFFF', outline: 'none', transition: 'border-color 0.2s, background 0.2s', backdropFilter: 'blur(10px)' };
  const nextBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #D4854A, #E8A46A)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 8px 24px rgba(212,133,74,0.35)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' };
  const backBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '13px 20px', fontSize: '13px', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' };
  const skipBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', padding: '10px 16px' };
  const optCard = (sel: boolean): React.CSSProperties => ({ padding: '20px 14px', borderRadius: '16px', cursor: 'pointer', border: 'none', borderTop: `2px solid ${sel ? '#D4854A' : 'transparent'}`, background: sel ? 'rgba(212,133,74,0.2)' : 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', color: sel ? '#F5F0E8' : 'rgba(255,255,255,0.75)', transition: 'all 0.2s', textAlign: 'center' as const, fontFamily: 'var(--font-body)', boxShadow: sel ? '0 0 0 1px rgba(212,133,74,0.4)' : 'none' });

  const Nav = ({ showBack = false }) => (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: '58px' }}>
      <button onClick={() => { setPageMode('wizard'); setAllDestinations([]); setWizardStep(0); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="rgba(122,158,130,0.2)" stroke="rgba(122,158,130,0.4)" strokeWidth="1"/><path d="M9 20 L16 10 L23 20" stroke="#7A9E82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="16" cy="10" r="1.8" fill="#D4854A"/></svg>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>ZoveAI</span>
      </button>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {showBack && <button onClick={() => { setPageMode('wizard'); setAllDestinations([]); setWizardStep(0); }} style={{ ...backBtn, padding: '7px 14px', fontSize: '12px' }}>← New search</button>}
        {session ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {session.user?.image && <img src={session.user.image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #7A9E82' }} />}
            <button onClick={() => signOut()} style={{ ...backBtn, padding: '5px 12px', fontSize: '12px' }}>Sign out</button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-body)' }}>Sign in</button>
            <button onClick={() => setShowAuth(true)} style={{ ...nextBtn, padding: '8px 18px', fontSize: '13px' }}>Get started</button>
          </>
        )}
      </div>
    </nav>
  );

  // ── RESULTS ──
  if (pageMode === 'results') return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} pendingUnlock={pendingUnlock} onGoogleSignIn={saveStateForAuth} />}
      <TravelBackground currentBg={currentBg} />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <Nav showBack />
        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '78px 24px 60px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {[origin && `📍 ${origin}`, companions, transport && TRANSPORTS.find(t => t.value === transport)?.label, days && `${days} days`, budget && BUDGET_TIERS.find(t => t.value === budget)?.label].filter(Boolean).map((tag, i) => (
              <span key={i} style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '99px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{tag}</span>
            ))}
          </div>

          {interpretation && (
            <div style={{ ...glassCard, marginBottom: '24px', display: 'flex', gap: '14px', animation: 'fadeUp 0.5s ease', padding: '18px 22px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #D4854A, #E8A46A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✦</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>ZoveAI</div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontStyle: 'italic' }}>"{interpretation}"</p>
              </div>
            </div>
          )}

          {/* Cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '22px' }}>
            {loading ? [0,1,2].map(i => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', animation: `fadeUp 0.5s ease ${i * 0.1}s both` }}>
                <div className="skeleton" style={{ height: '220px', borderRadius: 0 }} />
                <div style={{ padding: '20px' }}>
                  {[['50%','12px'],['100%','11px'],['75%','11px']].map(([w,h],j) => <div key={j} className="skeleton" style={{ height: h, width: w, marginBottom: '8px' }} />)}
                  <div className="skeleton" style={{ height: '80px', marginTop: '12px', borderRadius: '12px' }} />
                </div>
              </div>
            )) : allDestinations.map((dest, i) => (
              <DestinationCard key={`${dest.name}-${i}`} dest={dest} index={i} isUnlocked={!!session || unlockedCards.has(i)} onUnlock={() => handleUnlock(i)} />
            ))}
            {/* Loading more skeletons */}
            {loadingMore && [0,1,2].map(i => (
              <div key={`more-${i}`} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', animation: `fadeUp 0.5s ease ${i * 0.1}s both` }}>
                <div className="skeleton" style={{ height: '220px', borderRadius: 0 }} />
                <div style={{ padding: '20px' }}>
                  {[['50%','12px'],['100%','11px'],['75%','11px']].map(([w,h],j) => <div key={j} className="skeleton" style={{ height: h, width: w, marginBottom: '8px' }} />)}
                </div>
              </div>
            ))}
          </div>

          {/* Show More section */}
          {!loading && allDestinations.length > 0 && (
            <div style={{ marginTop: '40px', textAlign: 'center' }}>
              {!showVibeFilters ? (
                <button onClick={() => setShowVibeFilters(true)}
                  style={{ ...nextBtn, padding: '16px 36px', fontSize: '15px', boxShadow: '0 10px 36px rgba(212,133,74,0.3)' }}>
                  ✦ Show me more destinations
                </button>
              ) : (
                <div style={{ ...glassCard, textAlign: 'left', maxWidth: '700px', margin: '0 auto' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 400, color: '#fff', marginBottom: '6px' }}>What kind of place are you looking for?</h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>Pick one or more vibes and we'll find better matches.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                    {VIBE_FILTERS.map(v => (
                      <button key={v.value} onClick={() => toggleVibe(v.value)}
                        style={{ padding: '8px 16px', borderRadius: '99px', border: `1px solid ${selectedVibes.includes(v.value) ? '#D4854A' : 'rgba(255,255,255,0.15)'}`, background: selectedVibes.includes(v.value) ? 'rgba(212,133,74,0.2)' : 'rgba(255,255,255,0.06)', color: selectedVibes.includes(v.value) ? '#E8A46A' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{v.icon}</span> {v.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleShowMore} disabled={loadingMore}
                      style={{ ...nextBtn, opacity: loadingMore ? 0.7 : 1 }}>
                      {loadingMore ? 'Finding...' : '✦ Find more destinations'}
                    </button>
                    <button onClick={() => { setShowVibeFilters(false); setSelectedVibes([]); }} style={skipBtn}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ ...glassCard, marginTop: '20px', color: '#E8A46A', fontSize: '14px' }}>{error}</div>}
        </div>
      </div>
    </>
  );

  // ── WIZARD ──
  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} pendingUnlock={pendingUnlock} onGoogleSignIn={saveStateForAuth} />}
      <TravelBackground currentBg={currentBg} />
      <Nav />

      {/* Progress dots */}
      <div style={{ position: 'fixed', top: '68px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', gap: '6px' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ width: i === wizardStep ? '22px' : '6px', height: '6px', borderRadius: '99px', background: i === wizardStep ? '#D4854A' : i < wizardStep ? 'rgba(212,133,74,0.5)' : 'rgba(255,255,255,0.2)', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)' }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 60px' }}>
        <div style={{ width: '100%', maxWidth: '620px' }}>

          {wizardStep === 0 && (
            <div style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '99px', background: 'rgba(122,158,130,0.2)', border: '1px solid rgba(122,158,130,0.3)', fontSize: '11px', fontWeight: 500, color: '#7A9E82', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '20px', backdropFilter: 'blur(10px)' }}>
                  ✦ AI-Powered Travel Discovery
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(46px, 9vw, 80px)', fontWeight: 300, lineHeight: 1.05, color: '#fff', letterSpacing: '-0.02em', marginBottom: '14px', textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}>
                  Where should<br /><em style={{ color: '#E8A46A' }}>you go next?</em>
                </h1>
                <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, fontWeight: 300, textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
                  Not a booking site. An AI that knows you<br />and gives <em>honest</em> recommendations.
                </p>
              </div>

              <div style={glassCard}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Where are you travelling from?</p>
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input ref={originRef} type="text" placeholder="Delhi, Mumbai, Bangalore..." value={origin} onChange={e => setOrigin(e.target.value)} onKeyDown={e => e.key === 'Enter' && origin.trim() && setWizardStep(1)}
                    style={{ ...inputStyle, width: '100%', paddingRight: '50px' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(212,133,74,0.6)'; e.target.style.background = 'rgba(255,255,255,0.16)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
                  />
                  <button onClick={detectLocation} disabled={locationLoading} title="Detect my location"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', opacity: locationLoading ? 0.5 : 1 }}>
                    {locationLoading ? '⏳' : '📍'}
                  </button>
                </div>
                {origin && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>📍 <strong style={{ color: '#E8A46A' }}>{origin}</strong> — <button onClick={() => setOrigin('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: 'var(--font-body)' }}>change</button></p>}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button onClick={() => origin.trim() && setWizardStep(1)} disabled={!origin.trim()} style={{ ...nextBtn, opacity: origin.trim() ? 1 : 0.4 }}>Continue →</button>
                  <button onClick={() => { setOrigin('India'); setWizardStep(1); }} style={skipBtn}>Skip</button>
                </div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or get inspired</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                  {SURPRISE_PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => { if (!origin) setOrigin('India'); handleSearch(p.text); }}
                      style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,133,74,0.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,133,74,0.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.4)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    >
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>{p.icon}</span>
                      <span style={{ lineHeight: 1.4 }}>{p.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)', ...glassCard }}>
              <p style={labelStyle}>When are you going?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                {[{ label: 'Start date', val: startDate, set: setStartDate }, { label: 'End date', val: endDate, set: setEndDate }].map((d, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{d.label}</div>
                    <input type="date" value={d.val} onChange={e => d.set(e.target.value)} style={{ ...inputStyle, width: '100%', colorScheme: 'dark' }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(212,133,74,0.6)'; e.target.style.background = 'rgba(255,255,255,0.16)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
                    />
                  </div>
                ))}
              </div>
              {days && <p style={{ fontSize: '14px', color: '#E8A46A', marginBottom: '20px', fontWeight: 500 }}>✦ {days} days</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>
                <button onClick={() => setWizardStep(0)} style={backBtn}>← Back</button>
                <button onClick={() => setWizardStep(2)} style={nextBtn}>Continue →</button>
                <button onClick={() => setWizardStep(2)} style={skipBtn}>Skip</button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
              <p style={{ ...labelStyle, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>Who's coming with you?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {COMPANIONS.map(c => (
                  <button key={c.value} onClick={() => setCompanions(companions === c.value ? '' : c.value)} style={optCard(companions === c.value)}>
                    <div style={{ fontSize: '30px', marginBottom: '8px' }}>{c.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.label}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '3px' }}>{c.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setWizardStep(1)} style={backBtn}>← Back</button>
                <button onClick={() => setWizardStep(3)} style={nextBtn}>{companions ? 'Continue →' : 'Skip →'}</button>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
              <p style={{ ...labelStyle, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>How do you want to travel?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {TRANSPORTS.map(t => (
                  <button key={t.value} onClick={() => setTransport(transport === t.value ? '' : t.value)} style={optCard(transport === t.value)}>
                    <div style={{ fontSize: '30px', marginBottom: '8px' }}>{t.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '3px' }}>{t.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setWizardStep(2)} style={backBtn}>← Back</button>
                <button onClick={() => setWizardStep(4)} style={nextBtn}>{transport ? 'Continue →' : 'Skip →'}</button>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
              <p style={{ ...labelStyle, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>What's your budget?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '28px' }}>
                {BUDGET_TIERS.map(t => (
                  <button key={t.value} onClick={() => setBudget(budget === t.value ? '' : t.value)} style={optCard(budget === t.value)}>
                    <div style={{ fontSize: '26px', marginBottom: '8px' }}>{t.emoji}</div>
                    <div style={{ fontWeight: 600, fontSize: '12px' }}>{t.label}</div>
                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '3px' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setWizardStep(3)} style={backBtn}>← Back</button>
                <button onClick={() => setWizardStep(5)} style={nextBtn}>{budget ? 'Continue →' : 'Skip →'}</button>
              </div>
            </div>
          )}

          {wizardStep === 5 && (
            <div style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)', ...glassCard }}>
              <p style={{ ...labelStyle, fontSize: 'clamp(24px, 4vw, 40px)' }}>Anything else we should know?</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginBottom: '18px', lineHeight: 1.6 }}>Special needs, places to avoid, vibes you want — or just hit search.</p>
              <textarea placeholder="e.g. My parents can't trek. Love local food. Avoid crowded tourist spots. Need good roads for the bike..." value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                style={{ ...inputStyle, width: '100%', resize: 'none', lineHeight: 1.6, marginBottom: '20px' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(212,133,74,0.6)'; e.target.style.background = 'rgba(255,255,255,0.16)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '22px' }}>
                {[origin && `📍 ${origin}`, days && `${days} days`, companions, transport && TRANSPORTS.find(t => t.value === transport)?.label, budget && BUDGET_TIERS.find(t => t.value === budget)?.label].filter(Boolean).map((tag, i) => (
                  <span key={i} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '99px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{tag}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setWizardStep(4)} style={backBtn}>← Back</button>
                <button onClick={() => handleSearch()} style={{ ...nextBtn, padding: '16px 36px', fontSize: '15px', boxShadow: '0 10px 36px rgba(212,133,74,0.35)' }}>
                  ✦ Find my destinations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginRight: '6px' }}>ZoveAI</span>· Free to use · No booking fees
      </div>
    </>
  );
}
