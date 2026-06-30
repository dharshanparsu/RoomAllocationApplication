import { useEffect, useState } from 'react';
import { Building2, Key, Lock, ChevronRight, Settings, Wind, Bed, X, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface RoomGuest {
  id: string;
  keys_given: string;
  ac_remote_given?: string | null;
  extra_bed_status?: string | null;
  guest?: any;
}

interface Lodge {
  id: string;
  name: string;
  ac_remote_required?: boolean;
  rooms: { id: string; room_no: string; extra_bed: boolean; category: string | null; room_guests: RoomGuest[] }[];
}

export function HomeScreen() {
  const { switchTab } = useNavigation();
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedSide, setSelectedSide] = useState('All');
  const [selectedLodge, setSelectedLodge] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Drill Down State
  const [activeDrillDown, setActiveDrillDown] = useState<'keys' | 'ac' | 'beds' | null>(null);

  useEffect(() => {
    async function load() {
      const lodgesRes = await supabase
        .from('lodges')
        .select('id, name, ac_remote_required, rooms(id, room_no, extra_bed, category, room_guests(id, keys_given, ac_remote_given, extra_bed_status, guest:guests(id, name, side)))');
      
      const data = (lodgesRes.data ?? []) as any as Lodge[];
      setLodges(data);
      setLoading(false);
    }
    load();
  }, []);

  // Compute metrics dynamically based on filters
  let totalRooms = 0;
  let assigned = 0;
  let vacant = 0;
  let keysGiven = 0;
  let keysCollected = 0;
  let totalAcRooms = 0;
  let acGiven = 0;
  let acCollected = 0;
  let totalExtraBeds = 0;
  let extraBedsProcured = 0;
  let extraBedsReturned = 0;

  lodges.forEach(lodge => {
    const matchesLodge = selectedLodge === 'All' || lodge.id === selectedLodge;

    lodge.rooms?.forEach(room => {
      const matchesCategory = selectedCategory === 'All' || room.category === selectedCategory;

      const rg = room.room_guests?.[0];
      const guestObj = rg?.guest ? (Array.isArray(rg.guest) ? rg.guest[0] : rg.guest) : null;
      const guestSide = guestObj?.side || 'unassigned';
      const matchesSide = selectedSide === 'All' || guestSide === selectedSide;

      if (matchesLodge && matchesCategory) {
        if (selectedSide === 'All' || (rg && matchesSide)) {
          totalRooms++;
          if (rg) {
            assigned++;
            
            // Keys given out: 'given', 'collected', or 'reception'
            if (rg.keys_given === 'given' || rg.keys_given === 'collected' || rg.keys_given === 'reception') {
              keysGiven++;
            }
            // Keys collected: 'collected' or 'reception' (considered collected)
            if (rg.keys_given === 'collected' || rg.keys_given === 'reception') {
              keysCollected++;
            }

            // AC Remote
            if (lodge.ac_remote_required) {
              if (rg.ac_remote_given === 'given' || rg.ac_remote_given === 'collected' || rg.ac_remote_given === 'reception') {
                acGiven++;
              }
              if (rg.ac_remote_given === 'collected' || rg.ac_remote_given === 'reception') {
                acCollected++;
              }
            }

            // Extra Bed
            if (room.extra_bed) {
              if (rg.extra_bed_status === 'procured' || rg.extra_bed_status === 'returned') {
                extraBedsProcured++;
              }
              if (rg.extra_bed_status === 'returned') {
                extraBedsReturned++;
              }
            }
          } else {
            if (selectedSide === 'All') {
              vacant++;
            }
          }

          if (lodge.ac_remote_required) {
            totalAcRooms++;
          }
          if (room.extra_bed) {
            totalExtraBeds++;
          }
        }
      }
    });
  });

  const viewLodgeAllocations = (lodgeId: string, metric?: 'keys' | 'ac' | 'beds', status?: string) => {
    sessionStorage.setItem('filter_lodge', lodgeId);
    sessionStorage.setItem('filter_side', selectedSide);
    
    // Clear any previous statuses
    sessionStorage.removeItem('filter_key_status');
    sessionStorage.removeItem('filter_ac_status');
    sessionStorage.removeItem('filter_bed_status');

    if (metric === 'keys' && status) {
      sessionStorage.setItem('filter_key_status', status);
    } else if (metric === 'ac' && status) {
      sessionStorage.setItem('filter_ac_status', status);
    } else if (metric === 'beds' && status) {
      sessionStorage.setItem('filter_bed_status', status);
    }

    setActiveDrillDown(null);
    switchTab('home'); // Switches to AllocationsScreen (Home Tab)
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <div style={{ flex: 1 }}>
          <h1>
            Room Allocation
            <span className="subtitle">Dharshan &amp; Amulya · 05 Jul 2026</span>
          </h1>
        </div>
        <button className="topbar-settings" onClick={() => switchTab('admin')}>
          <Settings className="w-[22px] h-[22px]" />
        </button>
      </div>

      <div className="scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Filters Section */}
            <div style={{ padding: '14px 16px', background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filters</span>
                {(selectedSide !== 'All' || selectedLodge !== 'All' || selectedCategory !== 'All') && (
                  <button
                    onClick={() => {
                      setSelectedSide('All');
                      setSelectedLodge('All');
                      setSelectedCategory('All');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Side</label>
                  <select
                    value={selectedSide}
                    onChange={e => setSelectedSide(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  >
                    <option value="All">All Sides</option>
                    <option value="bride">Bride Side</option>
                    <option value="groom">Groom Side</option>
                    <option value="both">Both / Family</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lodge</label>
                  <select
                    value={selectedLodge}
                    onChange={e => setSelectedLodge(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  >
                    <option value="All">All Lodges</option>
                    {lodges.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Group / Cat</label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  >
                    <option value="All">All Groups</option>
                    <option value="TRT">TRT (Tirupati)</option>
                    <option value="MPT">MPT (Mandapam)</option>
                    <option value="BLR">BLR (Bangalore)</option>
                  </select>
                </div>
              </div>

              {/* Applied Filters Row */}
              {(selectedSide !== 'All' || selectedLodge !== 'All' || selectedCategory !== 'All') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', background: 'var(--blue-bg)', padding: '6px 10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 600 }}>
                    Active Filters: {[
                      selectedSide !== 'All' && `Side: ${selectedSide === 'bride' ? 'Bride' : selectedSide === 'groom' ? 'Groom' : 'Family'}`,
                      selectedLodge !== 'All' && `Lodge: ${lodges.find(l => l.id === selectedLodge)?.name || ''}`,
                      selectedCategory !== 'All' && `Group: ${selectedCategory}`
                    ].filter(Boolean).join(' · ')}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedSide('All');
                      setSelectedLodge('All');
                      setSelectedCategory('All');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="stats-row" style={{ paddingBottom: 0 }}>
              <div className="stat-card">
                <div className="stat-num">{totalRooms}</div>
                <div className="stat-label">Total Rooms</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{assigned}</div>
                <div className="stat-label">Assigned</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{selectedSide === 'All' ? vacant : '—'}</div>
                <div className="stat-label">Vacant</div>
              </div>
            </div>

            {/* Keys Distribution Status */}
            <div className="section-header">Keys Distribution Status</div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {/* Not Given */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Key className="w-3.5 h-3.5 text-gray-400" style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Not Given</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>
                      {totalRooms - keysGiven} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalRooms}</span>
                    </span>
                    <button 
                      onClick={() => viewLodgeAllocations(selectedLodge, 'keys', 'not_given')}
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                      title="Filter Not Given"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                    <div className="progress-bar-fill orange" style={{ width: `${totalRooms > 0 ? ((totalRooms - keysGiven) / totalRooms) * 100 : 0}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                    {totalRooms > 0 ? Math.round(((totalRooms - keysGiven) / totalRooms) * 100) : 0}% Unhanded
                  </div>
                </div>

                {/* Handed Out */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Key className="w-3.5 h-3.5 text-green-600" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Handed Out</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>
                      {keysGiven} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalRooms}</span>
                    </span>
                    <button 
                      onClick={() => viewLodgeAllocations(selectedLodge, 'keys', 'given')}
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                      title="Filter Handed Out"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                    <div className="progress-bar-fill green" style={{ width: `${totalRooms > 0 ? (keysGiven / totalRooms) * 100 : 0}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                    {totalRooms > 0 ? Math.round((keysGiven / totalRooms) * 100) : 0}% Handed
                  </div>
                </div>

                {/* Collected */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Collected</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>
                      {keysCollected} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {keysGiven || 1}</span>
                    </span>
                    <button 
                      onClick={() => viewLodgeAllocations(selectedLodge, 'keys', 'collected')}
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                      title="Filter Collected"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                    <div className="progress-bar-fill blue" style={{ width: `${keysGiven > 0 ? (keysCollected / keysGiven) * 100 : 0}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                    {keysGiven > 0 ? Math.round((keysCollected / keysGiven) * 100) : 0}% Collected
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Note: Keys given to Reception are counted as Collected.</span>
                <span onClick={() => setActiveDrillDown('keys')} style={{ color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }}>View Lodge Breakdowns &gt;</span>
              </div>
            </div>

            {/* AC Remote Status */}
            {totalAcRooms > 0 && (
              <>
                <div className="section-header">AC Remote Status</div>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {/* Not Given */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Wind className="w-3.5 h-3.5 text-gray-400" style={{ opacity: 0.6 }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Not Given</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {totalAcRooms - acGiven} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalAcRooms}</span>
                        </span>
                        <button 
                          onClick={() => viewLodgeAllocations(selectedLodge, 'ac', 'not_given')}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                          title="Filter Not Given"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                        <div className="progress-bar-fill orange" style={{ width: `${totalAcRooms > 0 ? ((totalAcRooms - acGiven) / totalAcRooms) * 100 : 0}%` }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                        {totalAcRooms > 0 ? Math.round(((totalAcRooms - acGiven) / totalAcRooms) * 100) : 0}% Unhanded
                      </div>
                    </div>

                    {/* Handed Out */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Wind className="w-3.5 h-3.5 text-orange-600" />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Handed Out</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {acGiven} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalAcRooms}</span>
                        </span>
                        <button 
                          onClick={() => viewLodgeAllocations(selectedLodge, 'ac', 'given')}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                          title="Filter Handed Out"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                        <div className="progress-bar-fill orange" style={{ width: `${totalAcRooms > 0 ? (acGiven / totalAcRooms) * 100 : 0}%` }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                        {totalAcRooms > 0 ? Math.round((acGiven / totalAcRooms) * 100) : 0}% Handed
                      </div>
                    </div>

                    {/* Collected */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Lock className="w-3.5 h-3.5 text-green-600" />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Collected</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {acCollected} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {acGiven || 1}</span>
                        </span>
                        <button 
                          onClick={() => viewLodgeAllocations(selectedLodge, 'ac', 'collected')}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                          title="Filter Collected"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                        <div className="progress-bar-fill green" style={{ width: `${acGiven > 0 ? (acCollected / acGiven) * 100 : 0}%` }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                        {acGiven > 0 ? Math.round((acCollected / acGiven) * 100) : 0}% Collected
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span onClick={() => setActiveDrillDown('ac')} style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }}>View Breakdowns &gt;</span>
                  </div>
                </div>
              </>
            )}

            {/* Extra Bed Status */}
            {totalExtraBeds > 0 && (
              <>
                <div className="section-header">Extra Bed Status</div>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {/* Not Procured */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Bed className="w-3.5 h-3.5 text-gray-400" style={{ opacity: 0.6 }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Not Procured</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {totalExtraBeds - extraBedsProcured} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalExtraBeds}</span>
                        </span>
                        <button 
                          onClick={() => viewLodgeAllocations(selectedLodge, 'beds', 'not_required')}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                          title="Filter Not Procured"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                        <div className="progress-bar-fill orange" style={{ width: `${totalExtraBeds > 0 ? ((totalExtraBeds - extraBedsProcured) / totalExtraBeds) * 100 : 0}%` }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                        {totalExtraBeds > 0 ? Math.round(((totalExtraBeds - extraBedsProcured) / totalExtraBeds) * 100) : 0}% Unprocured
                      </div>
                    </div>

                    {/* Procured */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Bed className="w-3.5 h-3.5 text-orange-600" />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Beds Procured</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {extraBedsProcured} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalExtraBeds}</span>
                        </span>
                        <button 
                          onClick={() => viewLodgeAllocations(selectedLodge, 'beds', 'procured')}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                          title="Filter Procured"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                        <div className="progress-bar-fill orange" style={{ width: `${totalExtraBeds > 0 ? (extraBedsProcured / totalExtraBeds) * 100 : 0}%` }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                        {totalExtraBeds > 0 ? Math.round((extraBedsProcured / totalExtraBeds) * 100) : 0}% Procured
                      </div>
                    </div>

                    {/* Returned */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <Lock className="w-3.5 h-3.5 text-green-600" />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Beds Returned</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {extraBedsReturned} <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {extraBedsProcured || 1}</span>
                        </span>
                        <button 
                          onClick={() => viewLodgeAllocations(selectedLodge, 'beds', 'returned')}
                          style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                          title="Filter Returned"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: '5px', marginTop: '6px' }}>
                        <div className="progress-bar-fill green" style={{ width: `${extraBedsProcured > 0 ? (extraBedsReturned / extraBedsProcured) * 100 : 0}%` }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
                        {extraBedsProcured > 0 ? Math.round((extraBedsReturned / extraBedsProcured) * 100) : 0}% Returned
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span onClick={() => setActiveDrillDown('beds')} style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer' }}>View Breakdowns &gt;</span>
                  </div>
                </div>
              </>
            )}

            {/* Lodges List */}
            <div className="section-header">Lodges Summary</div>
            <div className="card" style={{ marginBottom: '24px' }}>
              {lodges.length === 0 && (
                <p className="p-6 text-sm text-gray-400 text-center">No lodges found.</p>
              )}
              {lodges.map((lodge) => {
                const matchesLodge = selectedLodge === 'All' || lodge.id === selectedLodge;
                if (!matchesLodge) return null;

                let lodgeTotal = 0;
                let lodgeAssigned = 0;
                let lodgeVacant = 0;

                lodge.rooms?.forEach(room => {
                  const matchesCategory = selectedCategory === 'All' || room.category === selectedCategory;
                  const rg = room.room_guests?.[0];
                  const guestObj = rg?.guest ? (Array.isArray(rg.guest) ? rg.guest[0] : rg.guest) : null;
                  const guestSide = guestObj?.side || 'unassigned';
                  const matchesSide = selectedSide === 'All' || guestSide === selectedSide;

                  if (matchesCategory) {
                    if (selectedSide === 'All' || (rg && matchesSide)) {
                      lodgeTotal++;
                      if (rg) lodgeAssigned++;
                      else lodgeVacant++;
                    }
                  }
                });

                if (lodgeTotal === 0) return null;

                return (
                  <div
                    key={lodge.id}
                    onClick={() => viewLodgeAllocations(lodge.id)}
                    className="list-row"
                  >
                    <div className="row-icon blue">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="row-body">
                      <div className="row-title">{lodge.name}</div>
                      <div className="row-sub">
                        {lodgeTotal} rooms · {lodgeAssigned} assigned
                      </div>
                    </div>
                    <div className="row-end" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      {selectedSide === 'All' ? (
                        <span className={`badge ${lodgeVacant > 0 ? 'orange' : 'green'}`}>
                          {lodgeVacant > 0 ? `${lodgeVacant} vacant` : 'Full'}
                        </span>
                      ) : (
                        <span className="badge green">
                          {lodgeAssigned} assigned
                        </span>
                      )}
                      <span className="chevron">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Drill Down Modals */}
      {activeDrillDown && (
        <div className="modal-overlay open" onClick={() => setActiveDrillDown(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 12px', borderBottom: '1px solid var(--border)' }}>
              <div className="modal-title" style={{ margin: 0 }}>
                {activeDrillDown === 'keys' && 'Keys Handover Status by Lodge'}
                {activeDrillDown === 'ac' && 'AC Remote Status by Lodge'}
                {activeDrillDown === 'beds' && 'Extra Bed Status by Lodge'}
              </div>
              <button 
                onClick={() => setActiveDrillDown(null)} 
                style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="scroll" style={{ flex: 1, padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {lodges.map(lodge => {
                  let lTotal = 0;
                  let lAssigned = 0;
                  let lMetricGiven = 0;
                  let lMetricCollected = 0;

                  lodge.rooms?.forEach(room => {
                    const matchesCategory = selectedCategory === 'All' || room.category === selectedCategory;
                    const rg = room.room_guests?.[0];
                    const guestObj = rg?.guest ? (Array.isArray(rg.guest) ? rg.guest[0] : rg.guest) : null;
                    const guestSide = guestObj?.side || 'unassigned';
                    const matchesSide = selectedSide === 'All' || guestSide === selectedSide;

                    if (matchesCategory) {
                      if (selectedSide === 'All' || (rg && matchesSide)) {
                        if (activeDrillDown === 'keys') {
                          lTotal++;
                          if (rg) {
                            lAssigned++;
                            if (rg.keys_given === 'given' || rg.keys_given === 'collected' || rg.keys_given === 'reception') {
                              lMetricGiven++;
                            }
                            if (rg.keys_given === 'collected' || rg.keys_given === 'reception') {
                              lMetricCollected++;
                            }
                          }
                        } else if (activeDrillDown === 'ac') {
                          if (lodge.ac_remote_required) {
                            lTotal++;
                            if (rg) {
                              lAssigned++;
                              if (rg.ac_remote_given === 'given' || rg.ac_remote_given === 'collected' || rg.ac_remote_given === 'reception') {
                                lMetricGiven++;
                              }
                              if (rg.ac_remote_given === 'collected' || rg.ac_remote_given === 'reception') {
                                lMetricCollected++;
                              }
                            }
                          }
                        } else if (activeDrillDown === 'beds') {
                          if (room.extra_bed) {
                            lTotal++;
                            if (rg) {
                              lAssigned++;
                              if (rg.extra_bed_status === 'procured' || rg.extra_bed_status === 'returned') {
                                lMetricGiven++; // Procured
                              }
                              if (rg.extra_bed_status === 'returned') {
                                lMetricCollected++; // Returned
                              }
                            }
                          }
                        }
                      }
                    }
                  });

                  if (lTotal === 0) return null;

                  const givenPercent = lTotal > 0 ? Math.round((lMetricGiven / lTotal) * 100) : 0;
                  const collectedPercent = lMetricGiven > 0 ? Math.round((lMetricCollected / lMetricGiven) * 100) : 0;
                  const notGivenPercent = lTotal > 0 ? Math.round(((lTotal - lMetricGiven) / lTotal) * 100) : 0;

                  return (
                    <div 
                      key={lodge.id}
                      className="card"
                      style={{ margin: 0, padding: '14px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{lodge.name}</span>
                        <span 
                          onClick={() => viewLodgeAllocations(lodge.id)}
                          style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                          View Rooms <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {/* Not Given */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Not Given
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>
                              {lTotal - lMetricGiven} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {lTotal}</span>
                            </span>
                            <button
                              onClick={() => viewLodgeAllocations(lodge.id, activeDrillDown, activeDrillDown === 'beds' ? 'not_required' : 'not_given')}
                              style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                              title="Filter Not Given"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="progress-bar-wrap" style={{ height: '4px', marginTop: '6px' }}>
                            <div 
                              className="progress-bar-fill orange" 
                              style={{ width: `${notGivenPercent}%` }} 
                            />
                          </div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                            {notGivenPercent}%
                          </span>
                        </div>

                        {/* Given */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {activeDrillDown === 'keys' && 'Keys Given'}
                            {activeDrillDown === 'ac' && 'Remotes Given'}
                            {activeDrillDown === 'beds' && 'Beds Procured'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>
                              {lMetricGiven} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {lTotal}</span>
                            </span>
                            <button
                              onClick={() => viewLodgeAllocations(lodge.id, activeDrillDown, activeDrillDown === 'beds' ? 'procured' : 'given')}
                              style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                              title="Filter Given"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="progress-bar-wrap" style={{ height: '4px', marginTop: '6px' }}>
                            <div 
                              className={`progress-bar-fill ${activeDrillDown === 'keys' ? 'green' : 'orange'}`} 
                              style={{ width: `${givenPercent}%` }} 
                            />
                          </div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                            {givenPercent}%
                          </span>
                        </div>

                        {/* Collected */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {activeDrillDown === 'keys' && 'Collected'}
                            {activeDrillDown === 'ac' && 'Collected'}
                            {activeDrillDown === 'beds' && 'Returned'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>
                              {lMetricCollected} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400 }}>/ {lMetricGiven || 1}</span>
                            </span>
                            <button
                              onClick={() => viewLodgeAllocations(lodge.id, activeDrillDown, activeDrillDown === 'beds' ? 'returned' : 'collected')}
                              style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', color: 'var(--blue)' }}
                              title="Filter Collected"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="progress-bar-wrap" style={{ height: '4px', marginTop: '6px' }}>
                            <div 
                              className={`progress-bar-fill ${activeDrillDown === 'keys' ? 'blue' : 'green'}`} 
                              style={{ width: `${collectedPercent}%` }} 
                            />
                          </div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                            {collectedPercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
