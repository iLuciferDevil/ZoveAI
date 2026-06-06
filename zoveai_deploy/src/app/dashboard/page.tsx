'use client';
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TRAVEL_STYLES = ['Adventure', 'Relaxed', 'Luxury', 'Budget', 'Cultural', 'Food Explorer', 'Nature Lover', 'Spiritual', 'Hidden Gems', 'Photography'];
const COMPANION_TYPES = ['Solo', 'Couple', 'Friends', 'Family with kids', 'With parents', 'Group'];
const TRANSPORT_PREFS = ['Car / Road Trip', 'Motorcycle', 'Train', 'Flight', 'Bus', 'Bicycle'];
const FITNESS_LEVELS = ['Low — flat walks only', 'Medium — moderate hikes ok', 'High — any trek welcome'];
const RISK_APPETITES = ['Low — safe & comfortable', 'Medium — some adventure ok', 'High — bring on the wild'];
const BUCKET_LIST_REGIONS = ['Himalayas', 'Rajasthan', 'Northeast India', 'Kerala & South', 'Goa', 'Southeast Asia', 'Europe', 'Japan', 'Africa', 'Americas', 'Middle East', 'Central Asia'];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'trips' | 'passport'>('profile');

  const [profile, setProfile] = useState({
    name: '',
    city: '',
    travelStyles: [] as string[],
    companions: [] as string[],
    transport: [] as string[],
    fitness: '',
    riskAppetite: '',
    bucketList: [] as string[],
    visitedPlaces: '',
    lovedPlaces: '',
    avoidPlaces: '',
    bio: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (session?.user) {
      setProfile(prev => ({ ...prev, name: session.user?.name || '' }));
      // Load saved profile from localStorage for now
      try {
        const saved = localStorage.getItem('zove_profile');
        if (saved) setProfile(JSON.parse(saved));
      } catch {}
    }
  }, [session, status, router]);

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('zove_profile', JSON.stringify(profile));
      await new Promise(r => setTimeout(r, 600));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Loading...</div>
    </div>
  );

  const s: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', padding: '13px 16px', fontSize: '14px',
    fontFamily: "'DM Sans', system-ui, sans-serif", color: '#F5F0E8',
    outline: 'none', width: '100%', transition: 'border-color 0.2s',
  };

  const chipStyle = (sel: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: '99px',
    background: sel ? 'rgba(212,133,74,0.2)' : 'rgba(255,255,255,0.06)',
    color: sel ? '#E8A46A' : 'rgba(255,255,255,0.6)',
    outline: `1px solid ${sel ? 'rgba(212,133,74,0.4)' : 'rgba(255,255,255,0.1)'}`,
    border: 'none',
    fontSize: '13px', fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'all 0.15s', cursor: 'pointer',
  });

  const sectionLabel: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D0F0E', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 28px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(13,15,14,0.95)', backdropFilter: 'blur(20px)', zIndex: 100 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="rgba(122,158,130,0.2)" stroke="rgba(122,158,130,0.4)" strokeWidth="1"/><path d="M9 20 L16 10 L23 20" stroke="#7A9E82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="16" cy="10" r="1.8" fill="#D4854A"/></svg>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#F5F0E8' }}>ZoveAI</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>← Plan a trip</Link>
          <button onClick={() => signOut({ callbackUrl: '/' })} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: "'DM Sans', system-ui" }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
          {session?.user?.image
            ? <img src={session.user.image} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(122,158,130,0.4)' }} />
            : <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #D4854A, #E8A46A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>✦</div>
          }
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, color: '#F5F0E8', marginBottom: '4px' }}>
              {session?.user?.name?.split(' ')[0] || 'Traveller'}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{session?.user?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '32px', width: 'fit-content' }}>
          {(['profile', 'trips', 'passport'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', system-ui", fontSize: '13px', fontWeight: 500, transition: 'all 0.2s', background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === tab ? '#F5F0E8' : 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
              {tab === 'profile' ? '🧬 Travel DNA' : tab === 'trips' ? '🗺 Saved Trips' : '🌍 Passport'}
            </button>
          ))}
        </div>

        {/* TRAVEL DNA TAB */}
        {activeTab === 'profile' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px', lineHeight: 1.6 }}>
              Your Travel DNA helps ZoveAI give you better recommendations over time. The more you fill in, the smarter it gets.
            </p>

            <div style={{ display: 'grid', gap: '28px' }}>
              {/* Basic info */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#F5F0E8', marginBottom: '20px' }}>About You</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <span style={sectionLabel}>Your name</span>
                    <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="How should we call you?" style={s}
                      onFocus={e => e.target.style.borderColor = 'rgba(212,133,74,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                    />
                  </div>
                  <div>
                    <span style={sectionLabel}>Home city</span>
                    <input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Where do you usually travel from?" style={s}
                      onFocus={e => e.target.style.borderColor = 'rgba(212,133,74,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '14px' }}>
                  <span style={sectionLabel}>One-line traveller bio (optional)</span>
                  <input value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="e.g. Weekend biker who loves offbeat food and quiet mountains" style={s}
                    onFocus={e => e.target.style.borderColor = 'rgba(212,133,74,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                  />
                </div>
              </div>

              {/* Travel style */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#F5F0E8', marginBottom: '6px' }}>Travel Style</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Pick everything that describes you</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {TRAVEL_STYLES.map(s => <button key={s} onClick={() => setProfile(p => ({ ...p, travelStyles: toggle(p.travelStyles, s) }))} style={chipStyle(profile.travelStyles.includes(s))}>{s}</button>)}
                </div>
              </div>

              {/* Companions */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#F5F0E8', marginBottom: '6px' }}>How You Travel</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Who do you usually travel with?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                  {COMPANION_TYPES.map(c => <button key={c} onClick={() => setProfile(p => ({ ...p, companions: toggle(p.companions, c) }))} style={chipStyle(profile.companions.includes(c))}>{c}</button>)}
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Preferred transport</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {TRANSPORT_PREFS.map(t => <button key={t} onClick={() => setProfile(p => ({ ...p, transport: toggle(p.transport, t) }))} style={chipStyle(profile.transport.includes(t))}>{t}</button>)}
                </div>
              </div>

              {/* Physical */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#F5F0E8', marginBottom: '20px' }}>Fitness & Risk</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <span style={sectionLabel}>Fitness level</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {FITNESS_LEVELS.map(f => (
                        <button key={f} onClick={() => setProfile(p => ({ ...p, fitness: f }))}
                          style={{ ...chipStyle(profile.fitness === f), textAlign: 'left', borderRadius: '10px', padding: '10px 14px' }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={sectionLabel}>Risk appetite</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {RISK_APPETITES.map(r => (
                        <button key={r} onClick={() => setProfile(p => ({ ...p, riskAppetite: r }))}
                          style={{ ...chipStyle(profile.riskAppetite === r), textAlign: 'left', borderRadius: '10px', padding: '10px 14px' }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Places */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#F5F0E8', marginBottom: '20px' }}>Your Travel History</h3>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {[
                    { key: 'visitedPlaces', label: 'Places I\'ve already been', placeholder: 'e.g. Goa, Manali, Coorg, Singapore, Thailand...' },
                    { key: 'lovedPlaces', label: 'Places I absolutely loved', placeholder: 'e.g. Spiti Valley, Hampi — and why if you want' },
                    { key: 'avoidPlaces', label: 'Places I never want suggested again', placeholder: 'e.g. Shimla (too crowded), Manali (been twice)' },
                  ].map(field => (
                    <div key={field.key}>
                      <span style={sectionLabel}>{field.label}</span>
                      <textarea value={(profile as any)[field.key]} onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder} rows={2}
                        style={{ ...s, resize: 'none', lineHeight: 1.6 }}
                        onFocus={e => e.target.style.borderColor = 'rgba(212,133,74,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bucket list */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#F5F0E8', marginBottom: '6px' }}>Bucket List Regions</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Where do you dream of going?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {BUCKET_LIST_REGIONS.map(r => <button key={r} onClick={() => setProfile(p => ({ ...p, bucketList: toggle(p.bucketList, r) }))} style={chipStyle(profile.bucketList.includes(r))}>{r}</button>)}
                </div>
              </div>

              {/* Save button */}
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '16px', borderRadius: '14px', background: saved ? 'rgba(76,175,80,0.2)' : 'linear-gradient(135deg, #D4854A, #E8A46A)', color: '#fff', border: saved ? '1px solid rgba(76,175,80,0.4)' : 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: "'DM Sans', system-ui", transition: 'all 0.2s', boxShadow: saved ? 'none' : '0 8px 30px rgba(212,133,74,0.25)' }}>
                {saving ? 'Saving...' : saved ? '✓ Travel DNA saved' : 'Save Travel DNA'}
              </button>
            </div>
          </div>
        )}

        {/* SAVED TRIPS TAB */}
        {activeTab === 'trips' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺</div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, color: '#F5F0E8', marginBottom: '8px' }}>No saved trips yet</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>When you find a destination you love, save it here to plan later.</p>
              <Link href="/" style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg, #D4854A, #E8A46A)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 500 }}>
                Discover destinations →
              </Link>
            </div>
          </div>
        )}

        {/* PASSPORT TAB */}
        {activeTab === 'passport' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              {[
                { icon: '✈', label: 'Trips taken', value: '0', sub: 'Log your first trip' },
                { icon: '🌍', label: 'Countries', value: '0', sub: 'Countries visited' },
                { icon: '📍', label: 'Cities', value: '0', sub: 'Cities explored' },
              ].map((stat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>{stat.icon}</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 400, color: '#D4854A', marginBottom: '4px' }}>{stat.value}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F0E8', marginBottom: '2px' }}>{stat.label}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{stat.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Your travel passport fills up as you log trips and explore destinations. Coming soon — full trip logging with photos and memories.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
