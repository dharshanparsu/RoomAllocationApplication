import { useEffect, useState } from 'react';
import { Building2, Key, Lock, ChevronRight, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface Lodge {
  id: string;
  name: string;
  rooms: { id: string; room_guests: { id: string }[] }[];
}

export function HomeScreen() {
  const { navigate, switchTab } = useNavigation();
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [keysGiven, setKeysGiven] = useState(0);
  const [keysCollected, setKeysCollected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [lodgesRes, givenRes, collectedRes] = await Promise.all([
        supabase.from('lodges').select('id, name, rooms(id, room_guests(id))'),
        supabase.from('room_guests').select('*', { count: 'exact', head: true }).in('keys_given', ['given', 'collected']),
        supabase.from('room_guests').select('*', { count: 'exact', head: true }).eq('keys_given', 'collected'),
      ]);
      setLodges((lodgesRes.data ?? []) as Lodge[]);
      setKeysGiven(givenRes.count ?? 0);
      setKeysCollected(collectedRes.count ?? 0);
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
          </>
        )}
      </div>
    </div>
  );
}
