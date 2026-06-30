import { useEffect, useState } from 'react';
import { Key, CheckCircle2, Phone, Search, SlidersHorizontal, ChevronRight, XCircle, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface SubGuest {
  name: string;
  phone?: string;
}

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  party_size: number | null;
  hometown: string | null;
  side: string | null;
  notes: string | null;
  sub_guests: SubGuest[] | null;
}

interface RoomGuest {
  id: string;
  keys_given: string;
  ac_remote_given?: string | null;
  extra_bed_status?: string | null;
  guest: Guest | null;
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
  lodge: { id: string; name: string; ac_remote_required?: boolean } | null;
  room_guests: RoomGuest[];
}

export function AllocationsScreen() {
  const { navigate } = useNavigation();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [lodges, setLodges] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLodge, setSelectedLodge] = useState('All');
  const [selectedKeyStatus, setSelectedKeyStatus] = useState('All');
  const [selectedSide, setSelectedSide] = useState('All');
  const [selectedAcStatus, setSelectedAcStatus] = useState('All');
  const [selectedExtraBedStatus, setSelectedExtraBedStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(true);

  // Loading/saving state per room guest for inline actions
  const [updatingGuestId, setUpdatingGuestId] = useState<string | null>(null);

  // Quick inline edit state
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', roomNo: '', roomId: '', side: 'bride' });
  const [savingGuestId, setSavingGuestId] = useState<string | null>(null);
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
  }>({ show: false, message: '', onConfirm: () => {} });

  async function saveInlineEdit(guestId: string | null, roomId: string) {
    if (!editForm.name.trim()) {
      alert('Guest name is required.');
      return;
    }

    if (guestId) {
      setSavingGuestId(guestId);

      const guestPromise = supabase
        .from('guests')
        .update({
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null
        })
        .eq('id', guestId);

      const roomPromise = supabase
        .from('rooms')
        .update({
          room_no: editForm.roomNo.trim()
        })
        .eq('id', roomId);

      const [guestRes, roomRes] = await Promise.all([guestPromise, roomPromise]);

      if (!guestRes.error && !roomRes.error) {
        await loadData();
        setEditingGuestId(null);
      } else {
        alert('Error updating: ' + (guestRes.error?.message || roomRes.error?.message));
      }
      setSavingGuestId(null);
    } else {
      setSavingRoomId(roomId);

      // 1. Create new guest
      const { data: newGuest, error: guestError } = await supabase
        .from('guests')
        .insert({
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          side: editForm.side,
          party_size: 1
        })
        .select()
        .single();

      if (guestError) {
        alert('Error creating guest: ' + guestError.message);
        setSavingRoomId(null);
        return;
      }

      // 2. Create room_guest assignment mapping
      const { error: mapError } = await supabase
        .from('room_guests')
        .insert({
          room_id: roomId,
          guest_id: newGuest.id
        });

      // 3. Update room number if modified
      const { error: roomError } = await supabase
        .from('rooms')
        .update({
          room_no: editForm.roomNo.trim()
        })
        .eq('id', roomId);

      if (!mapError && !roomError) {
        await loadData();
        setEditingRoomId(null);
      } else {
        alert('Error mapping room: ' + (mapError?.message || roomError?.message));
      }
      setSavingRoomId(null);
    }
  }

  async function loadData() {
    setLoading(true);
    const [roomsRes, lodgesRes] = await Promise.all([
      supabase.from('rooms').select(`
        id, room_no, room_type, bed_config, floor, category, extra_bed, notes,
        lodge:lodges(id, name, ac_remote_required),
        room_guests(id, keys_given, ac_remote_given, extra_bed_status, guest:guests(id, name, phone, party_size, hometown, side, notes, sub_guests))
      `),
      supabase.from('lodges').select('id, name').order('name'),
    ]);

    if (roomsRes.data) {
      // Sort by lodge name then room number numerically
      const sortedRooms = [...(roomsRes.data as any[])].sort((a: any, b: any) => {
        const lodgeA = a.lodge?.name || '';
        const lodgeB = b.lodge?.name || '';
        if (lodgeA !== lodgeB) return lodgeA.localeCompare(lodgeB);
        return (parseInt(a.room_no) || 0) - (parseInt(b.room_no) || 0);
      });
      setRooms(sortedRooms as unknown as RoomData[]);
    }
    if (lodgesRes.data) {
      setLodges(lodgesRes.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filterLodge = sessionStorage.getItem('filter_lodge');
    const filterSide = sessionStorage.getItem('filter_side');
    const filterKeyStatus = sessionStorage.getItem('filter_key_status');
    const filterAcStatus = sessionStorage.getItem('filter_ac_status');
    const filterBedStatus = sessionStorage.getItem('filter_bed_status');

    if (filterLodge) {
      setSelectedLodge(filterLodge);
      sessionStorage.removeItem('filter_lodge');
    }
    if (filterSide) {
      setSelectedSide(filterSide);
      sessionStorage.removeItem('filter_side');
    }
    if (filterKeyStatus) {
      setSelectedKeyStatus(filterKeyStatus);
      setSelectedAcStatus('All');
      setSelectedExtraBedStatus('All');
      sessionStorage.removeItem('filter_key_status');
    }
    if (filterAcStatus) {
      setSelectedAcStatus(filterAcStatus);
      setSelectedKeyStatus('All');
      setSelectedExtraBedStatus('All');
      sessionStorage.removeItem('filter_ac_status');
    }
    if (filterBedStatus) {
      setSelectedExtraBedStatus(filterBedStatus);
      setSelectedKeyStatus('All');
      setSelectedAcStatus('All');
      sessionStorage.removeItem('filter_bed_status');
    }
  }, [rooms]);

  async function executeKeyStatusUpdate(roomGuestId: string, newStatus: string) {
    setUpdatingGuestId(roomGuestId);
    const { error } = await supabase
      .from('room_guests')
      .update({ keys_given: newStatus })
      .eq('id', roomGuestId);

    if (!error) {
      setRooms(prevRooms =>
        prevRooms.map(room => {
          const updatedGuests = room.room_guests.map(rg => {
            if (rg.id === roomGuestId) {
              return { ...rg, keys_given: newStatus };
            }
            return rg;
          });
          return { ...room, room_guests: updatedGuests };
        })
      );
    } else {
      alert('Error updating key status: ' + error.message);
    }
    setUpdatingGuestId(null);
  }

  async function executeRemoteStatusUpdate(roomGuestId: string, newStatus: string) {
    setUpdatingGuestId(roomGuestId);
    const { error } = await supabase
      .from('room_guests')
      .update({ ac_remote_given: newStatus })
      .eq('id', roomGuestId);

    if (!error) {
      setRooms(prevRooms =>
        prevRooms.map(room => {
          const updatedGuests = room.room_guests.map(rg => {
            if (rg.id === roomGuestId) {
              return { ...rg, ac_remote_given: newStatus };
            }
            return rg;
          });
          return { ...room, room_guests: updatedGuests };
        })
      );
    } else {
      alert('Error updating AC remote status: ' + error.message);
    }
    setUpdatingGuestId(null);
  }

  async function executeExtraBedStatusUpdate(roomGuestId: string, newStatus: string) {
    setUpdatingGuestId(roomGuestId);
    const { error } = await supabase
      .from('room_guests')
      .update({ extra_bed_status: newStatus })
      .eq('id', roomGuestId);

    if (!error) {
      setRooms(prevRooms =>
        prevRooms.map(room => {
          const updatedGuests = room.room_guests.map(rg => {
            if (rg.id === roomGuestId) {
              return { ...rg, extra_bed_status: newStatus };
            }
            return rg;
          });
          return { ...room, room_guests: updatedGuests };
        })
      );
    } else {
      alert('Error updating extra bed status: ' + error.message);
    }
    setUpdatingGuestId(null);
  }

  function updateKeyStatus(roomGuestId: string, newStatus: string) {
    const statusLabel =
      newStatus === 'not_given' ? 'Not Given'
      : newStatus === 'given' ? 'Given'
      : newStatus === 'collected' ? 'Collected'
      : 'Given to Reception';
    
    setConfirmModal({
      show: true,
      message: `Are you sure you want to change key status to "${statusLabel}"?`,
      onConfirm: () => executeKeyStatusUpdate(roomGuestId, newStatus)
    });
  }

  function updateRemoteStatus(roomGuestId: string, newStatus: string) {
    const statusLabel =
      newStatus === 'not_given' ? 'Not Given'
      : newStatus === 'given' ? 'Given'
      : newStatus === 'collected' ? 'Collected'
      : 'Given to Reception';

    setConfirmModal({
      show: true,
      message: `Are you sure you want to change AC remote status to "${statusLabel}"?`,
      onConfirm: () => executeRemoteStatusUpdate(roomGuestId, newStatus)
    });
  }

  function updateExtraBedStatus(roomGuestId: string, newStatus: string) {
    const statusLabel =
      newStatus === 'not_required' ? 'N/A'
      : newStatus === 'procured' ? 'Procured'
      : 'Returned';

    setConfirmModal({
      show: true,
      message: `Are you sure you want to change extra bed status to "${statusLabel}"?`,
      onConfirm: () => executeExtraBedStatusUpdate(roomGuestId, newStatus)
    });
  }

  // Filter records
  const filteredRooms = rooms.filter(room => {
    const activeRG = room.room_guests?.[0];
    const activeGuest = activeRG?.guest;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const guestName = activeGuest?.name?.toLowerCase() || '';
      const guestPhone = activeGuest?.phone?.toLowerCase() || '';
      const guestHometown = activeGuest?.hometown?.toLowerCase() || '';
      const roomNo = room.room_no.toLowerCase();
      const lodgeName = room.lodge?.name?.toLowerCase() || '';
      const subGuestsText = activeGuest?.sub_guests?.map(s => s.name.toLowerCase()).join(' ') || '';

      const match =
        guestName.includes(q) ||
        guestPhone.includes(q) ||
        guestHometown.includes(q) ||
        roomNo.includes(q) ||
        lodgeName.includes(q) ||
        subGuestsText.includes(q);

      if (!match) return false;
    }

    // Lodge filter
    if (selectedLodge !== 'All' && room.lodge?.id !== selectedLodge) {
      return false;
    }

    // Key status filter
    if (selectedKeyStatus !== 'All') {
      const currentKey = activeRG?.keys_given || 'not_given';
      if (selectedKeyStatus === 'not_given' && currentKey !== 'not_given' && currentKey !== 'none') return false;
      if (selectedKeyStatus === 'given' && currentKey !== 'given' && currentKey !== 'reception') return false;
      if (selectedKeyStatus === 'collected' && currentKey !== 'collected' && currentKey !== 'back') return false;
      if (selectedKeyStatus === 'reception' && currentKey !== 'reception') return false;
    }

    // Side filter
    if (selectedSide !== 'All' && activeGuest?.side !== selectedSide) {
      return false;
    }

    // AC status filter
    if (selectedAcStatus !== 'All') {
      const currentAc = activeRG?.ac_remote_given || 'not_given';
      if (selectedAcStatus === 'not_given' && currentAc !== 'not_given' && currentAc !== 'none') return false;
      if (selectedAcStatus === 'given' && currentAc !== 'given' && currentAc !== 'reception') return false;
      if (selectedAcStatus === 'collected' && currentAc !== 'collected' && currentAc !== 'back') return false;
      if (selectedAcStatus === 'reception' && currentAc !== 'reception') return false;
    }

    // Extra bed status filter
    if (selectedExtraBedStatus !== 'All') {
      const currentBed = activeRG?.extra_bed_status || 'not_required';
      if (selectedExtraBedStatus === 'not_required' && currentBed !== 'not_required' && currentBed !== 'none') return false;
      if (selectedExtraBedStatus === 'procured' && currentBed !== 'procured') return false;
      if (selectedExtraBedStatus === 'returned' && currentBed !== 'returned') return false;
    }

    return true;
  });

  return (
    <div className="screen active">
      <div className="topbar">
        <h1 style={{ flex: 1 }}>
          Allocations
          <span className="subtitle">Search &amp; Manage Key Handover</span>
        </h1>
        <button
          className={`topbar-settings ${showFilters ? 'text-blue-600' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          style={{ color: showFilters ? 'var(--blue)' : 'var(--text-muted)' }}
        >
          <SlidersHorizontal className="w-[20px] h-[20px]" />
        </button>
      </div>

      {/* Search Header */}
      <div style={{ padding: '12px 16px 8px', background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
        <div className="search-wrap" style={{ margin: 0 }}>
          <span className="search-icon"><Search className="w-4 h-4" /></span>
          <input
            type="search"
            placeholder="Search room, guest, lodge, hometown…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: '14px' }}
          />
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Lodge</label>
              <select
                value={selectedLodge}
                onChange={e => setSelectedLodge(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--white)' }}
              >
                <option value="All">All Lodges</option>
                {lodges.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Key Status</label>
              <select
                value={selectedKeyStatus}
                onChange={e => setSelectedKeyStatus(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--white)' }}
              >
                <option value="All">All Statuses</option>
                <option value="not_given">Not Given</option>
                <option value="given">Key Given</option>
                <option value="collected">Collected Back</option>
                <option value="reception">Given to Reception</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Side</label>
              <select
                value={selectedSide}
                onChange={e => setSelectedSide(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--white)' }}
              >
                <option value="All">All Sides</option>
                <option value="bride">Bride's side</option>
                <option value="groom">Groom's side</option>
                <option value="both">Both / Family</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Special Filters Alert Banner */}
      {(selectedAcStatus !== 'All' || selectedExtraBedStatus !== 'All' || selectedKeyStatus !== 'All' || selectedLodge !== 'All' || selectedSide !== 'All') && (
        <div style={{ background: 'var(--blue-bg)', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600 }}>
            Active Filters: {[
              selectedLodge !== 'All' && 'Lodge',
              selectedSide !== 'All' && 'Side',
              selectedKeyStatus !== 'All' && `Keys (${selectedKeyStatus.replace('_', ' ')})`,
              selectedAcStatus !== 'All' && `AC Remotes (${selectedAcStatus.replace('_', ' ')})`,
              selectedExtraBedStatus !== 'All' && `Extra Beds (${selectedExtraBedStatus})`
            ].filter(Boolean).join(', ')}
          </span>
          <button 
            onClick={() => {
              setSelectedKeyStatus('All');
              setSelectedAcStatus('All');
              setSelectedExtraBedStatus('All');
              setSelectedLodge('All');
              setSelectedSide('All');
            }} 
            style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Main List */}
      <div className="scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No matching allocations found.
          </div>
        ) : (
          <div className="card" style={{ margin: '12px 16px' }}>
            {filteredRooms.map((room, idx) => {
              const activeRG = room.room_guests?.[0];
              const activeGuest = activeRG?.guest;
              const keyStatus = activeRG?.keys_given ?? 'not_given';

              return (
                <div key={room.id}>
                  {idx > 0 && <div style={{ borderTop: '1px solid var(--border)' }} />}
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* Header Row: Room & Lodge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div
                        onClick={() => navigate({ name: 'room', roomId: room.id })}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      >
                        <span className="badge blue" style={{ fontSize: '13px', padding: '4px 8px', fontWeight: 700 }}>
                          Room {room.room_no}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                          {room.lodge?.name} · {room.floor}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      
                      {/* Side Badge */}
                      {activeGuest?.side && (
                        <span className={`badge ${activeGuest.side === 'bride' ? 'orange' : activeGuest.side === 'groom' ? 'blue' : 'green'}`} style={{ fontSize: '10px' }}>
                          {activeGuest.side === 'bride' ? 'Bride' : activeGuest.side === 'groom' ? 'Groom' : 'Family'}
                        </span>
                      )}
                    </div>

                    {/* Guest Body / Details */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingRoomId === room.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Guest Name</label>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Guest Name"
                                style={{
                                  fontSize: '14px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  width: '100%',
                                  background: 'var(--white)',
                                  color: 'var(--text)'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Phone Number</label>
                              <input
                                type="text"
                                value={editForm.phone}
                                onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Phone Number"
                                style={{
                                  fontSize: '14px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  width: '100%',
                                  background: 'var(--white)',
                                  color: 'var(--text)'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Guest Side</label>
                              <select
                                value={editForm.side}
                                onChange={e => setEditForm(prev => ({ ...prev, side: e.target.value }))}
                                style={{
                                  fontSize: '14px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  width: '100%',
                                  background: 'var(--white)',
                                  color: 'var(--text)',
                                  fontFamily: 'inherit'
                                }}
                              >
                                <option value="bride">Bride Side</option>
                                <option value="groom">Groom Side</option>
                                <option value="both">Both / Family</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Room Number</label>
                              <input
                                type="text"
                                value={editForm.roomNo}
                                onChange={e => setEditForm(prev => ({ ...prev, roomNo: e.target.value }))}
                                placeholder="Room Number"
                                style={{
                                  fontSize: '14px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  width: '100%',
                                  background: 'var(--white)',
                                  color: 'var(--text)'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button
                                disabled={savingRoomId === room.id}
                                onClick={() => saveInlineEdit(null, room.id)}
                                className="btn btn-sm"
                                style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
                              >
                                {savingRoomId === room.id ? 'Assigning...' : 'Assign'}
                              </button>
                              <button
                                onClick={() => setEditingRoomId(null)}
                                className="btn btn-sm btn-ghost"
                                style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : activeGuest ? (
                          editingGuestId === activeGuest.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Guest Name</label>
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Guest Name"
                                  style={{
                                    fontSize: '14px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    width: '100%',
                                    background: 'var(--white)',
                                    color: 'var(--text)'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Phone Number</label>
                                <input
                                  type="text"
                                  value={editForm.phone}
                                  onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                  placeholder="Phone Number"
                                  style={{
                                    fontSize: '14px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    width: '100%',
                                    background: 'var(--white)',
                                    color: 'var(--text)'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Room Number</label>
                                <input
                                  type="text"
                                  value={editForm.roomNo}
                                  onChange={e => setEditForm(prev => ({ ...prev, roomNo: e.target.value }))}
                                  placeholder="Room Number"
                                  style={{
                                    fontSize: '14px',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    width: '100%',
                                    background: 'var(--white)',
                                    color: 'var(--text)'
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button
                                  disabled={savingGuestId === activeGuest.id}
                                  onClick={() => saveInlineEdit(activeGuest.id, room.id)}
                                  className="btn btn-sm"
                                  style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
                                >
                                  {savingGuestId === activeGuest.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingGuestId(null)}
                                  className="btn btn-sm btn-ghost"
                                  style={{ width: 'auto', padding: '4px 12px', fontSize: '12px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                                {activeGuest.name}
                                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>
                                  ({activeGuest.party_size || 1} pax)
                                </span>
                              </div>
                              
                              {activeGuest.phone && (
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone className="w-3 h-3" />
                                  {activeGuest.phone}
                                </div>
                              )}
 
                              {activeGuest.hometown && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                  From: {activeGuest.hometown}
                                </div>
                              )}
 
                              {activeGuest.sub_guests && activeGuest.sub_guests.length > 0 && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', fontStyle: 'italic' }}>
                                  Subs: {activeGuest.sub_guests.map(s => s.phone ? `${s.name} (${s.phone})` : s.name).join(', ')}
                                </div>
                              )}
                            </>
                          )
                        ) : (
                          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Vacant / Ready for Assignment
                          </div>
                        )}
                      </div>

                      {/* Quick actions panel */}
                      {activeGuest && editingGuestId !== activeGuest.id && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setEditingGuestId(activeGuest.id);
                              setEditForm({
                                name: activeGuest.name || '',
                                phone: activeGuest.phone || '',
                                roomNo: room.room_no,
                                roomId: room.id,
                                side: activeGuest.side || 'bride'
                              });
                            }}
                            className="call-btn"
                            style={{ width: '32px', height: '32px', boxShadow: 'none', background: 'var(--bg)', color: 'var(--text-muted)' }}
                            title="Edit guest details"
                          >
                            <Edit3 className="w-4.5 h-4.5" />
                          </button>
                          {activeGuest.phone && (
                            <a href={`tel:${activeGuest.phone}`} className="call-btn" style={{ width: '32px', height: '32px', boxShadow: 'none' }} title="Call guest">
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Keys Status Handover control bar */}
                    {activeRG ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Quick Keys:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                            <button
                              disabled={updatingGuestId === activeRG.id}
                              onClick={() => updateKeyStatus(activeRG.id, 'not_given')}
                              style={{
                                border: '1px solid var(--border)',
                                background: keyStatus === 'not_given' || keyStatus === 'none' ? 'var(--orange-bg)' : 'var(--white)',
                                borderColor: keyStatus === 'not_given' || keyStatus === 'none' ? '#fcd34d' : 'var(--border)',
                                color: keyStatus === 'not_given' || keyStatus === 'none' ? 'var(--orange)' : 'var(--text-muted)',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                flexShrink: 0
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Not Given
                            </button>
                            
                            <button
                              disabled={updatingGuestId === activeRG.id}
                              onClick={() => updateKeyStatus(activeRG.id, 'given')}
                              style={{
                                border: '1px solid var(--border)',
                                background: keyStatus === 'given' ? 'var(--orange-bg)' : 'var(--white)',
                                borderColor: keyStatus === 'given' ? '#fcd34d' : 'var(--border)',
                                color: keyStatus === 'given' ? 'var(--orange)' : 'var(--text-muted)',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                flexShrink: 0
                              }}
                            >
                              <Key className="w-3.5 h-3.5" />
                              Given
                            </button>

                            <button
                              disabled={updatingGuestId === activeRG.id}
                              onClick={() => updateKeyStatus(activeRG.id, 'collected')}
                              style={{
                                border: '1px solid var(--border)',
                                background: keyStatus === 'collected' || keyStatus === 'back' ? 'var(--green-bg)' : 'var(--white)',
                                borderColor: keyStatus === 'collected' || keyStatus === 'back' ? '#86efac' : 'var(--border)',
                                color: keyStatus === 'collected' || keyStatus === 'back' ? 'var(--green)' : 'var(--text-muted)',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                flexShrink: 0
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Collected
                            </button>

                            <button
                              disabled={updatingGuestId === activeRG.id}
                              onClick={() => updateKeyStatus(activeRG.id, 'reception')}
                              style={{
                                border: '1px solid var(--border)',
                                background: keyStatus === 'reception' ? '#f5f3ff' : 'var(--white)',
                                borderColor: keyStatus === 'reception' ? '#a78bfa' : 'var(--border)',
                                color: keyStatus === 'reception' ? '#6d28d9' : 'var(--text-muted)',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                flexShrink: 0
                              }}
                            >
                              <Key className="w-3.5 h-3.5" style={{ transform: 'rotate(-45deg)' }} />
                              Reception
                            </button>
                          </div>
                        </div>

                        {/* Quick AC Remote Status Handover control bar */}
                        {room.lodge?.ac_remote_required && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Quick AC Remote:
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateRemoteStatus(activeRG.id, 'not_given')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.ac_remote_given === 'not_given' || !activeRG.ac_remote_given || activeRG.ac_remote_given === 'none' ? 'var(--orange-bg)' : 'var(--white)',
                                  borderColor: activeRG.ac_remote_given === 'not_given' || !activeRG.ac_remote_given || activeRG.ac_remote_given === 'none' ? '#fcd34d' : 'var(--border)',
                                  color: activeRG.ac_remote_given === 'not_given' || !activeRG.ac_remote_given || activeRG.ac_remote_given === 'none' ? 'var(--orange)' : 'var(--text-muted)',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Not Given
                              </button>
                              
                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateRemoteStatus(activeRG.id, 'given')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.ac_remote_given === 'given' ? 'var(--orange-bg)' : 'var(--white)',
                                  borderColor: activeRG.ac_remote_given === 'given' ? '#fcd34d' : 'var(--border)',
                                  color: activeRG.ac_remote_given === 'given' ? 'var(--orange)' : 'var(--text-muted)',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
                                }}
                              >
                                <Key className="w-3.5 h-3.5" />
                                Given
                              </button>

                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateRemoteStatus(activeRG.id, 'collected')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.ac_remote_given === 'collected' || activeRG.ac_remote_given === 'back' ? 'var(--green-bg)' : 'var(--white)',
                                  borderColor: activeRG.ac_remote_given === 'collected' || activeRG.ac_remote_given === 'back' ? '#86efac' : 'var(--border)',
                                  color: activeRG.ac_remote_given === 'collected' || activeRG.ac_remote_given === 'back' ? 'var(--green)' : 'var(--text-muted)',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Collected
                              </button>

                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateRemoteStatus(activeRG.id, 'reception')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.ac_remote_given === 'reception' ? '#f5f3ff' : 'var(--white)',
                                  borderColor: activeRG.ac_remote_given === 'reception' ? '#a78bfa' : 'var(--border)',
                                  color: activeRG.ac_remote_given === 'reception' ? '#6d28d9' : 'var(--text-muted)',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Reception
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quick Extra Bed Status control bar */}
                        {room.extra_bed && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Quick Extra Bed:
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateExtraBedStatus(activeRG.id, 'not_required')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.extra_bed_status === 'not_required' || !activeRG.extra_bed_status || activeRG.extra_bed_status === 'none' ? 'var(--green-bg)' : 'var(--white)',
                                  borderColor: activeRG.extra_bed_status === 'not_required' || !activeRG.extra_bed_status || activeRG.extra_bed_status === 'none' ? '#86efac' : 'var(--border)',
                                  color: activeRG.extra_bed_status === 'not_required' || !activeRG.extra_bed_status || activeRG.extra_bed_status === 'none' ? 'var(--green)' : 'var(--text-muted)',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                N/A
                              </button>
                              
                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateExtraBedStatus(activeRG.id, 'procured')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.extra_bed_status === 'procured' ? 'var(--orange-bg)' : 'var(--white)',
                                  borderColor: activeRG.extra_bed_status === 'procured' ? '#fcd34d' : 'var(--border)',
                                  color: activeRG.extra_bed_status === 'procured' ? 'var(--orange)' : 'var(--text-muted)',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
                                }}
                              >
                                <Key className="w-3.5 h-3.5" />
                                Procured
                              </button>

                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateExtraBedStatus(activeRG.id, 'returned')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.extra_bed_status === 'returned' ? 'var(--green-bg)' : 'var(--white)',
                                  borderColor: activeRG.extra_bed_status === 'returned' ? '#86efac' : 'var(--border)',
                                  color: activeRG.extra_bed_status === 'returned' ? 'var(--green)' : 'var(--text-muted)',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  flexShrink: 0
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Returned
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingRoomId(room.id);
                          setEditForm({
                            name: '',
                            phone: '',
                            roomNo: room.room_no,
                            roomId: room.id,
                            side: 'bride'
                          });
                        }}
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6px', background: 'var(--bg)', borderRadius: '8px', fontSize: '12px', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', border: '1px dashed var(--blue-mid)', marginTop: '4px' }}
                      >
                        + Tap to Assign Guest
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
