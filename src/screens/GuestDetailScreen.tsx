import { useEffect, useState } from 'react';
import { ChevronLeft, Phone, Save, RefreshCw, Building2, Trash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface SubGuest {
  name: string;
  phone?: string;
}

interface GuestData {
  id: string;
  name: string;
  phone: string | null;
  party_size: number | null;
  hometown: string | null;
  side: string | null;
  notes: string | null;
  sub_guests: SubGuest[] | null;
  room_guests: {
    id: string;
    keys_given: string;
    room: {
      id: string;
      room_no: string;
      bed_config: string;
      floor: string | null;
      lodge: { id: string; name: string } | null;
    } | null;
  }[];
}

interface GuestForm {
  name: string;
  phone: string;
  party_size: string;
  hometown: string;
  side: string;
  notes: string;
}

export function GuestDetailScreen({ guestId }: { guestId: string }) {
  const { goBack, navigate } = useNavigation();
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<GuestForm>({ name: '', phone: '', party_size: '', hometown: '', side: 'groom', notes: '' });
  const [subGuests, setSubGuests] = useState<SubGuest[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userInteractedSide, setUserInteractedSide] = useState(false);

  useEffect(() => {
    if (userInteractedSide) return;
    const nameLower = form.name.toLowerCase();
    const hometownLower = form.hometown.toLowerCase();
    const notesLower = form.notes.toLowerCase();
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

    setForm(f => ({ ...f, side: mentionsBride ? 'bride' : 'groom' }));
  }, [form.name, form.hometown, form.notes, userInteractedSide]);

  async function load() {
    const { data } = await supabase
      .from('guests')
      .select(`
        id, name, phone, party_size, hometown, side, notes, sub_guests,
        room_guests(id, keys_given, room:rooms(id, room_no, bed_config, floor, lodge:lodges(id, name)))
      `)
      .eq('id', guestId)
      .single();
    const g = data as unknown as GuestData;
    setGuest(g);
    if (g) {
      setForm({
        name: g.name ?? '',
        phone: g.phone ?? '',
        party_size: g.party_size?.toString() ?? '',
        hometown: g.hometown ?? '',
        side: g.side ?? 'groom',
        notes: g.notes ?? '',
      });
      setUserInteractedSide(true);
      setSubGuests(g.sub_guests ? [...g.sub_guests] : []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [guestId]);

  async function save() {
    if (!guest) return;
    setSaving(true);

    const activeSubGuests = subGuests.filter(s => s.name.trim());
    const calculatedPartySize = form.party_size.trim()
      ? parseInt(form.party_size)
      : (activeSubGuests.length + 1);

    await supabase.from('guests').update({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      party_size: calculatedPartySize,
      hometown: form.hometown.trim() || null,
      side: form.side,
      notes: form.notes.trim() || null,
      sub_guests: activeSubGuests,
    }).eq('id', guest.id);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    load();
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

  const rg = guest?.room_guests?.[0];

  return (
    <div className="screen active">
      <div className="topbar">
        <button className="back-btn" onClick={goBack}>
          <ChevronLeft className="w-[22px] h-[22px]" />
        </button>
        <h1 style={{ flex: 1 }}>Guest Details</h1>
        <button onClick={save} disabled={saving} className="topbar-action">
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="section-header">Info</div>
            <div className="card">
              <div className="detail-field">
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="detail-field">
                <label>Phone</label>
                <div className="phone-row">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                  {form.phone && (
                    <a href={`tel:${form.phone}`} className="call-btn" title="Call guest">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Sub-guests builder in details card */}
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
                  value={form.party_size}
                  onChange={e => setForm(f => ({ ...f, party_size: e.target.value }))}
                />
              </div>
              <div className="detail-field">
                <label>Hometown / From</label>
                <input
                  type="text"
                  value={form.hometown}
                  onChange={e => setForm(f => ({ ...f, hometown: e.target.value }))}
                />
              </div>
              <div className="detail-field">
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
              <div className="detail-field" style={{ border: 'none' }}>
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="section-header">Assigned Room</div>
            <div className="card">
              {!rg?.room ? (
                <p className="p-6 text-sm text-gray-400 text-center">Not assigned to any room</p>
              ) : (
                <div
                  onClick={() => rg.room && navigate({ name: 'room', roomId: rg.room.id })}
                  className="list-row"
                >
                  <div className="row-icon green">
                    <Building2 className="w-5 h-5" style={{ color: 'var(--green)' }} />
                  </div>
                  <div className="row-body">
                    <div className="row-title">
                      Room {rg.room.room_no} — {rg.room.lodge?.name}
                    </div>
                    <div className="row-sub">
                      {rg.room.bed_config} · {rg.room.floor}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      rg.keys_given === 'given' ? 'orange' :
                      rg.keys_given === 'collected' ? 'green' : 'gray'
                    }`}
                  >
                    {rg.keys_given === 'given' ? 'Key given' :
                     rg.keys_given === 'collected' ? 'Collected' : 'No key'}
                  </span>
                </div>
              )}
            </div>

            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                <Save className="w-4 h-4" /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate({ name: 'guests' })}>
                <RefreshCw className="w-4 h-4" /> Reassign to a different room
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
