import { useEffect, useState } from 'react';
import { Building2, ChevronRight, Navigation, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface Lodge {
  id: string;
  name: string;
  address: string | null;
  maps_link: string | null;
  lodge_contact: string | null;
  incharge_name: string | null;
  incharge_contact: string | null;
  rooms: { id: string; room_guests: { id: string }[] }[];
}

export function LodgesScreen() {
  const { navigate } = useNavigation();
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', maps_link: '', lodge_contact: '', incharge_name: '', incharge_contact: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('lodges')
      .select('id, name, address, maps_link, lodge_contact, incharge_name, incharge_contact, rooms(id, room_guests(id))')
      .order('name');
    setLodges((data ?? []) as Lodge[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addLodge() {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from('lodges').insert({
      name: form.name.trim(),
      address: form.address.trim() || null,
      maps_link: form.maps_link.trim() || null,
      lodge_contact: form.lodge_contact.trim() || null,
      incharge_name: form.incharge_name.trim() || null,
      incharge_contact: form.incharge_contact.trim() || null,
    });
    setForm({ name: '', address: '', maps_link: '', lodge_contact: '', incharge_name: '', incharge_contact: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  }

  return (
    <div className="screen active">
      <div className="topbar">
        <h1>Lodges</h1>
        <button onClick={() => setShowAdd(true)} className="topbar-action">
          + Add
        </button>
      </div>

      <div className="scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card">
            {lodges.length === 0 && (
              <p className="p-8 text-sm text-gray-400 text-center">No lodges yet. Tap + Add to create one.</p>
            )}
            {lodges.map((lodge) => {
              const total = lodge.rooms.length;
              const assigned = lodge.rooms.filter(r => r.room_guests.length > 0).length;
              const vacant = total - assigned;
              return (
                <div
                  key={lodge.id}
                  onClick={() => navigate({ name: 'lodge', lodgeId: lodge.id })}
                  className="list-row"
                >
                  <div className="row-icon blue">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="row-body">
                    <div className="row-title">{lodge.name}</div>
                    <div className="row-sub">
                      {total} rooms{lodge.address ? ` · ${lodge.address}` : ''}
                    </div>
                  </div>
                  <div className="row-end" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${vacant > 0 ? 'orange' : 'green'}`}>
                      {vacant > 0 ? `${vacant} vacant` : 'Full'}
                    </span>
                    {lodge.maps_link && (
                      <a
                        href={lodge.maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="map-btn"
                        title="Navigate"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    )}
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

      {/* Add Lodge Modal */}
      {showAdd && (
        <div className="modal-overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Add Lodge</div>
            
            <div className="form-group">
              <label>Lodge Name *</label>
              <input
                type="text"
                placeholder="e.g. Jothi Lodge"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Lodge Contact Number</label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={form.lodge_contact}
                onChange={e => setForm(f => ({ ...f, lodge_contact: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>In-charge Name</label>
                <input
                  type="text"
                  placeholder="In-charge name"
                  value={form.incharge_name}
                  onChange={e => setForm(f => ({ ...f, incharge_name: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>In-charge Contact</label>
                <input
                  type="tel"
                  placeholder="In-charge phone"
                  value={form.incharge_contact}
                  onChange={e => setForm(f => ({ ...f, incharge_contact: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Address / Notes</label>
              <textarea
                placeholder="Street, landmark…"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Google Maps Link</label>
              <input
                type="url"
                placeholder="Paste maps.google.com or goo.gl link…"
                value={form.maps_link}
                onChange={e => setForm(f => ({ ...f, maps_link: e.target.value }))}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                Open Google Maps → Share → Copy link, then paste it here.
              </div>
            </div>

            <button
              onClick={addLodge}
              disabled={saving || !form.name.trim()}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" /> {saving ? 'Creating…' : 'Create Lodge'}
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
