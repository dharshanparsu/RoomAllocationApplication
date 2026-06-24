import { useEffect, useState } from 'react';
import { Key, CheckCircle2, Phone, Search, SlidersHorizontal, ChevronRight, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface SubGuest {
  name: string;
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
  const [selectedOccupancy, setSelectedOccupancy] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Loading/saving state per room guest for inline actions
  const [updatingGuestId, setUpdatingGuestId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [roomsRes, lodgesRes] = await Promise.all([
      supabase.from('rooms').select(`
        id, room_no, room_type, bed_config, floor, category, extra_bed, notes,
        lodge:lodges(id, name, ac_remote_required),
        room_guests(id, keys_given, ac_remote_given, guest:guests(id, name, phone, party_size, hometown, side, notes, sub_guests))
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

  async function updateKeyStatus(roomGuestId: string, newStatus: string) {
    setUpdatingGuestId(roomGuestId);
    const { error } = await supabase
      .from('room_guests')
      .update({ keys_given: newStatus })
      .eq('id', roomGuestId);

    if (!error) {
      // Update local state to feel fast and avoid full reload spinner
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
    }
    setUpdatingGuestId(null);
  }

  async function updateRemoteStatus(roomGuestId: string, newStatus: string) {
    setUpdatingGuestId(roomGuestId);
    const { error } = await supabase
      .from('room_guests')
      .update({ ac_remote_given: newStatus })
      .eq('id', roomGuestId);

    if (!error) {
      // Update local state to feel fast
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
    }
    setUpdatingGuestId(null);
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
      if (selectedKeyStatus === 'given' && currentKey !== 'given') return false;
      if (selectedKeyStatus === 'collected' && currentKey !== 'collected' && currentKey !== 'back') return false;
    }

    // Side filter
    if (selectedSide !== 'All' && activeGuest?.side !== selectedSide) {
      return false;
    }

    // Occupancy filter
    if (selectedOccupancy !== 'All') {
      const hasGuest = !!activeGuest;
      if (selectedOccupancy === 'assigned' && !hasGuest) return false;
      if (selectedOccupancy === 'vacant' && hasGuest) return false;
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
        <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="grid grid-cols-2 gap-3">
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
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Occupancy</label>
              <select
                value={selectedOccupancy}
                onChange={e => setSelectedOccupancy(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--white)' }}
              >
                <option value="All">All Rooms</option>
                <option value="assigned">Occupied / Assigned</option>
                <option value="vacant">Vacant / Unassigned</option>
              </select>
            </div>
          </div>
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
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
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
                        {activeGuest ? (
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
                                Subs: {activeGuest.sub_guests.map(s => s.name).join(', ')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Vacant / Ready for Assignment
                          </div>
                        )}
                      </div>

                      {/* Phone quick call */}
                      {activeGuest?.phone && (
                        <a href={`tel:${activeGuest.phone}`} className="call-btn" style={{ width: '32px', height: '32px', boxShadow: 'none' }} title="Call guest">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Quick Keys Status Handover control bar */}
                    {activeRG ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', padding: '6px 10px', borderRadius: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Quick Keys:
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              disabled={updatingGuestId === activeRG.id}
                              onClick={() => updateKeyStatus(activeRG.id, 'not_given')}
                              style={{
                                border: '1px solid var(--border)',
                                background: keyStatus === 'not_given' || keyStatus === 'none' ? 'var(--orange-bg)' : 'var(--white)',
                                borderColor: keyStatus === 'not_given' || keyStatus === 'none' ? '#fcd34d' : 'var(--border)',
                                color: keyStatus === 'not_given' || keyStatus === 'none' ? 'var(--orange)' : 'var(--text-muted)',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
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
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
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
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Collected
                            </button>
                          </div>
                        </div>

                        {/* Quick AC Remote Status Handover control bar */}
                        {room.lodge?.ac_remote_required && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', padding: '6px 10px', borderRadius: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Quick AC Remote:
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                disabled={updatingGuestId === activeRG.id}
                                onClick={() => updateRemoteStatus(activeRG.id, 'not_given')}
                                style={{
                                  border: '1px solid var(--border)',
                                  background: activeRG.ac_remote_given === 'not_given' || !activeRG.ac_remote_given || activeRG.ac_remote_given === 'none' ? 'var(--orange-bg)' : 'var(--white)',
                                  borderColor: activeRG.ac_remote_given === 'not_given' || !activeRG.ac_remote_given || activeRG.ac_remote_given === 'none' ? '#fcd34d' : 'var(--border)',
                                  color: activeRG.ac_remote_given === 'not_given' || !activeRG.ac_remote_given || activeRG.ac_remote_given === 'none' ? 'var(--orange)' : 'var(--text-muted)',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
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
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
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
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Collected
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        onClick={() => navigate({ name: 'room', roomId: room.id })}
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
    </div>
  );
}
