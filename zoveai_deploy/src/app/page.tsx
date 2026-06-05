'use client';
import React, { useState, useRef, useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
interface SuitabilityScores {
  couple: number; family: number; solo: number; elderly_parents: number;
  adventure: number; relaxation: number; food: number; culture: number;
}
interface DaySketch { day: number; title: string; highlight: string; }
interface Destination {
  name: string; country: string; region: string; tagline: string;
  hero_image_query: string; why_recommended: string; best_for: string[];
  estimated_cost: { budget_per_day: string; currency_note: string };
  best_time: string; duration_ideal: string; getting_there: string;
  suitability_scores: SuitabilityScores; reality_check: string[];
  day_sketch: DaySketch[];
  booking_hooks: { flights_query: string; hotels_query: string; trains_query: string; activities_query: string };
}
interface RecommendationResult { interpretation: string; destinations: Destination[]; }

// ── Example prompts ────────────────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  "Mountain trip with my wife for 4 days, budget ₹25,000, we love good food and views",
  "Solo offbeat motorcycle trip under 400km, high adventure, avoid tourist crowds",
  "My parents are 68 and 70, can't trek much — peaceful hill station within 6 hours of Delhi",
  "Couple trip to Southeast Asia for 10 days, first time abroad, mid-budget, beach + culture mix",
  "I need a complete reset — solo, remote, rivers and forests, no wifi if possible",
  "Family of 4 with kids aged 8 and 11, Europe in summer, educational but fun",
];

// ── Unsplash image helper ──────────────────────────────────────────────────
const getImageUrl = (query: string, idx: number) => {
  const encoded = encodeURIComponent(query);
  // Using picsum for reliable images with consistent seed per destination
  const seed = query.split('').reduce((a, c) => a + c.charCodeAt(0), idx * 100);
  return `https://picsum.photos/seed/${seed}/800/500`;
};

// ── Score bar ──────────────────────────────────────────────────────────────
function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? '#2D4A3E' : score >= 6 ? '#C4853A' : '#9E8E74';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: 'var(--stone-600)', width: '90px', flexShrink: 0, textTransform: 'capitalize' }}>{label}</span>
      <div style={{ flex: 1, height: '4px', background: 'var(--stone-100)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${score * 10}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color, width: '20px', textAlign: 'right' }}>{score}</span>
    </div>
  );
}

// ── Destination Card ───────────────────────────────────────────────────────
function DestinationCard({
  dest, index, isUnlocked, onUnlock
}: { dest: Destination; index: number; isUnlocked: boolean; onUnlock: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const imgUrl = getImageUrl(dest.hero_image_query, index);

  return (
    <div style={{
      background: 'var(--warm-white)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--stone-100)',
      animation: `fadeUp 0.5s ease ${index * 0.12}s both`,
    }}>
      {/* Hero Image */}
      <div style={{ position: 'relative', height: '220px', overflow: 'hidden', background: 'var(--stone-100)' }}>
        {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
        <img
          src={imgUrl}
          alt={dest.name}
          onLoad={() => setImgLoaded(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.4s ease',
          }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(26,20,16,0.7) 0%, rgba(26,20,16,0.1) 50%, transparent 100%)'
        }} />
        {/* Location badge */}
        <div style={{
          position: 'absolute', top: '14px', left: '14px',
          background: 'rgba(249,246,240,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: '99px', padding: '4px 12px',
          fontSize: '11px', fontWeight: 600, color: 'var(--stone-800)',
          border: '1px solid rgba(255,255,255,0.5)',
        }}>
          {dest.country} · {dest.region}
        </div>
        {/* Destination name on image */}
        <div style={{ position: 'absolute', bottom: '16px', left: '18px', right: '18px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
            {dest.name}
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', marginTop: '4px', fontStyle: 'italic' }}>
            {dest.tagline}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '20px 22px' }}>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {dest.best_for.map((tag, i) => (
            <span key={i} style={{
              padding: '3px 10px', borderRadius: '99px',
              fontSize: '11px', fontWeight: 500,
              background: 'var(--stone-50)', color: 'var(--stone-600)',
              border: '1px solid var(--stone-100)',
            }}>{tag}</span>
          ))}
        </div>

        {/* Why recommended */}
        <p style={{ fontSize: '14px', color: 'var(--stone-800)', lineHeight: 1.65, marginBottom: '16px' }}>
          {dest.why_recommended}
        </p>

        {/* Quick stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px', marginBottom: '16px',
        }}>
          {[
            { label: 'Best Time', value: dest.best_time, icon: '🗓' },
            { label: 'Duration', value: dest.duration_ideal, icon: '⏱' },
            { label: 'Per Day', value: dest.estimated_cost.budget_per_day, icon: '💰' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'var(--stone-50)', borderRadius: 'var(--radius-sm)',
              padding: '10px 12px', border: '1px solid var(--stone-100)',
            }}>
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>{stat.icon}</div>
              <div style={{ fontSize: '11px', color: 'var(--stone-400)', marginBottom: '2px' }}>{stat.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Soft wall — gated content */}
        {!isUnlocked ? (
          <div style={{ position: 'relative' }}>
            {/* Blurred preview of locked content */}
            <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.6, marginBottom: '16px' }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--stone-600)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suitability Scores</div>
                {Object.entries(dest.suitability_scores).slice(0, 3).map(([k, v]) => (
                  <ScoreBar key={k} label={k.replace('_', ' ')} score={v} />
                ))}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--coral)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠ Reality Check</div>
                {dest.reality_check.slice(0, 2).map((w, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--stone-600)', padding: '6px 10px', background: '#FEF3EE', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }}>
                    {w}
                  </div>
                ))}
              </div>
            </div>

            {/* Unlock overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px',
            }}>
              <button
                onClick={onUnlock}
                style={{
                  background: 'var(--forest)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  padding: '13px 28px', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  boxShadow: '0 4px 20px rgba(45,74,62,0.35)',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--forest-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--forest)')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Unlock full details — it's free
              </button>
              <p style={{ fontSize: '11px', color: 'var(--stone-400)', textAlign: 'center' }}>
                Suitability scores · Reality check · Day-by-day sketch · Booking links
              </p>
            </div>
          </div>
        ) : (
          /* Unlocked full content */
          <div style={{ animation: 'fadeIn 0.4s ease' }}>

            {/* Suitability scores */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--stone-600)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Suitability Scores
              </div>
              {Object.entries(dest.suitability_scores).map(([k, v]) => (
                <ScoreBar key={k} label={k.replace('_', ' ')} score={v} />
              ))}
            </div>

            {/* Reality check */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--coral)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚠ Reality Check
              </div>
              {dest.reality_check.map((warning, i) => (
                <div key={i} style={{
                  fontSize: '13px', color: 'var(--stone-800)', padding: '8px 12px',
                  background: '#FEF3EE', borderRadius: 'var(--radius-sm)',
                  marginBottom: '6px', lineHeight: 1.5,
                  borderLeft: '3px solid var(--coral)',
                }}>
                  {warning}
                </div>
              ))}
            </div>

            {/* Day sketch */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--stone-600)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                3-Day Sketch
              </div>
              {dest.day_sketch.map((day, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: 'var(--forest)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700,
                  }}>
                    {day.day}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px' }}>{day.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--stone-600)' }}>{day.highlight}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Getting there */}
            <div style={{
              background: 'var(--stone-50)', borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', marginBottom: '16px',
              border: '1px solid var(--stone-100)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--stone-400)', marginBottom: '3px', textTransform: 'uppercase' }}>Getting There</div>
              <div style={{ fontSize: '13px', color: 'var(--stone-800)' }}>{dest.getting_there}</div>
            </div>

            {/* Booking links */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--stone-600)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Book This Trip
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: '✈ Flights', query: dest.booking_hooks.flights_query, url: `https://www.skyscanner.com/transport/flights-from/in/?query=${encodeURIComponent(dest.booking_hooks.flights_query)}` },
                  { label: '🏨 Hotels', query: dest.booking_hooks.hotels_query, url: `https://www.booking.com/search.html?ss=${encodeURIComponent(dest.name)}` },
                  { label: '🚆 Trains', query: dest.booking_hooks.trains_query, url: `https://www.rome2rio.com/s/${encodeURIComponent(dest.name)}` },
                  { label: '🎭 Activities', query: dest.booking_hooks.activities_query, url: `https://www.viator.com/search/${encodeURIComponent(dest.name)}` },
                ].map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block', padding: '9px 12px',
                      background: '#fff', border: '1px solid var(--stone-200)',
                      borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                      fontSize: '12px', fontWeight: 500, color: 'var(--forest)',
                      textAlign: 'center', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--forest)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--forest)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--forest)'; e.currentTarget.style.borderColor = 'var(--stone-200)'; }}
                  >
                    {link.label}
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
function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (name: string) => void }) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate auth
    onSuccess(name || email.split('@')[0]);
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.6)', backdropFilter: 'blur(4px)' }}
      />
      {/* Modal */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--warm-white)', borderRadius: 'var(--radius-xl)',
        padding: '36px', width: '100%', maxWidth: '420px',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeUp 0.3s ease',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone-400)', fontSize: '20px' }}
        >×</button>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>
            {mode === 'signup' ? 'Join ZoveAI' : 'Welcome back'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--stone-600)' }}>
            {mode === 'signup'
              ? 'Free forever. Unlock full destination details, suitability scores, and honest reality checks.'
              : 'Sign in to access your saved trips and recommendations.'}
          </p>
        </div>

        {/* Google button */}
        <button style={{
          width: '100%', padding: '13px', borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--stone-200)', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--font-body)', marginBottom: '16px',
          transition: 'all 0.15s ease', color: 'var(--ink)',
        }}
          onClick={handleSubmit}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--stone-50)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--stone-100)' }} />
          <span style={{ fontSize: '12px', color: 'var(--stone-400)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--stone-100)' }} />
        </div>

        {mode === 'signup' && (
          <input
            type="text" placeholder="Your name (optional)" value={name}
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--stone-200)', background: '#fff',
              fontSize: '14px', fontFamily: 'var(--font-body)', marginBottom: '10px',
              outline: 'none', color: 'var(--ink)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--sage)'}
            onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
          />
        )}
        <input
          type="email" placeholder="Email address" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--stone-200)', background: '#fff',
            fontSize: '14px', fontFamily: 'var(--font-body)', marginBottom: '12px',
            outline: 'none', color: 'var(--ink)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--sage)'}
          onBlur={e => e.target.style.borderColor = 'var(--stone-200)'}
        />
        <button
          onClick={handleSubmit}
          disabled={!email || loading}
          style={{
            width: '100%', padding: '13px', borderRadius: 'var(--radius-md)',
            background: loading || !email ? 'var(--stone-200)' : 'var(--forest)',
            color: '#fff', border: 'none', cursor: !email ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)',
            transition: 'background 0.15s ease',
          }}
        >
          {loading ? 'Signing in...' : mode === 'signup' ? 'Create free account' : 'Sign in with email'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--stone-400)', marginTop: '16px' }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--forest)', fontWeight: 500, fontSize: '12px' }}
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--stone-400)', marginTop: '8px' }}>
          No credit card. No spam. Cancel anytime (not that there's anything to cancel).
        </p>
      </div>
    </div>
  );
}

// ── Loading skeleton cards ─────────────────────────────────────────────────
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div style={{
      background: 'var(--warm-white)', borderRadius: 'var(--radius-xl)',
      overflow: 'hidden', boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--stone-100)',
      animation: `fadeUp 0.4s ease ${delay}s both`,
    }}>
      <div className="skeleton" style={{ height: '220px' }} />
      <div style={{ padding: '20px 22px' }}>
        <div className="skeleton" style={{ height: '14px', width: '60%', marginBottom: '10px' }} />
        <div className="skeleton" style={{ height: '12px', width: '100%', marginBottom: '6px' }} />
        <div className="skeleton" style={{ height: '12px', width: '85%', marginBottom: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: '64px' }} />)}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [unlockedCards, setUnlockedCards] = useState<Set<number>>(new Set());
  const [pendingUnlock, setPendingUnlock] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [query]);

  // Scroll to results when they arrive
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    setUnlockedCards(new Set());
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setResult(data); }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (cardIndex: number) => {
    if (user) {
      setUnlockedCards(prev => new Set([...prev, cardIndex]));
    } else {
      setPendingUnlock(cardIndex);
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = (name: string) => {
    setUser({ name });
    setShowAuth(false);
    if (pendingUnlock !== null) {
      setUnlockedCards(prev => new Set([...prev, pendingUnlock]));
      setPendingUnlock(null);
    }
  };

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}

      <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

        {/* ── Nav ── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', height: '60px',
          background: 'rgba(249,246,240,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--stone-100)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" fill="var(--forest)" />
              <path d="M8 20 L16 10 L24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="16" cy="10" r="2.5" fill="var(--amber-light)"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>
              ZoveAI
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <span style={{ fontSize: '13px', color: 'var(--stone-600)' }}>
                Hi, <strong style={{ color: 'var(--forest)' }}>{user.name}</strong> ✈
              </span>
            ) : (
              <>
                <button
                  onClick={() => setShowAuth(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--stone-600)', fontFamily: 'var(--font-body)' }}
                >Sign in</button>
                <button
                  onClick={() => setShowAuth(true)}
                  style={{
                    background: 'var(--forest)', color: '#fff', border: 'none',
                    borderRadius: 'var(--radius-sm)', padding: '8px 16px',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >Get started</button>
              </>
            )}
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{
          paddingTop: '100px', paddingBottom: '60px',
          textAlign: 'center', padding: '120px 24px 60px',
          maxWidth: '800px', margin: '0 auto',
        }}>
          <div style={{
            display: 'inline-block', padding: '5px 14px', borderRadius: '99px',
            background: 'rgba(45,74,62,0.08)', border: '1px solid rgba(45,74,62,0.15)',
            fontSize: '12px', fontWeight: 500, color: 'var(--forest)',
            marginBottom: '20px', letterSpacing: '0.03em',
          }}>
            AI-powered travel discovery
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 58px)',
            fontWeight: 600, lineHeight: 1.15, color: 'var(--ink)',
            marginBottom: '18px', letterSpacing: '-0.02em',
          }}>
            Where should you<br />
            <em style={{ color: 'var(--forest)' }}>go next?</em>
          </h1>
          <p style={{
            fontSize: '17px', color: 'var(--stone-600)', lineHeight: 1.7,
            maxWidth: '520px', margin: '0 auto 36px', fontWeight: 300,
          }}>
            Not a booking site. Not a search engine.<br />
            An AI that knows <em>you</em> — and gives honest answers.
          </p>

          {/* ── Search box ── */}
          <div style={{
            background: 'var(--warm-white)', borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--stone-100)',
            overflow: 'hidden', maxWidth: '680px', margin: '0 auto',
          }}>
            <div style={{ padding: '20px 22px 0' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Tell me about your trip
              </label>
              <textarea
                ref={textareaRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
                placeholder="e.g. Mountain trip with my wife for 4 days, budget ₹20K, we love good food and peaceful views..."
                rows={2}
                style={{
                  width: '100%', border: 'none', outline: 'none', resize: 'none',
                  fontSize: '15px', fontFamily: 'var(--font-body)', color: 'var(--ink)',
                  background: 'transparent', lineHeight: 1.6, minHeight: '48px',
                }}
              />
            </div>
            <div style={{ padding: '12px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--stone-100)', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--stone-400)' }}>Be as specific as you like · Enter to search</span>
              <button
                onClick={handleSearch}
                disabled={!query.trim() || loading}
                style={{
                  background: query.trim() && !loading ? 'var(--forest)' : 'var(--stone-200)',
                  color: query.trim() && !loading ? '#fff' : 'var(--stone-400)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  padding: '10px 22px', fontSize: '14px', fontWeight: 600,
                  cursor: query.trim() && !loading ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (query.trim() && !loading) e.currentTarget.style.background = 'var(--forest-light)'; }}
                onMouseLeave={e => { if (query.trim() && !loading) e.currentTarget.style.background = 'var(--forest)'; }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: 'spin-slow 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    Finding destinations...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    Find destinations
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Example prompts */}
          {!result && !loading && (
            <div style={{ marginTop: '28px', animation: 'fadeUp 0.5s ease 0.3s both' }}>
              <p style={{ fontSize: '12px', color: 'var(--stone-400)', marginBottom: '12px' }}>Try asking:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {EXAMPLE_PROMPTS.slice(0, 4).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(prompt)}
                    style={{
                      background: 'var(--warm-white)', border: '1px solid var(--stone-200)',
                      borderRadius: 'var(--radius-sm)', padding: '7px 13px',
                      fontSize: '12px', color: 'var(--stone-600)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'all 0.15s ease',
                      textAlign: 'left', lineHeight: 1.4,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--stone-50)'; e.currentTarget.style.color = 'var(--forest)'; e.currentTarget.style.borderColor = 'var(--sage)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--warm-white)'; e.currentTarget.style.color = 'var(--stone-600)'; e.currentTarget.style.borderColor = 'var(--stone-200)'; }}
                  >
                    {prompt.length > 55 ? prompt.slice(0, 55) + '...' : prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Results ── */}
        {(loading || result || error) && (
          <section ref={resultsRef} style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>

            {/* Interpretation */}
            {result?.interpretation && !loading && (
              <div style={{
                background: 'var(--warm-white)', borderRadius: 'var(--radius-lg)',
                padding: '18px 22px', marginBottom: '28px',
                border: '1px solid var(--stone-100)', boxShadow: 'var(--shadow-sm)',
                display: 'flex', gap: '14px', alignItems: 'flex-start',
                animation: 'fadeUp 0.4s ease',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                    <path d="M8 20 L16 10 L24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>ZoveAI</div>
                  <p style={{ fontSize: '15px', color: 'var(--stone-800)', lineHeight: 1.65, fontStyle: 'italic' }}>
                    "{result.interpretation}"
                  </p>
                </div>
              </div>
            )}

            {/* Cards grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}>
              {loading ? (
                [0, 1, 2].map(i => <SkeletonCard key={i} delay={i * 0.1} />)
              ) : (
                result?.destinations.map((dest, i) => (
                  <DestinationCard
                    key={i} dest={dest} index={i}
                    isUnlocked={user !== null || unlockedCards.has(i)}
                    onUnlock={() => handleUnlock(i)}
                  />
                ))
              )}
            </div>

            {error && (
              <div style={{
                background: '#FEF3EE', borderRadius: 'var(--radius-md)',
                padding: '16px 20px', border: '1px solid rgba(212,97,74,0.2)',
                color: 'var(--coral)', fontSize: '14px',
              }}>
                {error}
              </div>
            )}
          </section>
        )}

        {/* ── Value props (show when no results) ── */}
        {!result && !loading && (
          <section style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px 80px', animation: 'fadeUp 0.5s ease 0.4s both' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px',
            }}>
              {[
                { icon: '🧭', title: 'Truly personalized', desc: 'Understands your travel style, budget, companions, and history — not just your destination.' },
                { icon: '🎯', title: 'Honest, not promotional', desc: 'Every destination comes with a Reality Check — real warnings tourists often discover too late.' },
                { icon: '📊', title: 'Suitability scores', desc: 'Rated for couples, solo travel, elderly parents, kids, adventure, accessibility, and more.' },
                { icon: '✈', title: 'Book in one click', desc: 'Flights, hotels, trains, and activities — all linked once you know where you want to go.' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'var(--warm-white)', borderRadius: 'var(--radius-lg)',
                  padding: '22px', border: '1px solid var(--stone-100)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>{item.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--stone-600)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer style={{
          textAlign: 'center', padding: '24px',
          borderTop: '1px solid var(--stone-100)',
          fontSize: '12px', color: 'var(--stone-400)',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 500, color: 'var(--stone-600)', marginRight: '8px' }}>ZoveAI</span>
          · AI-powered travel discovery · Free to use
        </footer>
      </div>
    </>
  );
}
