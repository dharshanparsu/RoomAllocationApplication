import { useEffect, useState } from 'react';
import { Building2, Key, Lock, ChevronRight, Settings, Wind, Bed } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface RoomGuest {
  id: string;
  keys_given: string;
  ac_remote_given?: string | null;
  extra_bed_status?: string | null;
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
  const [keysGiven, setKeysGiven] = useState(0);
  const [keysCollected, setKeysCollected] = useState(0);
  const [totalAcRooms, setTotalAcRooms] = useState(0);
  const [acGiven, setAcGiven] = useState(0);
  const [acCollected, setAcCollected] = useState(0);
  const [totalExtraBeds, setTotalExtraBeds] = useState(0);
  const [extraBedsProcured, setExtraBedsProcured] = useState(0);
  const [extraBedsReturned, setExtraBedsReturned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const lodgesRes = await supabase.from('lodges').select('id, name, ac_remote_required, rooms(id, extra_bed, room_guests(id, keys_given, ac_remote_given, extra_bed_status))');
      
      const data = (lodgesRes.data ?? []) as Lodge[];
      setLodges(data);

      let given = 0;
      let collected = 0;
      let totalAc = 0;
      let acG = 0;
      let acC = 0;
      let totalBeds = 0;
      let bedsP = 0;
      let bedsR = 0;

      data.forEach(lodge => {
        lodge.rooms?.forEach(room => {
          const rg = room.room_guests?.[0];
          if (rg) {
            if (rg.keys_given === 'given' || rg.keys_given === 'collected') {
              given++;
            }
            if (rg.keys_given === 'collected') {
              collected++;
            }
            if (lodge.ac_remote_required) {
              if (rg.ac_remote_given === 'given' || rg.ac_remote_given === 'collected') {
                acG++;
              }
              if (rg.ac_remote_given === 'collected') {
                acC++;
              }
            }
            if (rg.extra_bed_status === 'procured' || rg.extra_bed_status === 'returned') {
              bedsP++;
            }
            if (rg.extra_bed_status === 'returned') {
              bedsR++;
            }
          }
          if (lodge.ac_remote_required) {
            totalAc++;
          }
          if (room.extra_bed) {
            totalBeds++;
          }
        });
      });

      setKeysGiven(given);
      setKeysCollected(collected);
      setTotalAcRooms(totalAc);
      setAcGiven(acG);
      setAcCollected(acC);
      setTotalExtraBeds(totalBeds);
      setExtraBedsProcured(bedsP);
      setExtraBedsReturned(bedsR);
      setLoading(false);
    }
    load();
  }, []);

  const totalRooms = lodges.reduce((s, l) => s + l.rooms.length, 0);
  const assigned = lodges.reduce((s, l) => s + l.rooms.filter(r => r.room_guests.length > 0).length, 0);
  const vacant = totalRooms - assigned;

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
                <p className="p-6 text-sm text-gray-400 text-center">No lodges yet — add one in the Lodges tab</p>
              )}
              {lodges.map((lodge) => {
                const total = lodge.rooms.length;
                const ass = lodge.rooms.filter(r => r.room_guests.length > 0).length;
                const vac = total - ass;
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
                      <span className={`badge ${vac > 0 ? 'orange' : 'green'}`}>
                        {vac > 0 ? `${vac} vacant` : 'Full'}
                      </span>
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
