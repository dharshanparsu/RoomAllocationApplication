import { useEffect, useState } from 'react';
import { Search, User, ChevronRight, Plus, Trash } from 'lucide-react';
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
  sub_guests: SubGuest[] | null;
  room_guests: {
    room: { room_no: string; lodge: { name: string } | null } | null;
  }[];
}

export function GuestsScreen() {
  const { navigate } = useNavigation();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', party_size: '', hometown: '', side: 'groom' });
  const [subGuests, setSubGuests] = useState<SubGuest[]>([]);
  const [saving, setSaving] = useState(false);
  const [userInteractedSide, setUserInteractedSide] = useState(false);

  useEffect(() => {
    if (userInteractedSide) return;
    const nameLower = form.name.toLowerCase();
    const hometownLower = form.hometown.toLowerCase();
    const mentionsBride = 
      nameLower.includes('madanapalle') || 
      nameLower.includes('ashok') || 
      nameLower.includes('amulya') ||
      hometownLower.includes('madanapalle') || 
      hometownLower.includes('ashok') || 
      hometownLower.includes('amulya');

    setForm(f => ({ ...f, side: mentionsBride ? 'bride' : 'groom' }));
  }, [form.name, form.hometown, userInteractedSide]);

  async function load() {
    const { data } = await supabase
      .from('guests')
      .select('id, name, phone, party_size, hometown, sub_guests, room_guests(room:rooms(room_no, lodge:lodges(name)))')
      .order('name');
    setGuests((data ?? []) as unknown as Guest[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addGuest() {
    if (!form.name.trim()) return;
    setSaving(true);

    const activeSubGuests = subGuests.filter(s => s.name.trim());
    // Auto-calculate party size if not specified
    const calculatedPartySize = form.party_size.trim() 
      ? parseInt(form.party_size) 
      : (activeSubGuests.length + 1);

    await supabase.from('guests').insert({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      party_size: calculatedPartySize,
      hometown: form.hometown.trim() || null,
      side: form.side,
      sub_guests: activeSubGuests,
    });
    setForm({ name: '', phone: '', party_size: '', hometown: '', side: 'groom' });
    setUserInteractedSide(false);
    setSubGuests([]);
    setShowAdd(false);
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

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(query.toLowerCase()) ||
    g.phone?.includes(query) ||
    g.hometown?.toLowerCase().includes(query.toLowerCase()) ||
    (g.sub_guests && g.sub_guests.some(s => s.name.toLowerCase().includes(query.toLowerCase())))
  );

  function roomLabel(g: Guest) {
    const rg = g.room_guests?.[0];
    if (!rg?.room) return null;
    return `Room ${rg.room.room_no}`;
  }

  return (
    <div className="screen active">
      <div className="topbar">
        <h1>Guests</h1>
        <button onClick={() => { setForm({ name: '', phone: '', party_size: '', hometown: '', side: 'groom' }); setUserInteractedSide(false); setSubGuests([]); setShowAdd(true); }} className="topbar-action">
          + Add
        </button>
      </div>

      <div className="scroll">
        <div style={{ padding: '12px 16px' }}>
          <div className="search-wrap">
            <span className="search-icon"><Search className="w-4 h-4" /></span>
            <input
              type="search"
              placeholder="Search guests…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card">
            {filtered.length === 0 && (
              <p className="p-8 text-sm text-gray-400 text-center">
                {query ? 'No guests match your search' : 'No guests yet. Tap + Add to create one.'}
              </p>
            )}
            {filtered.map((guest) => {
              const room = roomLabel(guest);
              const subNames = guest.sub_guests && guest.sub_guests.length > 0
                ? `+ ${guest.sub_guests.map(s => s.name).join(', ')}`
                : null;
              
              return (
                <div
                  key={guest.id}
                  onClick={() => navigate({ name: 'guest', guestId: guest.id })}
                  className="list-row"
                >
                  <div className="row-icon blue">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="row-body">
                    <div className="row-title">
                      {guest.name}
                    </div>
                    <div className="row-sub">
                      {[
                        guest.phone,
                        guest.party_size ? `${guest.party_size} persons` : null,
                        guest.hometown,
                        subNames
                      ].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="row-end" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${room ? 'green' : 'gray'}`}>
                      {room ?? 'No room'}
                    </span>
                    <span className="chevron">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Guest Modal */}
      {showAdd && (
        <div className="modal-overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Add Guest</div>
            
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                placeholder="Guest name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Dynamic Sub-guests builder */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', flex: 1, margin: 0 }}>Sub Guests</label>
                <button 
                  type="button" 
                  onClick={addSubGuestField}
                  className="btn btn-sm btn-secondary" 
                  style={{ width: 'auto', padding: '4px 10px', fontSize: '12px' }}
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
                      style={{ padding: '8px 10px', fontSize: '14px', flex: 1 }}
                    />
                    <button 
                      type="button"
                      onClick={() => removeSubGuestField(idx)}
                      style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', padding: '6px' }}
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                placeholder="Mobile number"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Party size (optional - defaults to main + sub guests)</label>
              <input
                type="number"
                placeholder={subGuests.length > 0 ? (subGuests.length + 1).toString() : "No. of persons"}
                value={form.party_size}
                onChange={e => setForm(f => ({ ...f, party_size: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Hometown</label>
              <input
                type="text"
                placeholder="City / town"
                value={form.hometown}
                onChange={e => setForm(f => ({ ...f, hometown: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Side</label>
              <select
                value={form.side}
                onChange={e => {
                  setForm(f => ({ ...f, side: e.target.value }));
                  setUserInteractedSide(true);
                }}
              >
                <option value="bride">Bride's side</option>
                <option value="groom">Groom's side</option>
                <option value="both">Both / Family</option>
              </select>
            </div>
            <button
              onClick={addGuest}
              disabled={saving || !form.name.trim()}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add Guest'}
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
