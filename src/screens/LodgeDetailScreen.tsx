import { useEffect, useState } from 'react';
import { ChevronLeft, Navigation, Key, Plus, Phone, Trash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';

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

interface Contact {
  name: string;
  phone: string;
  role: string;
}

interface Lodge {
  id: string;
  name: string;
  address: string | null;
  maps_link: string | null;
  contacts: Contact[] | null;
  ac_remote_required?: boolean;
}

const BED_CONFIGS = ['Double Bed × 1', 'Double Bed × 1, Single Bed × 1', 'Double Bed × 2', 'Single Bed × 2', 'Other'];
const FLOORS = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];

export function LodgeDetailScreen({ lodgeId }: { lodgeId: string }) {
  const { goBack, navigate } = useNavigation();
  const { isAdmin } = useAuth();
  const [lodge, setLodge] = useState<Lodge | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ room_no: '', room_type: '', bed_config: BED_CONFIGS[0], floor: FLOORS[0], category: 'TRT', extra_bed: false });
  
  const [editForm, setEditForm] = useState({ name: '', address: '', maps_link: '', ac_remote_required: false });
  const [editContacts, setEditContacts] = useState<Contact[]>([]);
  
  const [saving, setSaving] = useState(false);

  async function load() {
    const [lodgeRes, roomsRes] = await Promise.all([
      supabase.from('lodges').select('id, name, address, maps_link, contacts, ac_remote_required').eq('id', lodgeId).single(),
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

  const handleOpenEdit = () => {
    if (!lodge) return;
    setEditForm({
      name: lodge.name || '',
      address: lodge.address || '',
      maps_link: lodge.maps_link || '',
      ac_remote_required: lodge.ac_remote_required || false,
    });
    setEditContacts(lodge.contacts ? [...lodge.contacts] : [{ name: '', phone: '', role: 'Lodge Contact' }]);
    setShowEdit(true);
  };

  async function saveLodge() {
    if (!editForm.name.trim() || !lodge) return;
    setSaving(true);
    
    const activeContacts = editContacts.filter(c => c.name.trim() || c.phone.trim() || c.role.trim());

    await supabase
      .from('lodges')
      .update({
        name: editForm.name.trim(),
        address: editForm.address.trim() || null,
        maps_link: editForm.maps_link.trim() || null,
        contacts: activeContacts,
        ac_remote_required: editForm.ac_remote_required,
      })
      .eq('id', lodge.id);

    setShowEdit(false);
    setSaving(false);
    load();
  }

  async function deleteLodge() {
    if (!lodge) return;
    const confirm1 = window.confirm(`Are you sure you want to delete ${lodge.name}?`);
    if (confirm1) {
      const confirm2 = window.confirm(`WARNING: This will permanently delete all rooms and guest allocations associated with ${lodge.name}. This action cannot be undone. Are you absolutely sure?`);
      if (confirm2) {
        setSaving(true);
        await supabase.from('lodges').delete().eq('id', lodge.id);
        goBack();
      }
    }
  }

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

  const addContactField = () => {
    setEditContacts([...editContacts, { name: '', phone: '', role: 'Lodge Contact' }]);
  };

  const removeContactField = (index: number) => {
    setEditContacts(editContacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...editContacts];
    updated[index][field] = value;
    setEditContacts(updated);
  };

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
        <h1 style={{ flex: 1 }}>
          {lodge?.name ?? '…'}
          {lodge && <span className="subtitle">{rooms.length} rooms</span>}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleOpenEdit} className="topbar-action">
            Edit
          </button>
          <button onClick={() => setShowAdd(true)} className="topbar-action">
            + Room
          </button>
        </div>
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
            {lodge?.contacts && lodge.contacts.length > 0 && (
              <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lodge.contacts.map((contact, idx) => (
                  <div key={idx}>
                    {idx > 0 && <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {contact.role || 'Lodge Contact'}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                          {contact.name ? `${contact.name} (${contact.phone})` : contact.phone}
                        </span>
                      </div>
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="call-btn" style={{ width: '36px', height: '36px', boxShadow: 'none' }} title={`Call ${contact.name || contact.role}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
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

      {/* Edit Lodge Modal */}
      {showEdit && (
        <div className="modal-overlay open" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Edit Lodge Details</div>
            
            <div className="form-group">
              <label>Lodge Name *</label>
              <input
                type="text"
                placeholder="e.g. Jothi Lodge"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Dynamic Contacts Section */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', flex: 1, margin: 0 }}>Contacts</label>
                <button 
                  type="button" 
                  onClick={addContactField}
                  className="btn btn-sm btn-secondary" 
                  style={{ width: 'auto', padding: '4px 10px', fontSize: '12px' }}
                >
                  + Add Contact
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editContacts.map((contact, idx) => (
                  <div key={idx} style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', position: 'relative' }}>
                    {editContacts.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeContactField(idx)}
                        style={{ position: 'absolute', right: '8px', top: '8px', border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Name</label>
                          <input
                            type="text"
                            placeholder="Contact Name"
                            value={contact.name}
                            onChange={e => updateContact(idx, 'name', e.target.value)}
                            style={{ padding: '8px 10px', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone</label>
                          <input
                            type="tel"
                            placeholder="Phone number"
                            value={contact.phone}
                            onChange={e => updateContact(idx, 'phone', e.target.value)}
                            style={{ padding: '8px 10px', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Role / Label</label>
                        <select
                          value={contact.role}
                          onChange={e => updateContact(idx, 'role', e.target.value)}
                          style={{ padding: '8px 10px', fontSize: '13px' }}
                        >
                          <option>Lodge Contact</option>
                          <option>Lodge In-charge</option>
                          <option>Supervisor</option>
                          <option>Owner</option>
                          <option>Manager</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Address / Notes</label>
              <textarea
                placeholder="Street, landmark…"
                value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', display: 'flex', marginTop: '10px' }}>
              <input
                type="checkbox"
                id="ac_remote_required"
                checked={editForm.ac_remote_required}
                onChange={e => setEditForm(f => ({ ...f, ac_remote_required: e.target.checked }))}
                style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
              />
              <label htmlFor="ac_remote_required" style={{ margin: 0, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                Track AC Remotes for this Lodge
              </label>
            </div>

            <div className="form-group">
              <label>Google Maps Link</label>
              <input
                type="url"
                placeholder="Paste maps.google.com or goo.gl link…"
                value={editForm.maps_link}
                onChange={e => setEditForm(f => ({ ...f, maps_link: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={saveLodge}
                disabled={saving || !editForm.name.trim()}
                className="btn btn-primary"
              >
                Save Changes
              </button>
              {isAdmin && (
                <button
                  onClick={deleteLodge}
                  disabled={saving}
                  className="btn btn-danger"
                >
                  Delete Lodge
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
