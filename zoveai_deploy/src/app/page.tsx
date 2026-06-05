'use client';
import React, { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

// ── Types ──────────────────────────────────────────────────────────────────
interface TravelFromOrigin {
  origin: string; by_road: string; by_train: string; by_flight: string;
  recommended_mode: string; recommended_reason: string;
}
interface SuitabilityScores {
  couple: number; family: number; solo: number; elderly_parents: number;
  adventure: number; relaxation: number; food: number; culture: number;
}
interface Destination {
  name: string; country: string; region: string; tagline: string;
  hero_image_query: string; why_recommended: string; best_for: string[];
  travel_from_origin: TravelFromOrigin;
  estimated_cost: { budget_per_day: string; total_trip_estimate: string; currency_note: string };
  best_time: string; duration_ideal: string;
  suitability_scores: SuitabilityScores;
  reality_check: string[];
  day_sketch: { day: number; title: string; highlight: string }[];
  booking: { flight_origin: string; flight_destination: string; train_from: string; train_to: string; hotel_city: string };
  bookingContext?: { origin: string; startDate: string; endDate: string; days: string };
}
interface Result { interpretation: string; destinations: Destination[]; }
interface StructuredForm {
  origin: string; startDate: string; endDate: string; days: string;
  companions: string; transport: string; budget: string; notes: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const COMPANIONS = ['Solo', 'Couple', 'Friends', 'Family with kids', 'With parents', 'Group'];
const TRANSPORTS = [
  { value: 'car', label: '🚗 Car', desc: 'Road trip' },
  { value: 'motorcycle', label: '🏍 Motorcycle', desc: 'Bike trip' },
  { value: 'train', label: '🚆 Train', desc: 'Rail journey' },
  { value: 'flight', label: '✈ Flight', desc: 'Fly there' },
  { value: 'bus', label: '🚌 Bus', desc: 'Bus travel' },
  { value: 'any', label: '🗺 Any', desc: 'Best option' },
];
const BUDGET_TIERS = [
  { value: 'budget', label: '🎒 Budget', desc: 'Under ₹2,000/day', range: 'under ₹2,000 per person per day' },
  { value: 'comfortable', label: '💰 Comfortable', desc: '₹2,000–5,000/day', range: '₹2,000–5,000 per person per day' },
  { value: 'premium', label: '✨ Premium', desc: '₹5,000–12,000/day', range: '₹5,000–12,000 per person per day' },
  { value: 'luxury', label: '💎 Luxury', desc: '₹12,000–25,000/day', range: '₹12,000–25,000 per person per day' },
  { value: 'ultraluxury', label: '👑 Ultra Luxury', desc: '₹25,000+/day', range: 'above ₹25,000 per person per day' },
];

// ── Booking URL builders ───────────────────────────────────────────────────
function buildBookingUrls(dest: Destination) {
  const ctx = dest.bookingContext;
  const booking = dest.booking;
  const depDate = ctx?.startDate ? ctx.startDate.replace(/-/g, '') : '';
  const retDate = ctx?.endDate ? ctx.endDate.replace(/-/g, '') : '';

  const flightOrigin = booking?.flight_origin || ctx?.origin || '';
  const flightDest = booking?.flight_destination || dest.name;
  const hotelCity = booking?.hotel_city || dest.name;
  const trainFrom = booking?.train_from || flightOrigin;
  const trainTo = booking?.train_to || dest.name;

  return {
    flights: `https://www.skyscanner.net/transport/flights/${encodeURIComponent(flightOrigin)}/${encodeURIComponent(flightDest)}/${depDate || ''}/${retDate || ''}/`,
    hotels: `https://www.booking.com/search.html?ss=${encodeURIComponent(hotelCity)}&checkin=${ctx?.startDate || ''}&checkout=${ctx?.endDate || ''}`,
    trains: `https://www.irctc.co.in/nget/train-search?from=${encodeURIComponent(trainFrom)}&to=${encodeURIComponent(trainTo)}&journeyDate=${ctx?.startDate || ''}`,
    route: `https://www.rome2rio.com/s/${encodeURIComponent(flightOrigin)}/${encodeURIComponent(dest.name)}`,
    activities: `https://www.viator.com/search/${encodeURIComponent(dest.name)}`,
  };
}

// ── Score bar ──────────────────────────────────────────────────────────────
function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? '#2D4A3E' : score >= 6 ? '#C4853A' : '#9E8E74';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: 'var(--stone-600)', width: '100px', flexShrink: 0, textTransform: 'capitalize' }}>{label.replace('_', ' ')}</span>
      <div style={{ flex: 1, height: '4px', background: 'var(--stone-100)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${score * 10}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color, width: '20px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

// ── Transport mode icon ────────────────────────────────────────────────────
function TransportBadge({ mode }: { mode: string }) {
  const icons: Record<string, string> = { car: '🚗', motorcycle: '🏍', train: '🚆', flight: '✈', bus: '🚌', any: '🗺' };
  return <span>{icons[mode] || '🗺'} {mode}</span>;
}

// ── Destination Card ───────────────────────────────────────────────────────
function DestinationCard({ dest, index, isUnlocked, onUnlock }: {
  dest: Destination; index: number; isUnlocked: boolean; onUnlock: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const seed = dest.hero_image_query.split('').reduce((a, c) => a + c.charCodeAt(0), index * 137);
  const imgUrl = `https://picsum.photos/seed/${seed}/800/500`;
  const urls = buildBookingUrls(dest);
  const tfo = dest.travel_from_origin;

  return (
    <div style={{
      background: 'var(--warm-white)', borderRadius: 'var(--radius-xl)',
      overflow: 'hidden', boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--stone-100)',
      animation: `fadeUp 0.5s ease ${index * 0.12}s both`,
    }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: '210px', background: 'var(--stone-100)' }}>
        {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
        <img src={imgUrl} alt={dest.name} onLoad={() => setImgLoaded(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,20,16,0.72) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(249,246,240,0.92)', backdropFilter: 'blur(8px)', borderRadius: '99px', padding: '3px 11px', fontSize: '11px', fontWeight: 600, color: 'var(--stone-800)' }}>
          {dest.country} · {dest.region}
        </div>
        <div style={{ position: 'absolute', bottom: '14px', left: '16px', right: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{dest.name}</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.82)', marginTop: '3px', fontStyle: 'italic' }}>{dest.tagline}</p>
        </div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
          {dest.best_for.map((tag, i) => (
            <span key={i} style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '11px', fontWeight: 500, background: 'var(--stone-50)', color: 'var(--stone-600)', border: '1px solid var(--stone-100)' }}>{tag}</span>
          ))}
        </div>

        {/* Why recommended */}
        <p style={{ fontSize: '13px', color: 'var(--stone-800)', lineHeight: 1.65, marginBottom: '14px' }}>{dest.why_recommended}</p>

        {/* Travel from origin — the key new feature */}
        {tfo && (
          <div style={{ background: 'rgba(45,74,62,0.06)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '14px', border: '1px solid rgba(45,74,62,0.12)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Getting there from {tfo.origin}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {tfo.by_road && tfo.by_road !== 'N/A' && (
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                  <span style={{ flexShrink: 0 }}>🚗</span>
                  <span style={{ color: 'var(--stone-700)' }}>{tfo.by_road}</span>
                </div>
              )}
              {tfo.by_train && tfo.by_train !== 'N/A' && (
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                  <span style={{ flexShrink: 0 }}>🚆</span>
                  <span style={{ color: 'var(--stone-700)' }}>{tfo.by_train}</span>
                </div>
              )}
              {tfo.by_flight && tfo.by_flight !== 'N/A' && (
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                  <span style={{ flexShrink: 0 }}>✈</span>
                  <span style={{ color: 'var(--stone-700)' }}>{tfo.by_flight}</span>
                </div>
              )}
            </div>
            {tfo.recommended_mode && (
              <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(45,74,62,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--forest)', fontWeight: 500 }}>
                ✓ Best way: <TransportBadge mode={tfo.recommended_mode} /> — {tfo.recommended_reason}
              </div>
            )}
          </div>
        )}

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { label: 'Best Time', value: dest.best_time, icon: '🗓' },
            { label: 'Duration', value: dest.duration_ideal, icon: '⏱' },
            { label: 'Per Day', value: dest.estimated_cost.budget_per_day, icon: '💰' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'var(--stone-50)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', border: '1px solid var(--stone-100)' }}>
              <div style={{ fontSize: '14px', marginBottom: '2px' }}>{stat.icon}</div>
              <div style={{ fontSize: '10px', color: 'var(--stone-400)', marginBottom: '1px' }}>{stat.label}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Gated content */}
        {!isUnlocked ? (
          <div style={{ position: 'relative' }}>
            <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5, marginBottom: '14px' }}>
              <div style={{ marginBottom: '8px' }}>
                {Object.entries(dest.suitability_scores).slice(0, 3).map(([k, v]) => (
                  <ScoreBar key={k} label={k} score={v} />
                ))}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--coral)', padding: '6px 10px', background: '#FEF3EE', borderRadius: 'var(--radius-sm)' }}>
                ⚠ {dest.reality_check[0]}
              </div>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button onClick={onUnlock} style={{
                background: 'var(--forest)', color: '#fff', border: 'none',
                borderRadius: 'var(--radius-md)', padding: '12px 24px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)', boxShadow: '0 4px 20px rgba(45,74,62,0.3)',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}>
                🔓 Unlock full details — free
              </button>
              <p style={{ fontSize: '11px', color: 'var(--stone-400)', textAlign: 'center' }}>Suitability · Reality check · Day plan · Booking links</p>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            {/* Suitability */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Suitability</div>
              {Object.entries(dest.suitability_scores).map(([k, v]) => <ScoreBar key={k} label={k} score={v} />)}
            </div>

            {/* Reality check */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--coral)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>⚠ Reality Check</div>
              {dest.reality_check.map((w, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--stone-800)', padding: '7px 11px', background: '#FEF3EE', borderRadius: 'var(--radius-sm)', marginBottom: '5px', borderLeft: '3px solid var(--coral)', lineHeight: 1.5 }}>{w}</div>
              ))}
            </div>

            {/* Day sketch */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Day-by-Day</div>
              {dest.day_sketch.map((day, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, background: 'var(--forest)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{day.day}</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{day.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--stone-600)' }}>{day.highlight}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost breakdown */}
            <div style={{ background: 'var(--stone-50)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '14px', border: '1px solid var(--stone-100)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--stone-500)', textTransform: 'uppercase', marginBottom: '4px' }}>Trip Cost Estimate</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{dest.estimated_cost.total_trip_estimate}</div>
              <div style={{ fontSize: '11px', color: 'var(--stone-500)', marginTop: '2px' }}>{dest.estimated_cost.currency_note}</div>
            </div>

            {/* Booking links — pre-filled */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Book This Trip</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                  { label: '✈ Flights', url: urls.flights, sub: dest.bookingContext?.origin ? `from ${dest.bookingContext.origin}` : '' },
                  { label: '🏨 Hotels', url: urls.hotels, sub: dest.bookingContext?.startDate ? `${dest.bookingContext.startDate}` : '' },
                  { label: '🚆 IRCTC', url: urls.trains, sub: 'Book train tickets' },
                  { label: '🗺 Route', url: urls.route, sub: 'All transport options' },
                  { label: '🎭 Activities', url: urls.activities, sub: 'Things to do' },
                ].map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'block', padding: '8px 11px', background: '#fff',
                      border: '1px solid var(--stone-200)', borderRadius: 'var(--radius-sm)',
                      textDecoration: 'none', transition: 'all 0.15s ease',
                      gridColumn: i === 4 ? 'span 2' : 'span 1',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--forest)'; e.currentTarget.style.borderColor = 'var(--forest)'; (e.currentTarget.querySelector('.bl') as HTMLElement).style.color = '#fff'; (e.currentTarget.querySelector('.bs') as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--stone-200)'; (e.currentTarget.querySelector('.bl') as HTMLElement).style.color = 'var(--forest)'; (e.currentTarget.querySelector('.bs') as HTMLElement).style.color = 'var(--stone-400)'; }}
                  >
                    <div className="bl" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--forest)', transition: 'color 0.15s' }}>{link.label}</div>
                    {link.sub && <div className="bs" style={{ fontSize: '10px', color: 'var(--stone-400)', marginTop: '1px', transition: 'color 0.15s' }}>{link.sub}</div>}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Auth Modal ─────────────────────────────────────────────────────────────
function AuthModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', zIndex: 1, background: 'var(--warm-white)', borderRadius: 'var(--radius-xl)', padding: '36px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.3s ease' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone-400)', fontSize: '22px', lineHeight: 1 }}>×</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>Join ZoveAI</h2>
        <p style={{ fontSize: '14px', color: 'var(--stone-600)', marginBottom: '24px' }}>Free forever. Unlock suitability scores, reality checks, booking links, and save your trips.</p>

        <button
          onClick={() => { setLoading(true); signIn('google', { callbackUrl: '/' }); }}
          disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--stone-200)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', marginBottom: '16px', transition: 'background 0.15s', color: 'var(--ink)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--stone-50)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--stone-100)' }} />
          <span style={{ fontSize: '12px', color: 'var(--stone-400)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--stone-100)' }} />
        </div>

        <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--stone-200)', background: '#fff', fontSize: '14px', fontFamily: 'var(--font-body)', marginBottom: '10px', outline: 'none', color: 'var(--ink)' }}
          onFocus={e => e.target.style.borderColor = 'var(--sage)'}
          onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
        />
        <button
          onClick={() => email && signIn('email', { email, callbackUrl: '/' })}
          disabled={!email}
          style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', background: email ? 'var(--forest)' : 'var(--stone-200)', color: '#fff', border: 'none', cursor: email ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)' }}
        >
          Continue with email
        </button>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--stone-400)', marginTop: '14px' }}>No credit card. No spam. Free forever.</p>
      </div>
    </div>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div style={{ background: 'var(--warm-white)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', border: '1px solid var(--stone-100)', animation: `fadeUp 0.4s ease ${delay}s both` }}>
      <div className="skeleton" style={{ height: '210px' }} />
      <div style={{ padding: '18px 20px' }}>
        <div className="skeleton" style={{ height: '13px', width: '55%', marginBottom: '10px' }} />
        <div className="skeleton" style={{ height: '11px', width: '100%', marginBottom: '5px' }} />
        <div className="skeleton" style={{ height: '11px', width: '80%', marginBottom: '14px' }} />
        <div className="skeleton" style={{ height: '72px', marginBottom: '10px', borderRadius: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '8px' }} />)}
        </div>
      </div>
    </div>
  );
}

// ── Input field component ──────────────────────────────────────────────────
function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--stone-200)', background: '#fff',
  fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--ink)',
  outline: 'none', transition: 'border-color 0.15s',
};

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Home() {
  const { data: session } = useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [form, setForm] = useState<StructuredForm>({
    origin: '', startDate: '', endDate: '', days: '',
    companions: '', transport: '', budget: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [unlockedCards, setUnlockedCards] = useState<Set<number>>(new Set());
  const [pendingUnlock, setPendingUnlock] = useState<number | null>(null);
  const [step, setStep] = useState<'form' | 'results'>('form');

  const updateForm = (key: keyof StructuredForm, value: string) =>
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      // Auto-calculate days from dates
      if (key === 'startDate' || key === 'endDate') {
        const start = key === 'startDate' ? value : prev.startDate;
        const end = key === 'endDate' ? value : prev.endDate;
        if (start && end) {
          const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 0) updated.days = String(diff);
        }
      }
      return updated;
    });

  const handleSearch = async () => {
    if (!form.origin || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    setUnlockedCards(new Set());
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: form.notes || `Trip from ${form.origin}`,
          structured: {
            origin: form.origin,
            startDate: form.startDate,
            endDate: form.endDate,
            days: form.days,
            companions: form.companions,
            transport: form.transport,
            budget: BUDGET_TIERS.find(t => t.value === form.budget)?.range || form.budget,
            currency: '₹',
          }
        }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setResult(data); setStep('results'); }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (i: number) => {
    if (session) {
      setUnlockedCards(prev => new Set([...prev, i]));
    } else {
      setPendingUnlock(i);
      setShowAuth(true);
    }
  };

  // After auth, auto-unlock pending card
  useEffect(() => {
    if (session && pendingUnlock !== null) {
      setUnlockedCards(prev => new Set([...prev, pendingUnlock]));
      setPendingUnlock(null);
      setShowAuth(false);
    }
  }, [session, pendingUnlock]);

  const canSearch = form.origin.trim().length > 0;

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

        {/* Nav */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: '58px', background: 'rgba(249,246,240,0.94)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--stone-100)' }}>
          <button onClick={() => { setStep('form'); setResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" fill="var(--forest)" />
              <path d="M8 20 L16 10 L24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="16" cy="10" r="2.5" fill="var(--amber-light)"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 600, color: 'var(--ink)' }}>ZoveAI</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {session ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {session.user?.image && <img src={session.user.image} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid var(--sage)' }} />}
                <span style={{ fontSize: '13px', color: 'var(--stone-600)' }}>{session.user?.name?.split(' ')[0]}</span>
                <button onClick={() => signOut()} style={{ background: 'none', border: '1px solid var(--stone-200)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', fontSize: '12px', color: 'var(--stone-500)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sign out</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--stone-600)', fontFamily: 'var(--font-body)' }}>Sign in</button>
                <button onClick={() => setShowAuth(true)} style={{ background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '7px 15px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Get started</button>
              </>
            )}
          </div>
        </nav>

        {step === 'form' && (
          <section style={{ paddingTop: '90px', maxWidth: '780px', margin: '0 auto', padding: '90px 20px 60px' }}>
            {/* Hero text */}
            <div style={{ textAlign: 'center', marginBottom: '36px', animation: 'fadeUp 0.5s ease' }}>
              <div style={{ display: 'inline-block', padding: '4px 13px', borderRadius: '99px', background: 'rgba(45,74,62,0.08)', border: '1px solid rgba(45,74,62,0.15)', fontSize: '12px', fontWeight: 500, color: 'var(--forest)', marginBottom: '16px' }}>
                AI-powered travel discovery
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 6vw, 54px)', fontWeight: 600, lineHeight: 1.15, color: 'var(--ink)', marginBottom: '14px', letterSpacing: '-0.02em' }}>
                Where should you<br /><em style={{ color: 'var(--forest)' }}>go next?</em>
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--stone-600)', lineHeight: 1.7, fontWeight: 300, maxWidth: '460px', margin: '0 auto' }}>
                Tell us how you travel. Get honest, personalized recommendations — not generic lists.
              </p>
            </div>

            {/* Form card */}
            <div style={{ background: 'var(--warm-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--stone-100)', padding: '28px', animation: 'fadeUp 0.5s ease 0.1s both' }}>

              {/* Row 1: Origin + Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <InputField label="Travelling from *">
                  <input
                    type="text" placeholder="e.g. Delhi, Mumbai" value={form.origin}
                    onChange={e => updateForm('origin', e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                    onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
                  />
                </InputField>
                <InputField label="Start date">
                  <input type="date" value={form.startDate} onChange={e => updateForm('startDate', e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                    onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
                  />
                </InputField>
                <InputField label="End date">
                  <input type="date" value={form.endDate} onChange={e => updateForm('endDate', e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                    onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
                  />
                </InputField>
              </div>

              {/* Row 2: Days (auto) + Budget tier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <InputField label="Number of days">
                  <input
                    type="number" placeholder="Auto-calculated from dates" min="1" max="30"
                    value={form.days}
                    onChange={e => updateForm('days', e.target.value)}
                    style={{ ...inputStyle, background: form.startDate && form.endDate ? 'var(--stone-50)' : '#fff' }}
                    onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                    onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
                  />
                </InputField>
                <div />
              </div>

              {/* Budget tiers */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Budget per person</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {BUDGET_TIERS.map(t => (
                    <button key={t.value} onClick={() => updateForm('budget', form.budget === t.value ? '' : t.value)}
                      style={{
                        padding: '10px 6px', borderRadius: 'var(--radius-md)', fontSize: '11px',
                        border: `1.5px solid ${form.budget === t.value ? 'var(--forest)' : 'var(--stone-200)'}`,
                        background: form.budget === t.value ? 'var(--forest)' : '#fff',
                        color: form.budget === t.value ? '#fff' : 'var(--stone-600)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                        textAlign: 'center', lineHeight: 1.4,
                      }}>
                      <div style={{ fontSize: '16px', marginBottom: '3px' }}>{t.label.split(' ')[0]}</div>
                      <div style={{ fontWeight: 600, fontSize: '11px' }}>{t.label.split(' ').slice(1).join(' ')}</div>
                      <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Companions */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Travelling with</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COMPANIONS.map(c => (
                    <button key={c} onClick={() => updateForm('companions', form.companions === c ? '' : c)}
                      style={{
                        padding: '7px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 500,
                        border: `1.5px solid ${form.companions === c ? 'var(--forest)' : 'var(--stone-200)'}`,
                        background: form.companions === c ? 'var(--forest)' : '#fff',
                        color: form.companions === c ? '#fff' : 'var(--stone-600)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transport */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Preferred transport</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                  {TRANSPORTS.map(t => (
                    <button key={t.value} onClick={() => updateForm('transport', form.transport === t.value ? '' : t.value)}
                      style={{
                        padding: '10px 6px', borderRadius: 'var(--radius-md)', fontSize: '12px',
                        border: `1.5px solid ${form.transport === t.value ? 'var(--forest)' : 'var(--stone-200)'}`,
                        background: form.transport === t.value ? 'var(--forest)' : '#fff',
                        color: form.transport === t.value ? '#fff' : 'var(--stone-600)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                        textAlign: 'center', lineHeight: 1.4,
                      }}>
                      <div style={{ fontSize: '18px', marginBottom: '2px' }}>{t.label.split(' ')[0]}</div>
                      <div style={{ fontWeight: 500 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--stone-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Anything specific? <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--stone-400)' }}>(optional)</span></label>
                <textarea
                  placeholder="e.g. We love mountains and good food. My parents can't trek much. Looking for offbeat places..."
                  value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={2}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = 'var(--sage)'}
                  onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
                />
              </div>

              {/* Search button */}
              <button
                onClick={handleSearch}
                disabled={!canSearch || loading}
                style={{
                  width: '100%', padding: '15px', borderRadius: 'var(--radius-md)',
                  background: canSearch && !loading ? 'var(--forest)' : 'var(--stone-200)',
                  color: canSearch && !loading ? '#fff' : 'var(--stone-400)',
                  border: 'none', cursor: canSearch && !loading ? 'pointer' : 'not-allowed',
                  fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (canSearch && !loading) e.currentTarget.style.background = 'var(--forest-light)'; }}
                onMouseLeave={e => { if (canSearch && !loading) e.currentTarget.style.background = 'var(--forest)'; }}
              >
                {loading ? (
                  <><svg style={{ animation: 'spin-slow 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Finding the perfect destinations...</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Find my perfect destinations</>
                )}
              </button>

              {!canSearch && <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--stone-400)', marginTop: '8px' }}>Enter where you're travelling from to get started</p>}
            </div>

            {/* Value props */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '28px', animation: 'fadeUp 0.5s ease 0.3s both' }}>
              {[
                { icon: '🧭', title: 'Route-aware', desc: 'Recommends only what\'s reachable by your transport' },
                { icon: '⚠', title: 'Brutally honest', desc: 'Reality checks on every destination' },
                { icon: '📊', title: 'Suitability scores', desc: 'Rated for your exact travel group' },
                { icon: '✈', title: 'Pre-filled booking', desc: 'Flights, hotels and trains with your dates' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--warm-white)', borderRadius: 'var(--radius-lg)', padding: '16px', border: '1px solid var(--stone-100)' }}>
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--stone-600)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 'results' && (
          <section style={{ paddingTop: '74px', maxWidth: '1120px', margin: '0 auto', padding: '74px 20px 60px' }}>
            {/* Back + search summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <button onClick={() => setStep('form')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid var(--stone-200)', borderRadius: 'var(--radius-sm)', padding: '7px 14px', fontSize: '13px', color: 'var(--stone-600)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                ← Refine search
              </button>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  form.origin && `📍 ${form.origin}`,
                  form.companions && `👥 ${form.companions}`,
                  form.transport && TRANSPORTS.find(t => t.value === form.transport)?.label,
                  form.days && `${form.days} days`,
                  form.budget && BUDGET_TIERS.find(t => t.value === form.budget)?.label,
                ].filter(Boolean).map((tag, i) => (
                  <span key={i} style={{ padding: '4px 11px', background: 'var(--warm-white)', border: '1px solid var(--stone-200)', borderRadius: '99px', fontSize: '12px', color: 'var(--stone-600)' }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Interpretation */}
            {result?.interpretation && (
              <div style={{ background: 'var(--warm-white)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '24px', border: '1px solid var(--stone-100)', display: 'flex', gap: '12px', alignItems: 'flex-start', animation: 'fadeUp 0.4s ease' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M8 20 L16 10 L24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>ZoveAI</div>
                  <p style={{ fontSize: '14px', color: 'var(--stone-800)', lineHeight: 1.65, fontStyle: 'italic' }}>"{result.interpretation}"</p>
                </div>
              </div>
            )}

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '22px' }}>
              {loading ? [0,1,2].map(i => <SkeletonCard key={i} delay={i * 0.1} />)
                : result?.destinations.map((dest, i) => (
                  <DestinationCard key={i} dest={dest} index={i}
                    isUnlocked={!!session || unlockedCards.has(i)}
                    onUnlock={() => handleUnlock(i)}
                  />
                ))
              }
            </div>

            {error && <div style={{ background: '#FEF3EE', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginTop: '16px', border: '1px solid rgba(212,97,74,0.2)', color: 'var(--coral)', fontSize: '14px' }}>{error}</div>}
          </section>
        )}

        <footer style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid var(--stone-100)', fontSize: '12px', color: 'var(--stone-400)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 500, color: 'var(--stone-600)', marginRight: '6px' }}>ZoveAI</span>
          · AI-powered travel discovery · Free to use
        </footer>
      </div>
    </>
  );
}
