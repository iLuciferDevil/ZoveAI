'use client';
import React, { useState, useEffect, useRef } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

// ── Types ──────────────────────────────────────────────────────────────────
interface TravelFromOrigin {
  origin: string; by_road: string; by_train: string; by_flight: string;
  recommended_mode: string; recommended_reason: string;
}
interface Destination {
  name: string; country: string; region: string; tagline: string;
  hero_image_query: string; why_recommended: string; best_for: string[];
  travel_from_origin: TravelFromOrigin;
  estimated_cost: { budget_per_day: string; total_trip_estimate: string; currency_note: string };
  best_time: string; duration_ideal: string;
  suitability_scores: Record<string, number>;
  reality_check: string[];
  day_sketch: { day: number; title: string; highlight: string }[];
  booking: { flight_origin: string; flight_destination: string; train_from: string; train_to: string; hotel_city: string };
  bookingContext?: { origin: string; startDate: string; endDate: string; days: string };
}
interface Result { interpretation: string; destinations: Destination[]; }

// ── Constants ──────────────────────────────────────────────────────────────
const COMPANIONS = [
  { value: 'Solo', icon: '🧍', label: 'Solo' },
  { value: 'Couple', icon: '💑', label: 'Couple' },
  { value: 'Friends', icon: '👯', label: 'Friends' },
  { value: 'Family with kids', icon: '👨‍👩‍👧', label: 'Family' },
  { value: 'With parents', icon: '👴', label: 'Parents' },
  { value: 'Group', icon: '👥', label: 'Group' },
];

const TRANSPORTS = [
  { value: 'car', icon: '🚗', label: 'Road Trip' },
  { value: 'motorcycle', icon: '🏍', label: 'Bike' },
  { value: 'train', icon: '🚆', label: 'Train' },
  { value: 'flight', icon: '✈', label: 'Flight' },
  { value: 'bus', icon: '🚌', label: 'Bus' },
  { value: 'any', icon: '🗺', label: 'Best Way' },
];

const BUDGET_TIERS = [
  { value: 'budget', emoji: '🎒', label: 'Budget', desc: 'Under ₹2K/day' },
  { value: 'comfortable', emoji: '💰', label: 'Comfortable', desc: '₹2–5K/day' },
  { value: 'premium', emoji: '✨', label: 'Premium', desc: '₹5–12K/day' },
  { value: 'luxury', emoji: '💎', label: 'Luxury', desc: '₹12–25K/day' },
  { value: 'ultraluxury', emoji: '👑', label: 'Ultra Luxury', desc: '₹25K+/day' },
];

const SURPRISE_PROMPTS = [
  { icon: '🏔', text: 'Take me somewhere cold and quiet', vibe: 'mountain retreat' },
  { icon: '🌊', text: 'I need to hear the ocean', vibe: 'coastal escape' },
  { icon: '🛕', text: 'Something spiritual and ancient', vibe: 'cultural immersion' },
  { icon: '🌲', text: 'Deep forest, no phone signal', vibe: 'off-grid nature' },
  { icon: '🎒', text: 'Offbeat. Where tourists don\'t go', vibe: 'hidden gems' },
  { icon: '🍜', text: 'A food journey I\'ll never forget', vibe: 'culinary adventure' },
  { icon: '🏍', text: 'A bike trip with epic roads', vibe: 'motorcycle journey' },
  { icon: '⭐', text: 'Surprise me completely', vibe: 'wild card' },
];

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
  const color = score >= 8 ? '#6B8F71' : score >= 6 ? '#D4854A' : 'rgba(242,237,230,0.3)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '100px', flexShrink: 0, textTransform: 'capitalize' }}>{label.replace('_', ' ')}</span>
      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${score * 10}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 1s var(--ease-out)' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 500, color, width: '18px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

// ── Destination Card ────────────────────────────────────────────────────────
function DestinationCard({ dest, index, isUnlocked, onUnlock }: {
  dest: Destination; index: number; isUnlocked: boolean; onUnlock: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const seed = dest.name.split('').reduce((a, c) => a + c.charCodeAt(0), index * 137);
  const imgUrl = `https://picsum.photos/seed/${seed}/900/600`;
  const urls = buildBookingUrls(dest);
  const tfo = dest.travel_from_origin;

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      animation: `fadeUp 0.6s var(--ease-out) ${index * 0.15}s both`,
      transition: 'transform 0.3s var(--ease-out), box-shadow 0.3s ease',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.4)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      {/* Hero image */}
      <div style={{ position: 'relative', height: '220px', background: 'var(--surface2)', overflow: 'hidden' }}>
        {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}
        <img src={imgUrl} alt={dest.name} onLoad={() => setImgLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,15,0.9) 0%, rgba(10,12,15,0.2) 50%, transparent 100%)' }} />
        <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(10,12,15,0.7)', backdropFilter: 'blur(10px)', borderRadius: '99px', padding: '4px 12px', fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {dest.country} · {dest.region}
        </div>
        <div style={{ position: 'absolute', bottom: '16px', left: '18px', right: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
            {dest.best_for.slice(0, 3).map((tag, i) => (
              <span key={i} style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '10px', fontWeight: 500, background: 'rgba(212,133,74,0.2)', color: 'var(--amber-light)', border: '1px solid rgba(212,133,74,0.3)' }}>{tag}</span>
            ))}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 500, color: '#fff', lineHeight: 1.1 }}>{dest.name}</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', fontStyle: 'italic' }}>{dest.tagline}</p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '16px' }}>{dest.why_recommended}</p>

        {/* Travel from origin */}
        {tfo && (
          <div style={{ background: 'rgba(107,143,113,0.08)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', border: '1px solid rgba(107,143,113,0.15)' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              From {tfo.origin}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { icon: '🚗', text: tfo.by_road },
                { icon: '🚆', text: tfo.by_train },
                { icon: '✈', text: tfo.by_flight },
              ].filter(r => r.text && r.text !== 'N/A' && r.text !== 'No direct train' || false).slice(0, 2).map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ flexShrink: 0 }}>{r.icon}</span><span>{r.text}</span>
                </div>
              ))}
            </div>
            {tfo.recommended_mode && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--sage)', fontWeight: 500 }}>
                ✓ Best: {tfo.recommended_reason}
              </div>
            )}
          </div>
        )}

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Best time', value: dest.best_time, icon: '🗓' },
            { label: 'Duration', value: dest.duration_ideal, icon: '⏱' },
            { label: 'Per day', value: dest.estimated_cost.budget_per_day, icon: '💰' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '10px 10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '14px', marginBottom: '3px' }}>{s.icon}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px' }}>{s.label}</div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Gated content */}
        {!isUnlocked ? (
          <div style={{ position: 'relative' }}>
            <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
              {Object.entries(dest.suitability_scores).slice(0, 3).map(([k, v]) => <ScoreBar key={k} label={k} score={v} />)}
              <div style={{ fontSize: '12px', color: '#D4854A', padding: '8px 12px', background: 'rgba(212,133,74,0.08)', borderRadius: '8px', marginTop: '10px' }}>⚠ {dest.reality_check[0]}</div>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button onClick={onUnlock} style={{
                background: 'linear-gradient(135deg, var(--amber), var(--amber-light))',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '13px 26px', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                boxShadow: '0 8px 30px rgba(212,133,74,0.35)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                🔓 Unlock full details — free
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>Suitability · Reality check · Day plan · Booking</p>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Suitability</div>
              {Object.entries(dest.suitability_scores).map(([k, v]) => <ScoreBar key={k} label={k} score={v} />)}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>⚠ Reality Check</div>
              {dest.reality_check.map((w, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(212,133,74,0.06)', borderRadius: '8px', marginBottom: '5px', borderLeft: '2px solid var(--amber)', lineHeight: 1.5 }}>{w}</div>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Day by Day</div>
              {dest.day_sketch.map((day, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>{day.day}</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{day.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{day.highlight}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Trip Estimate</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gold)' }}>{dest.estimated_cost.total_trip_estimate}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{dest.estimated_cost.currency_note}</div>
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
                  style={{
                    display: 'block', padding: '9px 12px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: '10px', textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    gridColumn: (link as any).full ? 'span 2' : 'span 1',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,133,74,0.12)'; e.currentTarget.style.borderColor = 'rgba(212,133,74,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--amber-light)' }}>{link.label}</div>
                  {link.sub && <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '1px' }}>{link.sub}</div>}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Auth Modal ──────────────────────────────────────────────────────────────
function AuthModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'var(--surface)', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '400px', border: '1px solid var(--border2)', animation: 'slideIn 0.4s var(--ease-out)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '22px' }}>×</button>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✈</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 400, color: 'var(--text)', marginBottom: '8px' }}>Join ZoveAI</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Free forever. Unlock full details, save trips, and get smarter recommendations over time.</p>
        </div>
        <button onClick={() => { setLoading(true); signIn('google', { callbackUrl: '/' }); }} disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: '12px', color: 'var(--text)', transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '16px' }}>No credit card. No spam. Free forever.</p>
      </div>
    </div>
  );
}

// ── Skeleton card ───────────────────────────────────────────────────────────
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', animation: `fadeUp 0.5s ease ${delay}s both` }}>
      <div className="skeleton" style={{ height: '220px', borderRadius: 0 }} />
      <div style={{ padding: '20px' }}>
        <div className="skeleton" style={{ height: '12px', width: '50%', marginBottom: '10px' }} />
        <div className="skeleton" style={{ height: '11px', width: '100%', marginBottom: '6px' }} />
        <div className="skeleton" style={{ height: '11px', width: '75%', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '70px', marginBottom: '12px', borderRadius: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: '58px', borderRadius: '10px' }} />)}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [mode, setMode] = useState<'discover' | 'plan'>('discover');
  const [step, setStep] = useState<'home' | 'results'>('home');

  // Form state
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('');
  const [companions, setCompanions] = useState('');
  const [transport, setTransport] = useState('');
  const [budget, setBudget] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  // Results state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [unlockedCards, setUnlockedCards] = useState<Set<number>>(new Set());
  const [pendingUnlock, setPendingUnlock] = useState<number | null>(null);

  // Auto-calculate days
  useEffect(() => {
    if (startDate && endDate) {
      const diff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
      if (diff > 0) setDays(String(diff));
    }
  }, [startDate, endDate]);

  // Auto-unlock after auth
  useEffect(() => {
    if (session && pendingUnlock !== null) {
      setUnlockedCards(prev => new Set([...prev, pendingUnlock]));
      setPendingUnlock(null);
      setShowAuth(false);
    }
  }, [session, pendingUnlock]);

  const handleSearch = async (overrideQuery?: string) => {
    if (!origin && !overrideQuery) return;
    setLoading(true);
    setError('');
    setResult(null);
    setUnlockedCards(new Set());
    setStep('results');
    try {
      const budgetTier = BUDGET_TIERS.find(t => t.value === budget);
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: overrideQuery || notes || (destination ? `I want to go to ${destination}` : `Trip from ${origin}`),
          structured: {
            origin: origin || 'India',
            startDate, endDate, days,
            companions, transport,
            budget: budgetTier?.desc || budget,
            currency: '₹',
            destination: destination || undefined,
          }
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleUnlock = (i: number) => {
    if (session) setUnlockedCards(prev => new Set([...prev, i]));
    else { setPendingUnlock(i); setShowAuth(true); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '12px', fontSize: '14px',
    fontFamily: 'var(--font-body)', color: 'var(--text)',
    outline: 'none', transition: 'border-color 0.2s',
  };

  // ── HOME STEP ─────────────────────────────────────────────────────────────
  if (step === 'home') return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div style={{ minHeight: '100vh', background: 'var(--midnight)', position: 'relative', overflow: 'hidden' }}>

        {/* Background atmosphere */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,143,113,0.07) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(212,133,74,0.05) 0%, transparent 60%)',
        }} />

        {/* Nav */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: '60px', background: 'rgba(10,12,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" fill="rgba(107,143,113,0.15)" stroke="rgba(107,143,113,0.4)" strokeWidth="1"/>
              <path d="M8 21 L16 9 L24 21" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="16" cy="9" r="2" fill="var(--amber)"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: 'var(--text)', letterSpacing: '0.02em' }}>ZoveAI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {session ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {session.user?.image && <img src={session.user.image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--sage)' }} />}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{session.user?.name?.split(' ')[0]}</span>
                <button onClick={() => signOut()} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sign out</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Sign in</button>
                <button onClick={() => setShowAuth(true)} style={{ background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Get started</button>
              </>
            )}
          </div>
        </nav>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto', padding: '100px 24px 60px' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '99px', background: 'rgba(107,143,113,0.1)', border: '1px solid rgba(107,143,113,0.2)', fontSize: '11px', fontWeight: 500, color: 'var(--sage)', marginBottom: '24px', letterSpacing: '0.05em', textTransform: 'uppercase', animation: 'fadeUp 0.6s var(--ease-out)' }}>
              ✦ AI-Powered Travel Discovery
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px, 8vw, 80px)', fontWeight: 300, lineHeight: 1.05, color: 'var(--text)', marginBottom: '20px', letterSpacing: '-0.02em', animation: 'fadeUp 0.6s var(--ease-out) 0.1s both' }}>
              Where should<br />
              <em style={{ color: 'var(--amber)', fontStyle: 'italic' }}>you go next?</em>
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.7, fontWeight: 300, maxWidth: '480px', margin: '0 auto', animation: 'fadeUp 0.6s var(--ease-out) 0.2s both' }}>
              Not a booking site. Not a search engine.<br />
              An AI that knows <em>you</em> — and gives honest answers.
            </p>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px', animation: 'fadeUp 0.6s var(--ease-out) 0.25s both' }}>
            {[
              { value: 'discover', label: '✦ Suggest me somewhere', sub: 'I\'m open to ideas' },
              { value: 'plan', label: '📍 I know where I\'m going', sub: 'Help me plan it' },
            ].map(m => (
              <button key={m.value} onClick={() => setMode(m.value as any)}
                style={{
                  padding: '12px 22px', borderRadius: '14px', border: `1px solid ${mode === m.value ? 'var(--amber)' : 'var(--border)'}`,
                  background: mode === m.value ? 'rgba(212,133,74,0.1)' : 'var(--surface)',
                  color: mode === m.value ? 'var(--amber-light)' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                  textAlign: 'center',
                }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{m.label}</div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{m.sub}</div>
              </button>
            ))}
          </div>

          {/* Main form card */}
          <div style={{ background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)', padding: '28px', animation: 'fadeUp 0.6s var(--ease-out) 0.3s both' }}>

            {mode === 'plan' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Where do you want to go?</label>
                <input type="text" placeholder="e.g. Spiti Valley, Rajasthan, Bali..." value={destination} onChange={e => setDestination(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            )}

            {/* Origin + Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Travelling from {mode === 'discover' ? '*' : ''}</label>
                <input type="text" placeholder="Delhi, Mumbai..." value={origin} onChange={e => setOrigin(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Start date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>End date {days ? <span style={{ color: 'var(--amber)', fontStyle: 'normal' }}>· {days} days</span> : ''}</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Companions */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Travelling with</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COMPANIONS.map(c => (
                  <button key={c.value} onClick={() => setCompanions(companions === c.value ? '' : c.value)}
                    style={{
                      padding: '8px 16px', borderRadius: '99px', fontSize: '13px',
                      border: `1px solid ${companions === c.value ? 'var(--amber)' : 'var(--border)'}`,
                      background: companions === c.value ? 'rgba(212,133,74,0.12)' : 'transparent',
                      color: companions === c.value ? 'var(--amber-light)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transport */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>How do you want to travel?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                {TRANSPORTS.map(t => (
                  <button key={t.value} onClick={() => setTransport(transport === t.value ? '' : t.value)}
                    style={{
                      padding: '14px 8px', borderRadius: '14px', fontSize: '12px',
                      border: `1px solid ${transport === t.value ? 'var(--amber)' : 'var(--border)'}`,
                      background: transport === t.value ? 'rgba(212,133,74,0.1)' : 'var(--surface2)',
                      color: transport === t.value ? 'var(--amber-light)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      textAlign: 'center',
                    }}>
                    <div style={{ fontSize: '22px', marginBottom: '4px' }}>{t.icon}</div>
                    <div style={{ fontWeight: 500, fontSize: '11px' }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Budget per person</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {BUDGET_TIERS.map(t => (
                  <button key={t.value} onClick={() => setBudget(budget === t.value ? '' : t.value)}
                    style={{
                      padding: '12px 8px', borderRadius: '14px',
                      border: `1px solid ${budget === t.value ? 'var(--amber)' : 'var(--border)'}`,
                      background: budget === t.value ? 'rgba(212,133,74,0.1)' : 'var(--surface2)',
                      color: budget === t.value ? 'var(--amber-light)' : 'var(--text-muted)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      textAlign: 'center',
                    }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{t.emoji}</div>
                    <div style={{ fontWeight: 600, fontSize: '11px' }}>{t.label}</div>
                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Anything specific? <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
              </label>
              <textarea placeholder="e.g. My parents can't trek. We love local food. Avoid tourist traps. Need good roads for the bike..." value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Search CTA */}
            <button onClick={() => handleSearch()} disabled={(!origin && mode === 'discover') || loading}
              style={{
                width: '100%', padding: '16px',
                background: origin || mode === 'plan' ? 'linear-gradient(135deg, var(--amber), var(--amber-light))' : 'var(--surface2)',
                color: origin || mode === 'plan' ? '#fff' : 'var(--text-dim)',
                border: 'none', borderRadius: '14px', cursor: origin || mode === 'plan' ? 'pointer' : 'not-allowed',
                fontSize: '15px', fontWeight: 500, fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all 0.2s', boxShadow: origin || mode === 'plan' ? '0 8px 30px rgba(212,133,74,0.25)' : 'none',
              }}>
              {loading
                ? <><svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>Finding perfect destinations...</>
                : <>{mode === 'discover' ? '✦ Find my perfect destinations' : '📍 Plan this trip'}</>
              }
            </button>
            {mode === 'discover' && !origin && <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>Enter where you're travelling from to get started</p>}
          </div>

          {/* Surprise me prompts */}
          <div style={{ marginTop: '40px', animation: 'fadeUp 0.6s var(--ease-out) 0.5s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>or get inspired</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {SURPRISE_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => {
                  setNotes(p.text);
                  if (!origin) setOrigin('India');
                  handleSearch(p.text);
                }}
                  style={{
                    padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,133,74,0.3)'; e.currentTarget.style.background = 'rgba(212,133,74,0.04)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{p.icon}</span>
                  <span style={{ fontSize: '12px', lineHeight: 1.4 }}>{p.text}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        <footer style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '24px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-dim)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text-muted)', marginRight: '8px' }}>ZoveAI</span>
          · AI-powered travel discovery · Free to use
        </footer>
      </div>
    </>
  );

  // ── RESULTS STEP ──────────────────────────────────────────────────────────
  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <div style={{ minHeight: '100vh', background: 'var(--midnight)' }}>

        {/* Ambient bg */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(107,143,113,0.05) 0%, transparent 60%)' }} />

        {/* Nav */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: '60px', background: 'rgba(10,12,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => { setStep('home'); setResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="15" fill="rgba(107,143,113,0.15)" stroke="rgba(107,143,113,0.4)" strokeWidth="1"/><path d="M8 21 L16 9 L24 21" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="16" cy="9" r="2" fill="var(--amber)"/></svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: 'var(--text)' }}>ZoveAI</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => { setStep('home'); setResult(null); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>← New search</button>
            {session ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {session.user?.image && <img src={session.user.image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--sage)' }} />}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)} style={{ background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sign in free</button>
            )}
          </div>
        </nav>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1120px', margin: '0 auto', padding: '80px 24px 60px' }}>

          {/* Search summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              origin && `📍 ${origin}`,
              companions && COMPANIONS.find(c => c.value === companions)?.icon + ' ' + companions,
              transport && TRANSPORTS.find(t => t.value === transport)?.icon + ' ' + transport,
              days && `${days} days`,
              budget && BUDGET_TIERS.find(t => t.value === budget)?.label,
            ].filter(Boolean).map((tag, i) => (
              <span key={i} style={{ padding: '5px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '99px', fontSize: '12px', color: 'var(--text-muted)' }}>{tag}</span>
            ))}
          </div>

          {/* Interpretation */}
          {result?.interpretation && (
            <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '18px 22px', marginBottom: '28px', border: '1px solid var(--border)', display: 'flex', gap: '14px', alignItems: 'flex-start', animation: 'fadeUp 0.5s ease' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✦</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>ZoveAI</div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, fontStyle: 'italic' }}>"{result.interpretation}"</p>
              </div>
            </div>
          )}

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
            {loading
              ? [0,1,2].map(i => <SkeletonCard key={i} delay={i * 0.1} />)
              : result?.destinations.map((dest, i) => (
                <DestinationCard key={i} dest={dest} index={i}
                  isUnlocked={!!session || unlockedCards.has(i)}
                  onUnlock={() => handleUnlock(i)}
                />
              ))
            }
          </div>

          {error && (
            <div style={{ background: 'rgba(212,133,74,0.08)', borderRadius: '14px', padding: '16px 20px', marginTop: '20px', border: '1px solid rgba(212,133,74,0.2)', color: 'var(--amber-light)', fontSize: '14px' }}>{error}</div>
          )}
        </div>
      </div>
    </>
  );
}
