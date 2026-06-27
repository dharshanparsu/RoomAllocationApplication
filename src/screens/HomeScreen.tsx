import { useEffect, useState } from 'react';
import { Building2, Key, Lock, ChevronRight, Settings, Wind, Bed } from 'lucide-react';
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
  rooms: { id: string; extra_bed: boolean; room_guests: RoomGuest[] }[];
}

export function HomeScreen() {
  const { navigate, switchTab } = useNavigation();
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [selectedSide, setSelectedSide] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const lodgesRes = await supabase
        .from('lodges')
        .select('id, name, ac_remote_required, rooms(id, extra_bed, room_guests(id, keys_given, ac_remote_given, extra_bed_status, guest:guests(id, name, side)))');
      
      const data = (lodgesRes.data ?? []) as any as Lodge[];
      setLodges(data);
      setLoading(false);
    }
    load();
  }, []);

  // Compute metrics dynamically
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
    lodge.rooms?.forEach(room => {
      const rg = room.room_guests?.[0];
      const guestObj = rg?.guest ? (Array.isArray(rg.guest) ? rg.guest[0] : rg.guest) : null;
      const guestSide = guestObj?.side || 'unassigned';
      const matchesSide = selectedSide === 'All' || guestSide === selectedSide;

      if (selectedSide === 'All') {
        totalRooms++;
        if (rg) {
          assigned++;
          if (rg.keys_given === 'given' || rg.keys_given === 'collected' || rg.keys_given === 'reception') {
            keysGiven++;
          }
          if (rg.keys_given === 'collected') {
            keysCollected++;
          }
          if (lodge.ac_remote_required) {
            if (rg.ac_remote_given === 'given' || rg.ac_remote_given === 'collected' || rg.ac_remote_given === 'reception') {
              acGiven++;
            }
            if (rg.ac_remote_given === 'collected') {
              acCollected++;
            }
          }
          if (rg.extra_bed_status === 'procured' || rg.extra_bed_status === 'returned') {
            extraBedsProcured++;
          }
          if (rg.extra_bed_status === 'returned') {
            extraBedsReturned++;
          }
        } else {
          vacant++;
        }
        if (lodge.ac_remote_required) {
          totalAcRooms++;
        }
        if (room.extra_bed) {
          totalExtraBeds++;
        }
      } else {
        // If filtering by side, we only count rooms that are occupied by this side
        if (rg && matchesSide) {
          totalRooms++;
          assigned++;
          if (rg.keys_given === 'given' || rg.keys_given === 'collected' || rg.keys_given === 'reception') {
            keysGiven++;
          }
          if (rg.keys_given === 'collected') {
            keysCollected++;
          }
          if (lodge.ac_remote_required) {
            totalAcRooms++;
            if (rg.ac_remote_given === 'given' || rg.ac_remote_given === 'collected' || rg.ac_remote_given === 'reception') {
              acGiven++;
            }
            if (rg.ac_remote_given === 'collected') {
              acCollected++;
            }
          }
          if (room.extra_bed) {
            totalExtraBeds++;
            if (rg.extra_bed_status === 'procured' || rg.extra_bed_status === 'returned') {
              extraBedsProcured++;
            }
            if (rg.extra_bed_status === 'returned') {
              extraBedsReturned++;
            }
          }
        }
      }
    });
  });

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
            {/* Side filter */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Side:</span>
              <select
                value={selectedSide}
                onChange={e => setSelectedSide(e.target.value)}
                style={{ width: 'auto', flex: 1, padding: '6px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}
              >
                <option value="All">All Sides</option>
                <option value="bride">Bride's side</option>
                <option value="groom">Groom's side</option>
                <option value="both">Both / Family</option>
              </select>
            </div>

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-num">{totalRooms}</div>
                <div className="stat-label">Total Rooms</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{assigned}</div>
                <div className="stat-label">Assigned</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{vacant}</div>
                <div className="stat-label">Vacant</div>
              </div>
            </div>

            <div className="section-header">Lodges</div>
            <div className="card">
              {lodges.length === 0 && (
                <p className="p-6 text-sm text-gray-400 text-center">No lodges yet — add one in the Configuration tab</p>
              )}
              {lodges.map((lodge) => {
                let total = 0;
                let ass = 0;
                let vac = 0;

                lodge.rooms?.forEach(room => {
                  const rg = room.room_guests?.[0];
                  const guestObj = rg?.guest ? (Array.isArray(rg.guest) ? rg.guest[0] : rg.guest) : null;
                  const guestSide = guestObj?.side || 'unassigned';
                  const matchesSide = selectedSide === 'All' || guestSide === selectedSide;

                  if (selectedSide === 'All') {
                    total++;
                    if (rg) ass++;
                    else vac++;
                  } else {
                    if (rg && matchesSide) {
                      total++;
                      ass++;
                    }
                  }
                });

                if (selectedSide !== 'All' && total === 0) return null;

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
                        {total} rooms · {ass} assigned
                      </div>
                    </div>
                    <div className="row-end" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      {selectedSide === 'All' ? (
                        <span className={`badge ${vac > 0 ? 'orange' : 'green'}`}>
                          {vac > 0 ? `${vac} vacant` : 'Full'}
                        </span>
                      ) : (
                        <span className="badge green">
                          {ass} assigned
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

            <div className="section-header">Key Status</div>
            <div className="card">
              <div className="list-row" style={{ cursor: 'default' }}>
                <div className="row-icon green">
                  <Key className="w-5 h-5" />
                </div>
                <div className="row-body">
                  <div className="row-title">Keys Given Out</div>
                  <div className="row-sub">
                    {keysGiven} of {totalRooms} rooms
                  </div>
                </div>
                <span className="badge green">
                  {totalRooms > 0 ? Math.round((keysGiven / totalRooms) * 100) : 0}%
                </span>
              </div>
              <div className="list-row" style={{ cursor: 'default' }}>
                <div className="row-icon blue">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="row-body">
                  <div className="row-title">Keys Collected Back</div>
                  <div className="row-sub">
                    {keysCollected} of {keysGiven} given
                  </div>
                </div>
                <span className="badge blue">
                  {keysGiven > 0 ? Math.round((keysCollected / keysGiven) * 100) : 0}%
                </span>
              </div>
            </div>

            {totalAcRooms > 0 && (
              <>
                <div className="section-header">AC Remote Status</div>
                <div className="card">
                  <div className="list-row" style={{ cursor: 'default' }}>
                    <div className="row-icon orange">
                      <Wind className="w-5 h-5" style={{ color: 'var(--orange)' }} />
                    </div>
                    <div className="row-body">
                      <div className="row-title">Remotes Handed Out</div>
                      <div className="row-sub">
                        {acGiven} of {totalAcRooms} rooms
                      </div>
                    </div>
                    <span className="badge orange">
                      {totalAcRooms > 0 ? Math.round((acGiven / totalAcRooms) * 100) : 0}%
                    </span>
                  </div>
                  <div className="list-row" style={{ cursor: 'default' }}>
                    <div className="row-icon green">
                      <Lock className="w-5 h-5" style={{ color: 'var(--green)' }} />
                    </div>
                    <div className="row-body">
                      <div className="row-title">Remotes Collected Back</div>
                      <div className="row-sub">
                        {acCollected} of {acGiven} given
                      </div>
                    </div>
                    <span className="badge green">
                      {acGiven > 0 ? Math.round((acCollected / acGiven) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </>
            )}

            {totalExtraBeds > 0 && (
              <>
                <div className="section-header">Extra Bed Status</div>
                <div className="card">
                  <div className="list-row" style={{ cursor: 'default' }}>
                    <div className="row-icon orange">
                      <Bed className="w-5 h-5" style={{ color: 'var(--orange)' }} />
                    </div>
                    <div className="row-body">
                      <div className="row-title">Extra Beds Procured</div>
                      <div className="row-sub">
                        {extraBedsProcured} of {totalExtraBeds} eligible rooms
                      </div>
                    </div>
                    <span className="badge orange">
                      {totalExtraBeds > 0 ? Math.round((extraBedsProcured / totalExtraBeds) * 100) : 0}%
                    </span>
                  </div>
                  <div className="list-row" style={{ cursor: 'default' }}>
                    <div className="row-icon green">
                      <Lock className="w-5 h-5" style={{ color: 'var(--green)' }} />
                    </div>
                    <div className="row-body">
                      <div className="row-title">Extra Beds Returned</div>
                      <div className="row-sub">
                        {extraBedsReturned} of {extraBedsProcured} procured
                      </div>
                    </div>
                    <span className="badge green">
                      {extraBedsProcured > 0 ? Math.round((extraBedsReturned / extraBedsProcured) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
