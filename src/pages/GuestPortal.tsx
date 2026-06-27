import { useState } from 'react';
import {
  Phone, Search, MapPin, BedDouble, Building2, Users, ChevronRight,
  Heart, Sparkles, ArrowLeft, ExternalLink, PhoneCall, Navigation,
  DoorOpen, Layers, User, MailOpen
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ── Event Constants ──────────────────────────────────────────────
const EVENT = {
  couple: 'Dharshan & Amulya',
  date: '05 Jul 2026',
  eInviteUrl: 'https://dharshan-amulya-inviation.netlify.app/',
  mandapamUrl: 'https://maps.app.goo.gl/gvPnU5aRGoMvWJkH6',
  mandapamName: 'Wedding Mandapam',
};

interface GuestDirectoryItem {
  room_no: string;
  floor: string | null;
  guest_name: string | null;
  sub_guests?: string[] | null;
}

interface GuestRoom {
  room_no: string;
  room_type: string | null;
  bed_config: string;
  floor: string | null;
}

interface GuestLodge {
  name: string;
  address: string | null;
  maps_link: string | null;
  contacts: { name: string; phone: string; role: string }[] | null;
  incharge_name: string | null;
  incharge_contact: string | null;
  show_directory: boolean;
  directory: GuestDirectoryItem[] | null;
}

interface GuestResult {
  name: string;
  party_size: number | null;
  side: string | null;
  hometown: string | null;
  sub_guests: { name: string }[] | null;
  room: GuestRoom | null;
  lodge: GuestLodge | null;
  keys_given: string | null;
}

function LodgeDirectory({ directory }: { directory: GuestDirectoryItem[] }) {
  const [query, setQuery] = useState('');
  
  const filtered = directory.filter(item => {
    const q = query.toLowerCase();
    return (
      item.room_no.toLowerCase().includes(q) ||
      (item.guest_name && item.guest_name.toLowerCase().includes(q)) ||
      (item.floor && item.floor.toLowerCase().includes(q)) ||
      (item.sub_guests && item.sub_guests.some(name => name.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="guest-card guest-directory-card">
      <div className="guest-card-header" style={{ marginBottom: '12px' }}>
        <Building2 className="w-4 h-4" />
        <span>Lodge Room Directory</span>
      </div>
      
      <div className="guest-search-input" style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(180, 100, 70, 0.25)', borderRadius: '10px', background: 'white', padding: '8px 12px', gap: '8px', marginBottom: '12px' }}>
        <Search className="w-4 h-4 text-amber-600" />
        <input
          type="text"
          placeholder="Search by name or room number..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: 'var(--text)', background: 'transparent' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
        {filtered.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid #f0e6d6', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                {item.guest_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Vacant</span>}
              </span>
              
              {item.sub_guests && item.sub_guests.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
                  With: {item.sub_guests.join(', ')}
                </span>
              )}

              {item.floor && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.floor}</span>
              )}
            </div>
            <div style={{ padding: '4px 10px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#78350f', whiteSpace: 'nowrap' }}>
              Room {item.room_no}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
            No rooms found matching "{query}"
          </p>
        )}
      </div>
    </div>
  );
}

export function GuestPortal() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestResult[] | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/guest-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.found) {
        setError(data.error || 'No room found for this number.');
        setGuests(null);
      } else {
        setGuests(data.guests);
      }
    } catch {
      setError('Unable to connect. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setGuests(null);
    setError(null);
    setPhone('');
  };

  // ── Phone Login Screen ──────────────────────────────────────────
  if (!guests) {
    return (
      <div className="guest-portal">
        <div className="guest-login">
          {/* Decorative top */}
          <div className="guest-login-decor">
            <div className="guest-login-decor-ring" />
            <div className="guest-login-decor-ring guest-login-decor-ring-2" />
          </div>

          <div className="guest-login-icon">
            <Heart className="w-8 h-8" />
          </div>

          <div className="guest-login-header">
            <h1 className="guest-login-couple">{EVENT.couple}</h1>
            <p className="guest-login-date">
              <Sparkles className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', marginTop: '-2px' }} />
              {EVENT.date}
            </p>
          </div>

          <div className="guest-login-action-header">
            <h2 className="guest-login-main-title">Lodge & Room Finder</h2>
            <p className="guest-login-main-sub">Find your assigned wedding accommodation</p>
          </div>

          <form onSubmit={handleLookup} className="guest-login-form">
            <div className="guest-phone-input">
              <div className="guest-phone-prefix">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                maxLength={10}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="guest-lookup-btn"
              disabled={loading || phone.length < 10}
            >
              {loading ? (
                <span className="guest-btn-loading">
                  <Search className="w-5 h-5 animate-spin" />
                  Looking up…
                </span>
              ) : (
                <span className="guest-btn-content">
                  <Search className="w-5 h-5" />
                  Find My Room
                </span>
              )}
            </button>
          </form>

          {error && (
            <div className="guest-error">
              {error}
            </div>
          )}

          <p className="guest-login-hint">
            Enter the phone number you shared with us during invitation
          </p>

          {/* Quick Links on Login Screen */}
          <div className="guest-card guest-links-card" style={{ width: '100%', marginTop: '30px' }}>
            <div className="guest-card-header">
              <Sparkles className="w-4 h-4" />
              <span>Wedding Info & Invitation</span>
            </div>
            <div className="guest-links-grid">
              {EVENT.eInviteUrl && (
                <a
                  href={EVENT.eInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-link-btn guest-link-invite"
                >
                  <MailOpen className="w-5 h-5" />
                  <span>E-Invite</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {EVENT.mandapamUrl && (
                <a
                  href={EVENT.mandapamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guest-link-btn guest-link-mandapam"
                >
                  <MapPin className="w-5 h-5" />
                  <span>Venue Location</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Guest Dashboard ──────────────────────────────────────────────
  return (
    <div className="guest-portal">
      <div className="guest-dashboard">
        {/* Back button */}
        <button className="guest-back-btn" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
          Change Number
        </button>

        {guests.map((guest, gi) => (
          <div key={gi} className="guest-info-container">
            {/* Welcome Card */}
            <div className="guest-card guest-welcome-card">
              <div className="guest-welcome-header">
                <div className="guest-avatar">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="guest-welcome-name">Welcome, {guest.name}!</h2>
                  <p className="guest-welcome-meta">
                    {guest.side === 'bride' ? '👰 Bride Side' : '🤵 Groom Side'}
                    {guest.hometown && <span> · {guest.hometown}</span>}
                  </p>
                </div>
              </div>
              {guest.party_size && guest.party_size > 1 && (
                <div className="guest-party-badge">
                  <Users className="w-3.5 h-3.5" />
                  Party of {guest.party_size}
                </div>
              )}
            </div>

            {/* Quick Links on Dashboard — Placed prominently right below Welcome Card */}
            <div className="guest-card guest-links-card">
              <div className="guest-card-header">
                <Sparkles className="w-4 h-4" />
                <span>Wedding Info & Invitation</span>
              </div>
              <div className="guest-links-grid">
                {EVENT.eInviteUrl && (
                  <a
                    href={EVENT.eInviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guest-link-btn guest-link-invite"
                  >
                    <MailOpen className="w-5 h-5" />
                    <span>E-Invite</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {EVENT.mandapamUrl && (
                  <a
                    href={EVENT.mandapamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guest-link-btn guest-link-mandapam"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Venue Location</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Room Card */}
            {guest.room ? (
              <div className="guest-card guest-room-card">
                <div className="guest-card-header">
                  <DoorOpen className="w-4 h-4" />
                  <span>Your Room</span>
                </div>
                <div className="guest-room-details">
                  <div className="guest-room-number">
                    Room {guest.room.room_no}
                  </div>
                  <div className="guest-room-meta-grid">
                    {guest.room.room_type && (
                      <div className="guest-room-meta-item">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{guest.room.room_type}</span>
                      </div>
                    )}
                    {guest.room.floor && (
                      <div className="guest-room-meta-item">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{guest.room.floor}</span>
                      </div>
                    )}
                    <div className="guest-room-meta-item">
                      <BedDouble className="w-3.5 h-3.5" />
                      <span>{guest.room.bed_config}</span>
                    </div>
                    {guest.sub_guests && guest.sub_guests.length > 0 && (
                      <div className="guest-room-meta-item" style={{ alignItems: 'flex-start' }}>
                        <Users className="w-3.5 h-3.5" style={{ marginTop: '3px' }} />
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Staying With:</span>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{guest.sub_guests.map(sg => sg.name).join(', ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="guest-card guest-no-room-card">
                <div className="guest-card-header">
                  <DoorOpen className="w-4 h-4" />
                  <span>Room Assignment</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
                  Your room hasn't been assigned yet. Please contact the wedding coordinator.
                </p>
              </div>
            )}

            {/* Lodge Card */}
            {guest.lodge && (
              <div className="guest-card guest-lodge-card">
                <div className="guest-card-header">
                  <Building2 className="w-4 h-4" />
                  <span>{guest.lodge.name}</span>
                </div>
                {guest.lodge.address && (
                  <p className="guest-lodge-address">
                    <MapPin className="w-3.5 h-3.5" style={{ flexShrink: 0, marginTop: '2px' }} />
                    {guest.lodge.address}
                  </p>
                )}
                {guest.lodge.maps_link && (
                  <a
                    href={guest.lodge.maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guest-maps-btn"
                  >
                    <Navigation className="w-4 h-4" />
                    Open in Google Maps
                    <ChevronRight className="w-4 h-4" style={{ marginLeft: 'auto' }} />
                  </a>
                )}
              </div>
            )}

            {/* Contacts Card */}
            {guest.lodge && (guest.lodge.contacts?.length || guest.lodge.incharge_name) && (
              <div className="guest-card guest-contacts-card">
                <div className="guest-card-header">
                  <PhoneCall className="w-4 h-4" />
                  <span>Contacts</span>
                </div>
                <div className="guest-contacts-list">
                  {guest.lodge.incharge_name && (
                    <a
                      href={`tel:${guest.lodge.incharge_contact}`}
                      className="guest-contact-item"
                    >
                      <div className="guest-contact-avatar">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="guest-contact-info">
                        <span className="guest-contact-name">{guest.lodge.incharge_name}</span>
                        <span className="guest-contact-role">Accommodation Coordinator</span>
                      </div>
                      <Phone className="w-4 h-4 guest-contact-phone-icon" />
                    </a>
                  )}
                  {guest.lodge.contacts?.map((c, ci) => (
                    <a
                      key={ci}
                      href={`tel:${c.phone}`}
                      className="guest-contact-item"
                    >
                      <div className="guest-contact-avatar">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="guest-contact-info">
                        <span className="guest-contact-name">{c.name}</span>
                        <span className="guest-contact-role">{c.role}</span>
                      </div>
                      <Phone className="w-4 h-4 guest-contact-phone-icon" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Lodge Directory Card */}
            {guest.lodge?.show_directory && guest.lodge?.directory && (
              <LodgeDirectory directory={guest.lodge.directory} />
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="guest-footer">
          <Heart className="w-3 h-3" />
          <span>{EVENT.couple} · {EVENT.date}</span>
        </div>
      </div>
    </div>
  );
}
