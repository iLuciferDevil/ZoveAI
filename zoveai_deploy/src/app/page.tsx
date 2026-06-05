'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

// ── Types ──────────────────────────────────────────────────────────────────
interface Destination {
  name: string; country: string; region: string; tagline: string;
  hero_image_query: string; why_recommended: string; best_for: string[];
  travel_from_origin: { origin: string; by_road: string; by_train: string; by_flight: string; recommended_mode: string; recommended_reason: string; };
  estimated_cost: { budget_per_day: string; total_trip_estimate: string; currency_note: string };
  best_time: string; duration_ideal: string;
  suitability_scores: Record<string, number>;
  reality_check: string[];
  day_sketch: { day: number; title: string; highlight: string }[];
  booking: { flight_origin: string; flight_destination: string; train_from: string; train_to: string; hotel_city: string };
  bookingContext?: { origin: string; startDate: string; endDate: string; days: string };
}
interface Result { interpretation: string; destinations: Destination[]; }

// ── Travel background images (Unsplash curated) ────────────────────────────
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // mountains
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80', // forest light
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80', // aerial mountains
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80', // lake reflection
  'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920&q=80', // golden desert
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80', // tropical beach
  'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=1920&q=80', // snowy peaks
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80', // rocky mountains
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

// ── ScoreBar ────────────────────────────────────────────────────────────────
function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? '#7A9E82' : score >= 6 ? '#D4854A' : 'rgba(245,240,232,0.2)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-dim)', width: '100px', flexShrink: 0, textTransform: 'capitalize' }}>{label.replace('_', ' ')}</span>
      <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${score * 10}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 1s var(--ease)' }} />
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
      background: 'rgba(255,255,255,0.04)', borderRadius: '20px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      animation: `scaleIn 0.6s var(--ease) ${index * 0.15}s both`,
      transition: 'transform 0.3s var(--ease), box-shadow 0.3s ease',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 24px 60px rgba(0,0,0,0.5)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'relative', height: '220px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />}
        <img src={imgUrl} alt={dest.name} onLoad={() => setImgLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,15,14,0.92) 0%, rgba(13,15,14,0.15) 55%, transparent 100%)' }} />
        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(13,15,14,0.65)', backdropFilter: 'blur(12px)', borderRadius: '99px', padding: '4px 12px', fontSize: '11px', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {dest.country} · {dest.region}
        </div>
        <div style={{ position: 'absolute', bottom: '16px', left: '18px', right: '18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
            {dest.best_for.slice(0, 3).map((tag, i) => (
              <span key={i} style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '10px', background: 'rgba(212,133,74,0.2)', color: 'var(--amber-light)', border: '1px solid rgba(212,133,74,0.3)' }}>{tag}</span>
            ))}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: '#fff', lineHeight: 1.1 }}>{dest.name}</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '4px', fontStyle: 'italic' }}>{dest.tagline}</p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '16px' }}>{dest.why_recommended}</p>

        {tfo && (
          <div style={{ background: 'rgba(122,158,130,0.08)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', border: '1px solid rgba(122,158,130,0.15)' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>From {tfo.origin}</div>
            {[{ i: '🚗', t: tfo.by_road }, { i: '🚆', t: tfo.by_train }, { i: '✈', t: tfo.by_flight }]
              .filter(r => r.t && r.t !== 'N/A' && !r.t.toLowerCase().includes('no direct'))
              .slice(0, 2).map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                  <span>{r.i}</span><span>{r.t}</span>
                </div>
              ))}
            {tfo.recommended_reason && <div style={{ marginTop: '7px', fontSize: '12px', color: 'var(--sage)', fontWeight: 500 }}>✓ {tfo.recommended_reason}</div>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { l: 'Best time', v: dest.best_time, i: '🗓' },
            { l: 'Duration', v: dest.duration_ideal, i: '⏱' },
            { l: 'Per day', v: dest.estimated_cost.budget_per_day, i: '💰' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '14px', marginBottom: '3px' }}>{s.i}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px' }}>{s.l}</div>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)' }}>{s.v}</div>
            </div>
          ))}
        </div>

        {!isUnlocked ? (
          <div style={{ position: 'relative' }}>
            <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.35 }}>
              {Object.entries(dest.suitability_scores).slice(0, 4).map(([k, v]) => <ScoreBar key={k} label={k} score={v} />)}
              <div style={{ fontSize: '12px', color: 'var(--amber)', padding: '8px 12px', background: 'rgba(212,133,74,0.08)', borderRadius: '8px', marginTop: '10px' }}>⚠ {dest.reality_check[0]}</div>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button onClick={onUnlock} style={{ background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px 26px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: '0 8px 30px rgba(212,133,74,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <div><div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{day.title}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{day.highlight}</div></div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
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
                  style={{ display: 'block', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', textDecoration: 'none', transition: 'all 0.2s', gridColumn: (link as any).full ? 'span 2' : 'span 1' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,133,74,0.1)'; e.currentTarget.style.borderColor = 'rgba(212,133,74,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
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
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(20,22,20,0.95)', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.12)', animation: 'scaleIn 0.4s var(--ease)', backdropFilter: 'blur(20px)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '24px', lineHeight: 1 }}>×</button>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 300, color: 'var(--amber)', marginBottom: '8px' }}>✦</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: 'var(--text)', marginBottom: '10px' }}>Join ZoveAI</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>Free forever. Unlock suitability scores, reality checks, booking links, and save your trips.</p>
        </div>
        <button onClick={() => { setLoading(true); signIn('google', { callbackUrl: '/' }); }} disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--text)', transition: 'all 0.2s', marginBottom: '10px' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '14px' }}>No credit card · No spam · Free forever</p>
      </div>
    </div>
  );
}

// ── Background Slideshow ────────────────────────────────────────────────────
function TravelBackground({ currentBg }: { currentBg: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      {BG_IMAGES.map((src, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === currentBg ? 1 : 0,
          transition: 'opacity 1.5s ease',
        }} />
      ))}
      {/* Layered overlays for depth */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,15,14,0.45) 0%, rgba(13,15,14,0.3) 40%, rgba(13,15,14,0.7) 75%, rgba(13,15,14,0.95) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(13,15,14,0.8) 0%, transparent 70%)' }} />
    </div>
  );
}

// ── Wizard Step Wrapper ─────────────────────────────────────────────────────
function WizardStep({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{ animation: 'slideUp 0.5s var(--ease)' }}>
      {children}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [wizardStep, setWizardStep] = useState(0); // 0=origin, 1=dates, 2=companions, 3=transport, 4=budget, 5=notes
  const [pageMode, setPageMode] = useState<'wizard' | 'results'>('wizard');

  // Form values
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('');
  const [companions, setCompanions] = useState('');
  const [transport, setTransport] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  // Results
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [unlockedCards, setUnlockedCards] = useState<Set<number>>(new Set());
  const [pendingUnlock, setPendingUnlock] = useState<number | null>(null);

  const originRef = useRef<HTMLInputElement>(null);

  // Background rotation
  useEffect(() => {
    const t = setInterval(() => setCurrentBg(b => (b + 1) % BG_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);

  // Auto-calculate days
  useEffect(() => {
    if (startDate && endDate) {
      const diff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000);
      if (diff > 0) setDays(String(diff));
    }
  }, [startDate, endDate]);

  // Auth unlock
  useEffect(() => {
    if (session && pendingUnlock !== null) {
      setUnlockedCards(prev => new Set([...prev, pendingUnlock]));
      setPendingUnlock(null);
      setShowAuth(false);
    }
  }, [session, pendingUnlock]);

  // Focus origin on mount
  useEffect(() => {
    setTimeout(() => originRef.current?.focus(), 800);
  }, []);

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    setLoading(true);
    setError('');
    setResult(null);
    setUnlockedCards(new Set());
    setPageMode('results');
    try {
      const budgetTier = BUDGET_TIERS.find(t => t.value === budget);
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: overrideQuery || notes || `Find me the perfect trip from ${origin}`,
          structured: { origin: origin || 'India', startDate, endDate, days, companions, transport, budget: budgetTier?.desc || budget, currency: '₹' }
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }, [origin, startDate, endDate, days, companions, transport, budget, notes]);

  const handleUnlock = (i: number) => {
    if (session) setUnlockedCards(prev => new Set([...prev, i]));
    else { setPendingUnlock(i); setShowAuth(true); }
  };

  const nextStep = () => setWizardStep(s => Math.min(s + 1, 5));
  const prevStep = () => setWizardStep(s => Math.max(s - 1, 0));

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(28px, 5vw, 48px)',
    fontWeight: 300,
    color: 'var(--text)',
    lineHeight: 1.2,
    marginBottom: '28px',
    letterSpacing: '-0.01em',
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '14px',
    padding: '16px 20px',
    fontSize: '16px',
    fontFamily: 'var(--font-body)',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    backdropFilter: 'blur(10px)',
  };

  const nextBtnStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, var(--amber), var(--amber-light))',
    color: '#fff', border: 'none', borderRadius: '12px',
    padding: '14px 28px', fontSize: '14px', fontWeight: 500,
    cursor: 'pointer', fontFamily: 'var(--font-body)',
    boxShadow: '0 8px 24px rgba(212,133,74,0.25)',
    transition: 'all 0.2s',
    display: 'inline-flex', alignItems: 'center', gap: '8px',
  };

  const skipStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'var(--font-body)',
    padding: '10px 16px', transition: 'color 0.2s',
  };

  const optionCardStyle = (selected: boolean): React.CSSProperties => ({
    padding: '18px 14px', borderRadius: '16px', cursor: 'pointer',
    border: `1px solid ${selected ? 'rgba(212,133,74,0.5)' : 'rgba(255,255,255,0.1)'}`,
    background: selected ? 'rgba(212,133,74,0.12)' : 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    color: selected ? 'var(--amber-light)' : 'var(--text-muted)',
    transition: 'all 0.2s', textAlign: 'center' as const,
    fontFamily: 'var(--font-body)',
  });

  // ── RESULTS VIEW ──────────────────────────────────────────────────────────
  if (pageMode === 'results') return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <TravelBackground currentBg={currentBg} />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: '58px', background: 'rgba(13,15,14,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => { setPageMode('wizard'); setResult(null); setWizardStep(0); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="rgba(122,158,130,0.15)" stroke="rgba(122,158,130,0.35)" strokeWidth="1"/><path d="M9 20 L16 10 L23 20" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="16" cy="10" r="1.8" fill="var(--amber)"/></svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 400, color: 'var(--text)' }}>ZoveAI</span>
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => { setPageMode('wizard'); setResult(null); setWizardStep(0); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>← New search</button>
            {session
              ? session.user?.image && <img src={session.user.image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--sage)' }} />
              : <button onClick={() => setShowAuth(true)} style={{ background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sign in free</button>
            }
          </div>
        </nav>

        <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '78px 24px 60px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {[origin && `📍 ${origin}`, companions, transport && TRANSPORTS.find(t => t.value === transport)?.label, days && `${days} days`, budget && BUDGET_TIERS.find(t => t.value === budget)?.label].filter(Boolean).map((tag, i) => (
              <span key={i} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '99px', fontSize: '12px', color: 'var(--text-muted)', backdropFilter: 'blur(10px)' }}>{tag}</span>
            ))}
          </div>

          {result?.interpretation && (
            <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: '16px', padding: '18px 22px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '14px', animation: 'fadeUp 0.5s ease' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✦</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>ZoveAI</div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, fontStyle: 'italic' }}>"{result.interpretation}"</p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '22px' }}>
            {loading
              ? [0,1,2].map(i => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', animation: `fadeUp 0.5s ease ${i * 0.1}s both` }}>
                  <div className="skeleton" style={{ height: '220px', borderRadius: 0 }} />
                  <div style={{ padding: '20px' }}>
                    {[['50%','12px'], ['100%','11px'], ['75%','11px']].map(([w,h], j) => <div key={j} className="skeleton" style={{ height: h, width: w, marginBottom: '8px' }} />)}
                    <div className="skeleton" style={{ height: '70px', marginTop: '12px', borderRadius: '12px' }} />
                  </div>
                </div>
              ))
              : result?.destinations.map((dest, i) => (
                <DestinationCard key={i} dest={dest} index={i} isUnlocked={!!session || unlockedCards.has(i)} onUnlock={() => handleUnlock(i)} />
              ))
            }
          </div>

          {error && <div style={{ background: 'rgba(212,133,74,0.08)', borderRadius: '14px', padding: '16px 20px', marginTop: '20px', border: '1px solid rgba(212,133,74,0.2)', color: 'var(--amber-light)', fontSize: '14px' }}>{error}</div>}
        </div>
      </div>
    </>
  );

  // ── WIZARD VIEW ───────────────────────────────────────────────────────────
  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <TravelBackground currentBg={currentBg} />

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: '58px', background: 'rgba(13,15,14,0.4)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="rgba(122,158,130,0.15)" stroke="rgba(122,158,130,0.35)" strokeWidth="1"/><path d="M9 20 L16 10 L23 20" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="16" cy="10" r="1.8" fill="var(--amber)"/></svg>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 400, color: 'var(--text)' }}>ZoveAI</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {session ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {session.user?.image && <img src={session.user.image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--sage)' }} />}
              <button onClick={() => signOut()} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sign out</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Sign in</button>
              <button onClick={() => setShowAuth(true)} style={{ background: 'linear-gradient(135deg, var(--amber), var(--amber-light))', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Get started</button>
            </>
          )}
        </div>
      </nav>

      {/* Progress dots */}
      <div style={{ position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', gap: '6px' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ width: i === wizardStep ? '20px' : '6px', height: '6px', borderRadius: '99px', background: i === wizardStep ? 'var(--amber)' : i < wizardStep ? 'rgba(212,133,74,0.4)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s var(--ease)' }} />
        ))}
      </div>

      {/* Full-screen wizard */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 60px' }}>
        <div style={{ width: '100%', maxWidth: '640px' }}>

          {/* Step 0 — Origin */}
          <WizardStep visible={wizardStep === 0}>
            <div style={{ marginBottom: '16px', animation: 'fadeUp 0.5s var(--ease) 0.2s both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(122,158,130,0.15)', border: '1px solid rgba(122,158,130,0.25)', fontSize: '11px', fontWeight: 500, color: 'var(--sage)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '20px' }}>
                ✦ AI-Powered Travel Discovery
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 8vw, 76px)', fontWeight: 300, lineHeight: 1.05, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '12px' }}>
                Where should<br /><em style={{ color: 'var(--amber)', fontStyle: 'italic' }}>you go next?</em>
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.7, fontWeight: 300, marginBottom: '36px' }}>
                Not a booking site. An AI that knows you<br />and gives <em>honest</em> recommendations.
              </p>
            </div>

            <div style={{ animation: 'fadeUp 0.5s var(--ease) 0.35s both' }}>
              <p style={{ ...labelStyle, fontSize: 'clamp(22px, 3.5vw, 32px)' }}>Where are you travelling from?</p>
              <input
                ref={originRef}
                type="text" placeholder="Delhi, Mumbai, Bangalore..."
                value={origin} onChange={e => setOrigin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && origin.trim() && nextStep()}
                style={{ ...inputStyle, width: '100%', marginBottom: '16px' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(212,133,74,0.5)'; e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '40px' }}>
                <button onClick={nextStep} disabled={!origin.trim()} style={{ ...nextBtnStyle, opacity: origin.trim() ? 1 : 0.4 }}>
                  Continue →
                </button>
                <button onClick={() => { setOrigin('India'); nextStep(); }} style={skipStyle} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'}>
                  Skip
                </button>
              </div>
            </div>

            {/* Surprise Me */}
            <div style={{ animation: 'fadeUp 0.5s var(--ease) 0.5s both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or get inspired</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                {SURPRISE_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => { if (!origin) setOrigin('India'); handleSearch(p.text); }}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,133,74,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,133,74,0.2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{p.icon}</span>
                    <span style={{ lineHeight: 1.4 }}>{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </WizardStep>

          {/* Step 1 — Dates */}
          <WizardStep visible={wizardStep === 1}>
            <p style={labelStyle}>When are you going?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              {[
                { label: 'Start date', val: startDate, set: setStartDate },
                { label: 'End date', val: endDate, set: setEndDate },
              ].map((d, i) => (
                <div key={i}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{d.label}</div>
                  <input type="date" value={d.val} onChange={e => d.set(e.target.value)}
                    style={{ ...inputStyle, width: '100%', colorScheme: 'dark' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(212,133,74,0.5)'; e.target.style.background = 'rgba(255,255,255,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                  />
                </div>
              ))}
            </div>
            {days && <p style={{ fontSize: '13px', color: 'var(--amber-light)', marginBottom: '20px' }}>✦ {days} days</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={prevStep} style={{ ...skipStyle, color: 'var(--text-dim)' }}>← Back</button>
              <button onClick={nextStep} style={nextBtnStyle}>Continue →</button>
              <button onClick={nextStep} style={skipStyle}>Skip</button>
            </div>
          </WizardStep>

          {/* Step 2 — Companions */}
          <WizardStep visible={wizardStep === 2}>
            <p style={labelStyle}>Who's coming with you?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
              {COMPANIONS.map(c => (
                <button key={c.value} onClick={() => setCompanions(companions === c.value ? '' : c.value)}
                  style={optionCardStyle(companions === c.value)}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{c.icon}</div>
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{c.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '3px' }}>{c.sub}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={prevStep} style={skipStyle}>← Back</button>
              <button onClick={nextStep} style={nextBtnStyle}>{companions ? 'Continue →' : 'Skip →'}</button>
            </div>
          </WizardStep>

          {/* Step 3 — Transport */}
          <WizardStep visible={wizardStep === 3}>
            <p style={labelStyle}>How do you want to travel?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
              {TRANSPORTS.map(t => (
                <button key={t.value} onClick={() => setTransport(transport === t.value ? '' : t.value)}
                  style={optionCardStyle(transport === t.value)}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{t.icon}</div>
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{t.label}</div>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '3px' }}>{t.sub}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={prevStep} style={skipStyle}>← Back</button>
              <button onClick={nextStep} style={nextBtnStyle}>{transport ? 'Continue →' : 'Skip →'}</button>
            </div>
          </WizardStep>

          {/* Step 4 — Budget */}
          <WizardStep visible={wizardStep === 4}>
            <p style={labelStyle}>What's your budget per person?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '28px' }}>
              {BUDGET_TIERS.map(t => (
                <button key={t.value} onClick={() => setBudget(budget === t.value ? '' : t.value)}
                  style={optionCardStyle(budget === t.value)}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{t.emoji}</div>
                  <div style={{ fontWeight: 500, fontSize: '12px' }}>{t.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '3px' }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={prevStep} style={skipStyle}>← Back</button>
              <button onClick={nextStep} style={nextBtnStyle}>{budget ? 'Continue →' : 'Skip →'}</button>
            </div>
          </WizardStep>

          {/* Step 5 — Notes + Search */}
          <WizardStep visible={wizardStep === 5}>
            <p style={labelStyle}>Anything else we should know?</p>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
              Special requirements, vibes you're after, places to avoid — anything helps.
            </p>
            <textarea
              placeholder="e.g. My parents can't trek much. We love local food and quiet places. Avoid Shimla and Manali, we've been there..."
              value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              style={{ ...inputStyle, width: '100%', resize: 'none', lineHeight: 1.6, marginBottom: '24px' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(212,133,74,0.5)'; e.target.style.background = 'rgba(255,255,255,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
            />

            {/* Summary chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '24px' }}>
              {[origin && `📍 ${origin}`, days && `${days} days`, companions, transport && TRANSPORTS.find(t => t.value === transport)?.label, budget && BUDGET_TIERS.find(t => t.value === budget)?.label].filter(Boolean).map((tag, i) => (
                <span key={i} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '99px', fontSize: '12px', color: 'var(--text-muted)', backdropFilter: 'blur(10px)' }}>{tag}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={prevStep} style={skipStyle}>← Back</button>
              <button onClick={() => handleSearch()} style={{ ...nextBtnStyle, padding: '16px 36px', fontSize: '15px', boxShadow: '0 10px 36px rgba(212,133,74,0.3)' }}>
                ✦ Find my destinations
              </button>
            </div>
          </WizardStep>

        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--text-muted)', marginRight: '6px' }}>ZoveAI</span>
        · Free to use · No booking fees
      </div>
    </>
  );
}
