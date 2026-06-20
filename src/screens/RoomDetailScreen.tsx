import { useEffect, useState } from 'react';
import { ChevronLeft, Key, CheckCircle2, Phone, UserCheck, Save, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';

interface GuestForm {
  name: string;
  phone: string;
  party_size: string;
  hometown: string;
  side: string;
  notes: string;
}

interface RoomData {
  id: string;
  room_no: string;
  room_type: string | null;
  bed_config: string;
  floor: string | null;
  category: string | null;
  extra_bed: boolean;
  notes: string | null;
  lodge: { id: string; name: string } | null;
  room_guests: {
    id: string;
    keys_given: string;
    guest: {
      id: string;
      name: string;
      phone: string | null;
      party_size: number | null;
      hometown: string | null;
      side: string | null;
      notes: string | null;
    } | null;
  }[];
}

export function RoomDetailScreen({ roomId }: { roomId: string }) {
  const { goBack, navigate } = useNavigation();
  const { isAdmin } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestForm, setGuestForm] = useState<GuestForm>({ name: '', phone: '', party_size: '', hometown: '', side: 'bride', notes: '' });
  const [saving, setSaving] = useState(false);
  const [keyUpdating, setKeyUpdating] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('rooms')
      .select(`
        id, room_no, room_type, bed_config, floor, category, extra_bed, notes,
        lodge:lodges(id, name),
        room_guests(id, keys_given, guest:guests(id, name, phone, party_size, hometown, side, notes))
      `)
      .eq('id', roomId)
      .single();
    const r = data as unknown as RoomData;
    setRoom(r);
    const g = r?.room_guests?.[0]?.guest;
    if (g) {
      setGuestForm({
        name: g.name ?? '',
        phone: g.phone ?? '',
        party_size: g.party_size?.toString() ?? '',
        hometown: g.hometown ?? '',
        side: g.side ?? 'bride',
        notes: g.notes ?? '',
      });
    } else {
      setGuestForm({ name: '', phone: '', party_size: '', hometown: '', side: 'bride', notes: '' });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [roomId]);

  const rg = room?.room_guests?.[0];
  const guest = rg?.guest;
  const currentKey = rg?.keys_given ?? 'not_given';

  async function setKeyStatus(status: string) {
    if (!rg || keyUpdating) return;
    setKeyUpdating(true);
    await supabase.from('room_guests').update({ keys_given: status }).eq('id', rg.id);
    await load();
    setKeyUpdating(false);
  }

  async function saveGuest() {
    if (!guest) return;
    setSaving(true);
    await supabase.from('guests').update({
      name: guestForm.name.trim(),
      phone: guestForm.phone.trim() || null,
      party_size: guestForm.party_size ? parseInt(guestForm.party_size) : null,
      hometown: guestForm.hometown.trim() || null,
      side: guestForm.side,
      notes: guestForm.notes.trim() || null,
    }).eq('id', guest.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    load();
  }

  async function removeGuest() {
    if (!rg) return;
    await supabase.from('room_guests').delete().eq('id', rg.id);
    load();
  }

  return (
    <div className="screen active">
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>
          <ChevronLeft className="w-[22px] h-[22px]" />
        </button>
        <h1>
          Room {room?.room_no || '…'}
          <span className="subtitle">
            {room?.lodge?.name || '…'} · {room?.floor || '…'}
          </span>
        </h1>
      </div>

      <div className="scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Key status bar */}
            <div className="key-status">
              <div
                className={`key-pill ${currentKey === 'not_given' || currentKey === 'none' ? 'active-orange' : ''}`}
                onClick={() => rg && setKeyStatus('not_given')}
                style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
              >
                <Key className="w-3.5 h-3.5" />
                Not given
              </div>
              <div
                className={`key-pill ${currentKey === 'given' ? 'active-orange' : ''}`}
                onClick={() => rg && setKeyStatus('given')}
                style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
              >
                <Key className="w-3.5 h-3.5" />
                Key given
              </div>
              <div
                className={`key-pill ${currentKey === 'collected' || currentKey === 'back' ? 'active-green' : ''}`}
                onClick={() => rg && setKeyStatus('collected')}
                style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Collected
              </div>
            </div>

            {/* Room info */}
            <div className="section-header">Room Info</div>
            <div className="card">
              <div className="detail-field">
                <label>Room Type</label>
                <div className="detail-value">
                  <span className="badge blue">{room?.room_type || 'Standard'}</span>
                </div>
              </div>
              <div className="detail-field">
                <label>Bed Config</label>
                <div className="detail-value">{room?.bed_config || '—'}</div>
              </div>
              <div className="detail-field">
                <label>Extra Bed</label>
                <div className="detail-value">{room?.extra_bed ? 'Yes' : 'No'}</div>
              </div>
              <div className="detail-field">
                <label>Category</label>
                <div className="detail-value">
                  <span className="badge blue">{room?.category || '—'}</span>
                </div>
              </div>
              <div className="detail-field" style={{ border: 'none' }}>
                <label>Notes</label>
                <div className="detail-value">{room?.notes || '—'}</div>
              </div>
            </div>

            {/* Guest header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 4px' }}>
              <div className="section-header" style={{ padding: 0 }}>Guest</div>
              {isAdmin && (
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ width: 'auto' }}
                  onClick={() => navigate({ name: 'guests' })}
                >
                  <UserCheck className="w-3.5 h-3.5" /> {guest ? 'Change guest' : 'Assign guest'}
                </button>
              )}
            </div>

            {!guest ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No guest assigned to this room yet
              </div>
            ) : (
              <>
                <div className="card">
                  <div className="detail-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={guestForm.name}
                      onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Guest name"
                    />
                  </div>
                  <div className="detail-field">
                    <label>Phone</label>
                    <div className="phone-row">
                      <input
                        type="tel"
                        value={guestForm.phone}
                        onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="Mobile number"
                      />
                      {guestForm.phone && (
                        <a href={`tel:${guestForm.phone}`} className="call-btn" title="Call guest">
                          <Phone className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="detail-field">
                    <label>Party size (no. of persons)</label>
                    <input
                      type="number"
                      value={guestForm.party_size}
                      onChange={e => setGuestForm(f => ({ ...f, party_size: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="detail-field">
                    <label>Side</label>
                    <select
                      value={guestForm.side}
                      onChange={e => setGuestForm(f => ({ ...f, side: e.target.value }))}
                    >
                      <option value="bride">Bride's side</option>
                      <option value="groom">Groom's side</option>
                      <option value="both">Both / Family</option>
                    </select>
                  </div>
                  <div className="detail-field" style={{ border: 'none' }}>
                    <label>Notes</label>
                    <textarea
                      value={guestForm.notes}
                      onChange={e => setGuestForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any notes about the guest…"
                    />
                  </div>
                </div>

                <div style={{ padding: '0 16px 10px' }}>
                  <button className="btn btn-primary" onClick={saveGuest} disabled={saving}>
                    <Save className="w-4 h-4" /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
                {isAdmin && (
                  <div style={{ padding: '0 16px 16px' }}>
                    <button className="btn btn-danger" onClick={removeGuest}>
                      <UserX className="w-4 h-4" /> Remove guest from room
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
