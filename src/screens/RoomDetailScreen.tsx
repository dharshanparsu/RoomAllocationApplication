import { useEffect, useState } from 'react';
import { ChevronLeft, Key, CheckCircle2, Phone, UserCheck, Save, UserX, Trash, Search } from 'lucide-react';
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

interface SubGuest {
  name: string;
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
      sub_guests: SubGuest[] | null;
    } | null;
  }[];
}

export function RoomDetailScreen({ roomId }: { roomId: string }) {
  const { goBack } = useNavigation();
  const { isAdmin } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestForm, setGuestForm] = useState<GuestForm>({ name: '', phone: '', party_size: '', hometown: '', side: 'bride', notes: '' });
  const [subGuests, setSubGuests] = useState<SubGuest[]>([]);
  const [saving, setSaving] = useState(false);
  const [keyUpdating, setKeyUpdating] = useState(false);
  const [saved, setSaved] = useState(false);

  // Assign Guest Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  async function load() {
    const { data } = await supabase
      .from('rooms')
      .select(`
        id, room_no, room_type, bed_config, floor, category, extra_bed, notes,
        lodge:lodges(id, name),
        room_guests(id, keys_given, guest:guests(id, name, phone, party_size, hometown, side, notes, sub_guests))
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
      setSubGuests(g.sub_guests ? [...g.sub_guests] : []);
    } else {
      setGuestForm({ name: '', phone: '', party_size: '', hometown: '', side: 'bride', notes: '' });
      setSubGuests([]);
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
    const activeSubGuests = subGuests.filter(s => s.name.trim());
    const calculatedPartySize = guestForm.party_size.trim()
      ? parseInt(guestForm.party_size)
      : (activeSubGuests.length + 1);

    await supabase.from('guests').update({
      name: guestForm.name.trim(),
      phone: guestForm.phone.trim() || null,
      party_size: calculatedPartySize,
      hometown: guestForm.hometown.trim() || null,
      side: guestForm.side,
      notes: guestForm.notes.trim() || null,
      sub_guests: activeSubGuests,
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

  // Fetch guests for assignment
  async function handleOpenAssign() {
    const { data } = await supabase
      .from('guests')
      .select('id, name, phone, party_size, room_guests(room:rooms(room_no, lodge:lodges(name)))')
      .order('name');
    setAllGuests(data ?? []);
    setSearchQuery('');
    setShowAssignModal(true);
  }

  async function assignGuestToRoom(guestId: string) {
    setSaving(true);
    
    // 1. Delete any existing assignment for this room first (if any)
    if (rg) {
      await supabase.from('room_guests').delete().eq('room_id', roomId);
    }
    
    // 2. Also delete any existing assignment of the selected guest to other rooms
    await supabase.from('room_guests').delete().eq('guest_id', guestId);
    
    // 3. Create the new assignment
    await supabase.from('room_guests').insert({
      room_id: roomId,
      guest_id: guestId,
      keys_given: 'not_given'
    });
    
    setShowAssignModal(false);
    setSaving(false);
    load();
  }

  const addSubGuestField = () => {
    setSubGuests([...subGuests, { name: '' }]);
  };

  const removeSubGuestField = (index: number) => {
    setSubGuests(subGuests.filter((_, i) => i !== index));
  };

  const updateSubGuest = (index: number, value: string) => {
    const updated = [...subGuests];
    updated[index].name = value;
    setSubGuests(updated);
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>
          <ChevronLeft className="w-[22px] h-[22px]" />
        </button>
        <h1 style={{ flex: 1 }}>
          Room {room?.room_no || '…'}
          <span className="subtitle">
            {room?.lodge?.name || '…'} · {room?.floor || '…'}
          </span>
        </h1>
        {guest && (
          <button onClick={saveGuest} disabled={saving} className="topbar-action">
            {saved ? 'Saved!' : 'Save'}
          </button>
        )}
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
                  onClick={handleOpenAssign}
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

                  {/* Sub-guests builder inside RoomDetail */}
                  <div className="detail-field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ margin: 0 }}>Sub Guests</label>
                      <button 
                        type="button" 
                        onClick={addSubGuestField}
                        className="btn btn-sm btn-secondary" 
                        style={{ width: 'auto', padding: '4px 10px', fontSize: '11px' }}
                      >
                        + Add Sub Guest
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {subGuests.map((sub, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder={`Sub guest ${idx + 1} name`}
                            value={sub.name}
                            onChange={e => updateSubGuest(idx, e.target.value)}
                            style={{ padding: '6px 8px', fontSize: '13px', flex: 1 }}
                          />
                          <button 
                            type="button"
                            onClick={() => removeSubGuestField(idx)}
                            style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="detail-field">
                    <label>Party size (main + sub guests)</label>
                    <input
                      type="number"
                      placeholder={subGuests.length > 0 ? (subGuests.length + 1).toString() : "No. of persons"}
                      value={guestForm.party_size}
                      onChange={e => setGuestForm(f => ({ ...f, party_size: e.target.value }))}
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

      {/* Assign Guest Modal */}
      {showAssignModal && (
        <div className="modal-overlay open" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Assign Guest to Room</div>
            <div className="form-group">
              <div className="search-wrap">
                <span className="search-icon"><Search className="w-4 h-4" /></span>
                <input
                  type="search"
                  placeholder="Search guest…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="card" style={{ margin: '0 0 16px', maxHeight: '300px', overflowY: 'auto' }}>
              {allGuests
                .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(g => {
                  const assignedRoom = g.room_guests?.[0]?.room;
                  const isCurrent = guest?.id === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => assignGuestToRoom(g.id)}
                      className="list-row"
                    >
                      <div className="row-body">
                        <div className="row-title">{g.name}</div>
                        <div className="row-sub">
                          {g.phone || 'No phone'} · {g.party_size || 1} persons · {assignedRoom ? `Room ${assignedRoom.room_no} (${assignedRoom.lodge?.name})` : 'Unassigned'}
                        </div>
                      </div>
                      <span className={`badge ${isCurrent ? 'green' : assignedRoom ? 'blue' : 'gray'}`}>
                        {isCurrent ? 'This room' : assignedRoom ? 'Assigned' : 'Unassigned'}
                      </span>
                    </div>
                  );
                })}
            </div>
            <button className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
