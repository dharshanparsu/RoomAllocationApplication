import { useEffect, useState } from 'react';
import { ChevronLeft, Navigation, Key, Plus, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface Guest { id: string; name: string }
interface RoomGuest { id: string; keys_given: string; guest: Guest | null }
interface Room {
  id: string;
  room_no: string;
  room_type: string | null;
  bed_config: string;
  floor: string | null;
  room_guests: RoomGuest[];
}
interface Lodge {
  id: string;
  name: string;
  address: string | null;
  maps_link: string | null;
  lodge_contact: string | null;
  incharge_name: string | null;
  incharge_contact: string | null;
}

const BED_CONFIGS = ['Double Bed × 1', 'Double Bed × 1, Single Bed × 1', 'Double Bed × 2', 'Single Bed × 2', 'Other'];
const FLOORS = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];

export function LodgeDetailScreen({ lodgeId }: { lodgeId: string }) {
  const { goBack, navigate } = useNavigation();
  const [lodge, setLodge] = useState<Lodge | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ room_no: '', room_type: '', bed_config: BED_CONFIGS[0], floor: FLOORS[0], category: 'TRT', extra_bed: false });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [lodgeRes, roomsRes] = await Promise.all([
      supabase.from('lodges').select('id, name, address, maps_link, lodge_contact, incharge_name, incharge_contact').eq('id', lodgeId).single(),
      supabase.from('rooms')
        .select('id, room_no, room_type, bed_config, floor, room_guests(id, keys_given, guest:guests(id, name))')
        .eq('lodge_id', lodgeId)
        .order('floor').order('room_no'),
    ]);
    setLodge(lodgeRes.data as Lodge);
    setRooms((roomsRes.data ?? []) as unknown as Room[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [lodgeId]);

  async function addRoom() {
    if (!form.room_no.trim()) return;
    setSaving(true);
    await supabase.from('rooms').insert({
      lodge_id: lodgeId,
      room_no: form.room_no.trim(),
      room_type: form.room_type.trim() || null,
      bed_config: form.bed_config,
      floor: form.floor,
      category: form.category,
      extra_bed: form.extra_bed,
    });
    setForm({ room_no: '', room_type: '', bed_config: BED_CONFIGS[0], floor: FLOORS[0], category: 'TRT', extra_bed: false });
    setShowAdd(false);
    setSaving(false);
    load();
  }

  const floors = [...new Set(rooms.map(r => r.floor ?? 'Other'))];

  function chipStatus(room: Room) {
    if (room.room_guests.length === 0) return 'vacant';
    const kg = room.room_guests[0].keys_given;
    if (kg === 'given' || kg === 'collected') return 'keys-out';
    return 'occupied';
  }

  function chipLabel(room: Room) {
    if (room.room_guests.length === 0) return room.room_type || room.bed_config.split(',')[0].trim();
    const g = room.room_guests[0].guest;
    return g?.name?.split(' ')[0] ?? '—';
  }

  return (
    <div className="screen active">
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>
          <ChevronLeft className="w-[22px] h-[22px]" />
        </button>
        <h1>
          {lodge?.name ?? '…'}
          {lodge && <span className="subtitle">{rooms.length} rooms</span>}
        </h1>
        <button onClick={() => setShowAdd(true)} className="topbar-action">
          + Room
        </button>
      </div>

      <div className="scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {lodge?.maps_link && (
              <a href={lodge.maps_link} target="_blank" rel="noopener noreferrer" className="maps-banner">
                <div className="maps-banner-icon"><Navigation className="w-[18px] h-[18px]" /></div>
                <div className="maps-banner-body">
                  <div className="maps-banner-title">{lodge.address || lodge.name}</div>
                  <div className="maps-banner-sub">Tap to open in Google Maps</div>
                </div>
                <div className="maps-banner-arrow"><ChevronLeft className="w-[18px] h-[18px] rotate-180" /></div>
              </a>
            )}

            {/* Contacts Card */}
            {(lodge?.lodge_contact || lodge?.incharge_contact) && (
              <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lodge.lodge_contact && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lodge Contact</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{lodge.lodge_contact}</span>
                    </div>
                    <a href={`tel:${lodge.lodge_contact}`} className="call-btn" style={{ width: '36px', height: '36px', boxShadow: 'none' }} title="Call Lodge">
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                )}
                {lodge.lodge_contact && lodge.incharge_contact && <div style={{ borderTop: '1px solid var(--border)' }} />}
                {lodge.incharge_contact && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lodge In-charge</span>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                        {lodge.incharge_name ? `${lodge.incharge_name} (${lodge.incharge_contact})` : lodge.incharge_contact}
                      </span>
                    </div>
                    <a href={`tel:${lodge.incharge_contact}`} className="call-btn" style={{ width: '36px', height: '36px', boxShadow: 'none' }} title="Call In-charge">
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', padding: '12px 16px 4px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span className="legend-dot dot-blue"></span>Vacant
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span className="legend-dot dot-green"></span>Assigned
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span className="legend-dot dot-orange"></span>Key given
              </span>
            </div>

            {rooms.length === 0 && (
              <p className="p-8 text-sm text-gray-400 text-center">No rooms yet. Tap + Room to add one.</p>
            )}

            {floors.map(floor => (
              <div key={floor}>
                <div className="section-header">{floor}</div>
                <div className="room-grid">
                  {rooms.filter(r => (r.floor ?? 'Other') === floor).map(room => {
                    const status = chipStatus(room);
                    return (
                      <div
                        key={room.id}
                        onClick={() => navigate({ name: 'room', roomId: room.id })}
                        className={`room-chip ${status}`}
                      >
                        <div className="room-chip-num">{room.room_no}</div>
                        <div className="room-chip-label">
                          {chipLabel(room)}
                          {status === 'keys-out' && (
                            <span className="room-chip-key">
                              <Key className="w-[11px] h-[11px]" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Add Room Modal */}
      {showAdd && (
        <div className="modal-overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Add Room</div>
            <div className="form-group">
              <label>Room Number</label>
              <input
                type="text"
                placeholder="e.g. 16"
                value={form.room_no}
                onChange={e => setForm(f => ({ ...f, room_no: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Room Type</label>
              <input
                type="text"
                placeholder="Standard / Deluxe / AC / Suite…"
                value={form.room_type}
                onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Bed Configuration</label>
              <select
                value={form.bed_config}
                onChange={e => setForm(f => ({ ...f, bed_config: e.target.value }))}
              >
                {BED_CONFIGS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Floor</label>
              <select
                value={form.floor}
                onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
              >
                {FLOORS.map(fl => <option key={fl}>{fl}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                <option>TRT</option>
                <option>MPT</option>
              </select>
            </div>
            <div className="form-group">
              <label>Extra bed available?</label>
              <select
                value={form.extra_bed ? 'Yes' : 'No'}
                onChange={e => setForm(f => ({ ...f, extra_bed: e.target.value === 'Yes' }))}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
            <button
              onClick={addRoom}
              disabled={saving || !form.room_no.trim()}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> {saving ? 'Creating…' : 'Create Room'}
            </button>
            <div style={{ marginTop: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
