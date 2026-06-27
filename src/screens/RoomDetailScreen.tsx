import { useEffect, useState } from 'react';
import { ChevronLeft, Key, CheckCircle2, Phone, UserCheck, Save, UserX, Trash, Search, XCircle, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

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
  phone?: string;
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
  lodge: { id: string; name: string; ac_remote_required?: boolean; maps_link?: string | null; address?: string | null } | null;
  room_guests: {
    id: string;
    keys_given: string;
    ac_remote_given?: string;
    extra_bed_status?: string;
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

const BED_CONFIGS = ['Double Bed × 1', 'Double Bed × 1, Single Bed × 1', 'Double Bed × 2', 'Single Bed × 2', 'Other'];
const FLOORS = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];

export function RoomDetailScreen({ roomId }: { roomId: string }) {
  const { goBack, navigate } = useNavigation();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestForm, setGuestForm] = useState<GuestForm>({ name: '', phone: '', party_size: '', hometown: '', side: 'groom', notes: '' });
  const [subGuests, setSubGuests] = useState<SubGuest[]>([]);
  const [saving, setSaving] = useState(false);
  const [keyUpdating, setKeyUpdating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userInteractedSide, setUserInteractedSide] = useState(false);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
  }>({ show: false, message: '', onConfirm: () => {} });

  useEffect(() => {
    if (userInteractedSide) return;
    const nameLower = guestForm.name.toLowerCase();
    const hometownLower = guestForm.hometown.toLowerCase();
    const notesLower = guestForm.notes.toLowerCase();
    const mentionsBride = 
      nameLower.includes('madanapalle') || 
      nameLower.includes('ashok') || 
      nameLower.includes('amulya') ||
      hometownLower.includes('madanapalle') || 
      hometownLower.includes('ashok') || 
      hometownLower.includes('amulya') ||
      notesLower.includes('madanapalle') || 
      notesLower.includes('ashok') || 
      notesLower.includes('amulya');

    setGuestForm(f => ({ ...f, side: mentionsBride ? 'bride' : 'groom' }));
  }, [guestForm.name, guestForm.hometown, guestForm.notes, userInteractedSide]);

  // Assign Guest Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Room Modal State
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomForm, setEditRoomForm] = useState({
    room_no: '',
    room_type: '',
    bed_config: BED_CONFIGS[0],
    floor: FLOORS[0],
    category: 'TRT',
    extra_bed: false,
    notes: '',
  });

  async function load() {
    const { data } = await supabase
      .from('rooms')
      .select(`
        id, room_no, room_type, bed_config, floor, category, extra_bed, notes,
        lodge:lodges(id, name, ac_remote_required, maps_link, address),
        room_guests(id, keys_given, ac_remote_given, extra_bed_status, guest:guests(id, name, phone, party_size, hometown, side, notes, sub_guests))
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
        side: g.side ?? 'groom',
        notes: g.notes ?? '',
      });
      setUserInteractedSide(true);
      setSubGuests(g.sub_guests ? [...g.sub_guests] : []);
    } else {
      setGuestForm({ name: '', phone: '', party_size: '', hometown: '', side: 'groom', notes: '' });
      setUserInteractedSide(false);
      setSubGuests([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [roomId]);

  const rg = room?.room_guests?.[0];
  const guest = rg?.guest;
  const currentKey = rg?.keys_given ?? 'not_given';
  const currentRemote = rg?.ac_remote_given ?? 'not_given';
  const currentExtraBed = rg?.extra_bed_status ?? 'not_required';

  async function executeKeyStatusUpdate(status: string) {
    if (!rg) return;
    setKeyUpdating(true);
    const { error } = await supabase.from('room_guests').update({ keys_given: status }).eq('id', rg.id);
    if (error) {
      alert('Error updating key status: ' + error.message);
    }
    await load();
    setKeyUpdating(false);
  }

  async function executeRemoteStatusUpdate(status: string) {
    if (!rg) return;
    setKeyUpdating(true);
    const { error } = await supabase.from('room_guests').update({ ac_remote_given: status }).eq('id', rg.id);
    if (error) {
      alert('Error updating AC remote status: ' + error.message);
    }
    await load();
    setKeyUpdating(false);
  }

  async function executeExtraBedStatusUpdate(status: string) {
    if (!rg) return;
    setKeyUpdating(true);
    const { error } = await supabase.from('room_guests').update({ extra_bed_status: status }).eq('id', rg.id);
    if (error) {
      alert('Error updating extra bed status: ' + error.message);
    }
    await load();
    setKeyUpdating(false);
  }

  function setKeyStatus(status: string) {
    if (!rg || keyUpdating) return;
    const statusLabel =
      status === 'not_given' ? 'Not Given'
      : status === 'given' ? 'Given'
      : status === 'collected' ? 'Collected'
      : 'Given to Reception';
    
    setConfirmModal({
      show: true,
      message: `Are you sure you want to change key status to "${statusLabel}"?`,
      onConfirm: () => executeKeyStatusUpdate(status)
    });
  }

  function setRemoteStatus(status: string) {
    if (!rg || keyUpdating) return;
    const statusLabel =
      status === 'not_given' ? 'Not Given'
      : status === 'given' ? 'Given'
      : status === 'collected' ? 'Collected'
      : 'Given to Reception';

    setConfirmModal({
      show: true,
      message: `Are you sure you want to change AC remote status to "${statusLabel}"?`,
      onConfirm: () => executeRemoteStatusUpdate(status)
    });
  }

  function setExtraBedStatus(status: string) {
    if (!rg || keyUpdating) return;
    const statusLabel =
      status === 'not_required' ? 'No Extra Bed'
      : status === 'procured' ? 'Bed Procured'
      : 'Bed Returned';

    setConfirmModal({
      show: true,
      message: `Are you sure you want to change extra bed status to "${statusLabel}"?`,
      onConfirm: () => executeExtraBedStatusUpdate(status)
    });
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

  // Edit Room Handlers
  const handleOpenEditRoom = () => {
    if (!room) return;
    setEditRoomForm({
      room_no: room.room_no || '',
      room_type: room.room_type || '',
      bed_config: room.bed_config || BED_CONFIGS[0],
      floor: room.floor || FLOORS[0],
      category: room.category || 'TRT',
      extra_bed: room.extra_bed || false,
      notes: room.notes || '',
    });
    setShowEditRoomModal(true);
  };

  async function saveRoomDetails() {
    if (!editRoomForm.room_no.trim() || !room) return;
    setSaving(true);
    await supabase.from('rooms').update({
      room_no: editRoomForm.room_no.trim(),
      room_type: editRoomForm.room_type.trim() || null,
      bed_config: editRoomForm.bed_config,
      floor: editRoomForm.floor,
      category: editRoomForm.category,
      extra_bed: editRoomForm.extra_bed,
      notes: editRoomForm.notes.trim() || null,
    }).eq('id', roomId);
    setShowEditRoomModal(false);
    setSaving(false);
    load();
  }

  async function deleteRoom() {
    if (!room) return;
    if (window.confirm(`Are you sure you want to delete Room ${room.room_no}?`)) {
      setSaving(true);
      await supabase.from('rooms').delete().eq('id', roomId);
      goBack();
    }
  }

  const addSubGuestField = () => {
    setSubGuests([...subGuests, { name: '', phone: '' }]);
  };

  const removeSubGuestField = (index: number) => {
    setSubGuests(subGuests.filter((_, i) => i !== index));
  };

  const updateSubGuestName = (index: number, value: string) => {
    const updated = [...subGuests];
    updated[index] = { ...updated[index], name: value };
    setSubGuests(updated);
  };

  const updateSubGuestPhone = (index: number, value: string) => {
    const updated = [...subGuests];
    updated[index] = { ...updated[index], phone: value };
    setSubGuests(updated);
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>
          <ChevronLeft className="w-[22px] h-[22px]" />
        </button>
        <h1 style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Room {room?.room_no || '…'}</span>
            {room?.lodge?.name && (
              <span className="badge blue" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', background: 'var(--blue-light)', color: 'var(--blue)' }}>
                {room.lodge.name}
              </span>
            )}
          </div>
          <span className="subtitle" style={{ marginTop: '2px' }}>
            {room?.floor || '…'}
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
            {room?.lodge?.maps_link && (
              <a href={room.lodge.maps_link} target="_blank" rel="noopener noreferrer" className="maps-banner" style={{ margin: '12px 16px 4px 16px' }}>
                <div className="maps-banner-icon"><Navigation className="w-[18px] h-[18px]" /></div>
                <div className="maps-banner-body">
                  <div className="maps-banner-title">{room.lodge.address || room.lodge.name}</div>
                  <div className="maps-banner-sub">Tap to open in Google Maps</div>
                </div>
                <div className="maps-banner-arrow"><ChevronLeft className="w-[18px] h-[18px] rotate-180" /></div>
              </a>
            )}

            {/* Key status bar */}
            <div className="key-status" style={{ paddingBottom: room?.lodge?.ac_remote_required ? '4px' : '12px' }}>
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
              <div
                className={`key-pill ${currentKey === 'reception' ? 'active-purple' : ''}`}
                onClick={() => rg && setKeyStatus('reception')}
                style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
              >
                <Key className="w-3.5 h-3.5" style={{ transform: 'rotate(-45deg)' }} />
                Reception
              </div>
            </div>

            {/* AC Remote status bar */}
            {room?.lodge?.ac_remote_required && (
              <div className="key-status" style={{ paddingTop: '0px', paddingBottom: room?.extra_bed ? '4px' : '12px' }}>
                <div
                  className={`key-pill ${currentRemote === 'not_given' || currentRemote === 'none' ? 'active-orange' : ''}`}
                  onClick={() => rg && setRemoteStatus('not_given')}
                  style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Remote not given
                </div>
                <div
                  className={`key-pill ${currentRemote === 'given' ? 'active-orange' : ''}`}
                  onClick={() => rg && setRemoteStatus('given')}
                  style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
                >
                  <Key className="w-3.5 h-3.5" />
                  Remote given
                </div>
                <div
                  className={`key-pill ${currentRemote === 'collected' || currentRemote === 'back' ? 'active-green' : ''}`}
                  onClick={() => rg && setRemoteStatus('collected')}
                  style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Collected
                </div>
                <div
                  className={`key-pill ${currentRemote === 'reception' ? 'active-purple' : ''}`}
                  onClick={() => rg && setRemoteStatus('reception')}
                  style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Reception
                </div>
              </div>
            )}

            {/* Extra Bed status bar */}
            {room?.extra_bed && (
              <div className="key-status" style={{ paddingTop: '0px', paddingBottom: '12px' }}>
                <div
                  className={`key-pill ${currentExtraBed === 'not_required' || currentExtraBed === 'none' ? 'active-green' : ''}`}
                  onClick={() => rg && setExtraBedStatus('not_required')}
                  style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  No Extra Bed
                </div>
                <div
                  className={`key-pill ${currentExtraBed === 'procured' ? 'active-orange' : ''}`}
                  onClick={() => rg && setExtraBedStatus('procured')}
                  style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
                >
                  <Key className="w-3.5 h-3.5" />
                  Bed Procured
                </div>
                <div
                  className={`key-pill ${currentExtraBed === 'returned' ? 'active-green' : ''}`}
                  onClick={() => rg && setExtraBedStatus('returned')}
                  style={{ cursor: rg ? 'pointer' : 'default', opacity: rg ? 1 : 0.5 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Bed Returned
                </div>
              </div>
            )}

            {/* Room info header with Edit button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 4px' }}>
              <div className="section-header" style={{ padding: 0 }}>Room Info</div>
              <button
                className="btn btn-sm btn-secondary"
                style={{ width: 'auto' }}
                onClick={handleOpenEditRoom}
              >
                Edit Room
              </button>
            </div>

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
              <div style={{ display: 'flex', gap: '8px' }}>
                {guest && (
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ width: 'auto' }}
                    onClick={() => navigate({ name: 'guest', guestId: guest.id })}
                  >
                    View Guest
                  </button>
                )}
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ width: 'auto' }}
                  onClick={handleOpenAssign}
                >
                  <UserCheck className="w-3.5 h-3.5" /> {guest ? 'Change guest' : 'Assign guest'}
                </button>
              </div>
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
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder={`Sub guest ${idx + 1} name`}
                              value={sub.name}
                              onChange={e => updateSubGuestName(idx, e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '13px', flex: 1, background: 'var(--white)', color: 'var(--text)' }}
                            />
                            <button 
                              type="button"
                              onClick={() => removeSubGuestField(idx)}
                              style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="tel"
                              placeholder="Phone (optional)"
                              value={sub.phone ?? ''}
                              onChange={e => updateSubGuestPhone(idx, e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '13px', flex: 1, background: 'var(--white)', color: 'var(--text)' }}
                            />
                            {sub.phone && (
                              <a href={`tel:${sub.phone}`} className="call-btn" style={{ width: '32px', height: '32px', boxShadow: 'none' }} title="Call sub guest">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
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
                    <label>Hometown / From</label>
                    <input
                      type="text"
                      placeholder="Hometown"
                      value={guestForm.hometown}
                      onChange={e => setGuestForm(f => ({ ...f, hometown: e.target.value }))}
                    />
                  </div>
                  <div className="detail-field">
                    <label>Side</label>
                    <select
                      value={guestForm.side}
                      onChange={e => {
                        setGuestForm(f => ({ ...f, side: e.target.value }));
                        setUserInteractedSide(true);
                      }}
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
                <div style={{ padding: '0 16px 16px' }}>
                  <button className="btn btn-danger" onClick={removeGuest}>
                    <UserX className="w-4 h-4" /> Remove guest from room
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Edit Room Modal */}
      {showEditRoomModal && (
        <div className="modal-overlay open" onClick={() => setShowEditRoomModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Edit Room {room?.room_no}</div>
            
            <div className="form-group">
              <label>Room Number *</label>
              <input
                type="text"
                placeholder="e.g. 101"
                value={editRoomForm.room_no}
                onChange={e => setEditRoomForm(f => ({ ...f, room_no: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Room Type</label>
              <input
                type="text"
                placeholder="Standard / Deluxe / AC / Suite…"
                value={editRoomForm.room_type}
                onChange={e => setEditRoomForm(f => ({ ...f, room_type: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Bed Configuration</label>
              <select
                value={editRoomForm.bed_config}
                onChange={e => setEditRoomForm(f => ({ ...f, bed_config: e.target.value }))}
              >
                {BED_CONFIGS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Floor</label>
              <select
                value={editRoomForm.floor}
                onChange={e => setEditRoomForm(f => ({ ...f, floor: e.target.value }))}
              >
                {FLOORS.map(fl => <option key={fl}>{fl}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={editRoomForm.category}
                onChange={e => setEditRoomForm(f => ({ ...f, category: e.target.value }))}
              >
                <option>TRT</option>
                <option>MPT</option>
              </select>
            </div>
            <div className="form-group">
              <label>Extra bed available?</label>
              <select
                value={editRoomForm.extra_bed ? 'Yes' : 'No'}
                onChange={e => setEditRoomForm(f => ({ ...f, extra_bed: e.target.value === 'Yes' }))}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                placeholder="Room notes…"
                value={editRoomForm.notes}
                onChange={e => setEditRoomForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={saveRoomDetails}
                disabled={saving || !editRoomForm.room_no.trim()}
                className="btn btn-primary"
              >
                Save Room Details
              </button>
              <button
                onClick={deleteRoom}
                disabled={saving}
                className="btn btn-danger"
              >
                Delete Room
              </button>
              <button className="btn btn-ghost" onClick={() => setShowEditRoomModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
      {confirmModal.show && (
        <div className="modal-overlay open" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: '24px', borderRadius: '20px 20px 0 0' }}>
            <div className="modal-handle" />
            <div className="modal-title" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Confirm Update</div>
            <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px', lineHeight: '1.4' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
