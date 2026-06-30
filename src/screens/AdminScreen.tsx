import { useEffect, useState } from 'react';
import { X, ChevronRight, LogOut, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AppUser {
  id: string;
  email: string;
  role: string;
  status: string;
  side: string;
  room_access?: { id: string; room_id: string }[];
}

interface RoomItem {
  id: string;
  room_no: string;
  floor: string | null;
  lodge: { id: string; name: string } | null;
  room_guests: { guest: { side: string | null } | null }[];
}

function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export function AdminScreen() {
  const { profile, isAdmin, signOut } = useAuth();
  const [pending, setPending] = useState<AppUser[]>([]);
  const [approved, setApproved] = useState<AppUser[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  // Edit user modal state
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [editRole, setEditRole] = useState('coordinator');
  const [editSide, setEditSide] = useState('both');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);

  // Search & Filter state for assigning rooms
  const [assignSearch, setAssignSearch] = useState('');
  const [assignLodgeFilter, setAssignLodgeFilter] = useState('All');

  async function load() {
    const [pendingRes, approvedRes, roomsRes] = await Promise.all([
      supabase.from('users').select('id, email, role, status, side').eq('status', 'pending').order('created_at'),
      supabase.from('users').select('id, email, role, status, side, room_access(id, room_id)').eq('status', 'approved').order('email'),
      supabase.from('rooms').select('id, room_no, floor, lodge:lodges(id, name), room_guests(guest:guests(side))').order('room_no'),
    ]);

    setPending((pendingRes.data ?? []) as AppUser[]);
    setApproved((approvedRes.data ?? []) as AppUser[]);
    setRooms((roomsRes.data ?? []) as unknown as RoomItem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approveUser(userId: string) {
    setApproving(userId);
    await supabase.from('users').update({ status: 'approved' }).eq('id', userId);
    await load();
    setApproving(null);
  }

  async function rejectUser(userId: string) {
    await supabase.from('users').delete().eq('id', userId);
    await load();
  }

  const openEditModal = (user: AppUser) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditSide(user.side || 'both');
    setSelectedRooms(user.room_access?.map(ra => ra.room_id) || []);
    setAssignSearch('');
    setAssignLodgeFilter('All');
  };

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRooms(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const selectRoomsBySide = (side: 'bride' | 'groom' | 'all' | 'none') => {
    // Get visible rooms matching current search and lodge filter inside modal
    const visibleRooms = rooms.filter(room => {
      const lodgeName = room.lodge?.name || '';
      const roomNo = room.room_no || '';
      const matchesLodge = assignLodgeFilter === 'All' || lodgeName === assignLodgeFilter;
      const matchesSearch = !assignSearch.trim() || 
        lodgeName.toLowerCase().includes(assignSearch.toLowerCase()) ||
        roomNo.toLowerCase().includes(assignSearch.toLowerCase());
      return matchesLodge && matchesSearch;
    });

    const visibleRoomIds = visibleRooms.map(r => r.id);

    if (side === 'all') {
      setSelectedRooms(prev => Array.from(new Set([...prev, ...visibleRoomIds])));
    } else if (side === 'none') {
      setSelectedRooms(prev => prev.filter(id => !visibleRoomIds.includes(id)));
    } else {
      const matchingIds = visibleRooms
        .filter(r => {
          const guestSide = r.room_guests?.[0]?.guest?.side;
          return guestSide === side;
        })
        .map(r => r.id);

      setSelectedRooms(prev => Array.from(new Set([...prev, ...matchingIds])));
    }
  };

  const saveUserSettings = async () => {
    if (!selectedUser) return;
    setSavingUser(true);

    try {
      // 1. Update user role & side
      await supabase
        .from('users')
        .update({
          role: editRole,
          side: editSide
        })
        .eq('id', selectedUser.id);

      // 2. Manage room access if coordinator
      if (editRole === 'coordinator') {
        // Clear old access
        await supabase.from('room_access').delete().eq('user_id', selectedUser.id);
        
        // Insert new access
        if (selectedRooms.length > 0) {
          const inserts = selectedRooms.map(roomId => ({
            user_id: selectedUser.id,
            room_id: roomId
          }));
          await supabase.from('room_access').insert(inserts);
        }
      } else {
        // Admins automatically have access to all rooms, clear explicit mapping to save space
        await supabase.from('room_access').delete().eq('user_id', selectedUser.id);
      }

      await load();
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="screen active">
      <div className="topbar">
        <h1>Admin</h1>
      </div>

      <div className="scroll">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {!isAdmin && (
              <div className="info-banner">
                Admin-only features are restricted to the wedding admin account.
              </div>
            )}

            {isAdmin && (
              <>
                {/* Pending users */}
                <div className="section-header">Pending Users</div>
                <div className="card">
                  {pending.length === 0 ? (
                    <p className="p-6 text-sm text-gray-400 text-center">No pending requests</p>
                  ) : (
                    pending.map((u) => (
                      <div key={u.id} className="list-row" style={{ cursor: 'default' }}>
                        <div className="user-avatar">
                          {initials(u.email)}
                        </div>
                        <div className="row-body">
                          <div className="row-title">{u.email.split('@')[0]}</div>
                          <div className="row-sub">{u.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => approveUser(u.id)}
                            disabled={approving === u.id}
                            className="btn btn-sm btn-secondary"
                            style={{ width: 'auto' }}
                          >
                            {approving === u.id ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => rejectUser(u.id)}
                            className="btn btn-sm btn-danger"
                            style={{ width: 'auto', padding: '8px' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Active coordinators */}
                <div className="section-header">Active Coordinators</div>
                <div className="card">
                  {approved.map((u) => {
                    const isMe = u.id === profile?.id;
                    const roomCount = (u.room_access?.length ?? 0);
                    return (
                      <div 
                        key={u.id} 
                        className="list-row" 
                        style={isMe ? { cursor: 'default' } : { cursor: 'pointer' }}
                        onClick={isMe ? undefined : () => openEditModal(u)}
                      >
                        <div className="user-avatar" style={isMe ? { background: 'var(--green-bg)', color: 'var(--green)' } : undefined}>
                          {initials(u.email)}
                        </div>
                        <div className="row-body">
                          <div className="row-title">
                            {u.email.split('@')[0]}{isMe ? ' (You)' : ''}
                          </div>
                          <div className="row-sub">
                            {u.email}
                            {u.role !== 'admin' ? ` · ${roomCount} rooms` : ''}
                            {u.side && u.side !== 'both' ? ` · ${u.side === 'bride' ? 'Bride Side' : 'Groom Side'}` : ''}
                          </div>
                        </div>
                        <div className="row-end">
                          <span className={`badge ${u.role === 'admin' ? 'green' : 'blue'}`}>
                            {u.role === 'admin' ? 'Admin' : 'Coordinator'}
                          </span>
                        </div>
                        {!isMe && (
                          <span className="chevron">
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Settings */}
                <div className="section-header">Settings</div>
                <div className="card">
                  {[
                    { label: 'Require key confirmation', sub: 'Coordinators must mark keys given/collected' },
                    { label: 'Allow guest edits', sub: 'Coordinators can edit guest info' },
                    { label: 'Show phone numbers', sub: 'Visible to all coordinators' },
                  ].map((s) => (
                    <div key={s.label} className="toggle-row">
                      <div>
                        <div className="toggle-label">{s.label}</div>
                        <div className="toggle-sub">{s.sub}</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" defaultChecked />
                        <span className="slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ padding: '16px' }}>
              <button
                onClick={signOut}
                className="btn btn-ghost"
                style={{ justifyContent: 'center' }}
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {selectedUser && (
        <div className="modal-overlay open" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-handle" />
            <div className="modal-title">Configure Coordinator</div>

            <div className="scroll" style={{ flex: 1, padding: '0 16px 20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Editing settings for <strong>{selectedUser.email}</strong>
              </p>

              <div className="form-group">
                <label>System Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>Side Assignment</label>
                <select value={editSide} onChange={e => setEditSide(e.target.value)}>
                  <option value="both">Both Sides (Access All)</option>
                  <option value="bride">Bride Side Only</option>
                  <option value="groom">Groom Side Only</option>
                </select>
              </div>

              {editRole === 'coordinator' && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Room Access Control</label>
                  </div>
                  
                  {/* Search and Lodge Filters for Room Access Assignment */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', display: 'block' }}>Search Rooms</label>
                      <input 
                        type="text" 
                        placeholder="Search room no..." 
                        value={assignSearch}
                        onChange={e => setAssignSearch(e.target.value)}
                        style={{
                          fontSize: '13px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          width: '100%',
                          background: 'var(--white)',
                          color: 'var(--text)'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px', display: 'block' }}>Lodge Filter</label>
                      <select
                        value={assignLodgeFilter}
                        onChange={e => setAssignLodgeFilter(e.target.value)}
                        style={{
                          fontSize: '13px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          width: '100%',
                          background: 'var(--white)',
                          color: 'var(--text)',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="All">All Lodges</option>
                        {Array.from(new Set(rooms.map(r => r.lodge?.name).filter(Boolean))).map(lName => (
                          <option key={lName} value={lName}>{lName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Select shortcuts */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => selectRoomsBySide('bride')} 
                      className="btn btn-sm btn-secondary" 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }}
                    >
                      + Bride Rooms
                    </button>
                    <button 
                      onClick={() => selectRoomsBySide('groom')} 
                      className="btn btn-sm btn-secondary" 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }}
                    >
                      + Groom Rooms
                    </button>
                    <button 
                      onClick={() => selectRoomsBySide('all')} 
                      className="btn btn-sm btn-secondary" 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '11px' }}
                    >
                      Select All Visible
                    </button>
                    <button 
                      onClick={() => selectRoomsBySide('none')} 
                      className="btn btn-sm btn-ghost" 
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '11px', color: 'var(--red)' }}
                    >
                      Clear Visible
                    </button>
                  </div>
 
                  <div className="card" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {rooms.filter(room => {
                      const lodgeName = room.lodge?.name || '';
                      const roomNo = room.room_no || '';
                      const matchesLodge = assignLodgeFilter === 'All' || lodgeName === assignLodgeFilter;
                      const matchesSearch = !assignSearch.trim() || 
                        lodgeName.toLowerCase().includes(assignSearch.toLowerCase()) ||
                        roomNo.toLowerCase().includes(assignSearch.toLowerCase());
                      return matchesLodge && matchesSearch;
                    }).map(room => {
                      const isSelected = selectedRooms.includes(room.id);
                      const guestSide = room.room_guests?.[0]?.guest?.side;
                      return (
                        <div 
                          key={room.id}
                          onClick={() => toggleRoomSelection(room.id)}
                          className="list-row"
                          style={{ padding: '10px 12px', cursor: 'pointer' }}
                        >
                          <div className="row-body">
                            <div className="row-title" style={{ fontSize: '13.5px' }}>
                              Room {room.room_no} · <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{room.lodge?.name}</span>
                            </div>
                            <div className="row-sub" style={{ fontSize: '11px' }}>
                              Floor: {room.floor || '—'} 
                              {guestSide && ` · Side: ${guestSide === 'bride' ? 'Bride' : guestSide === 'groom' ? 'Groom' : 'Family'}`}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px', display: 'flex', gap: '10px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              <button 
                onClick={saveUserSettings} 
                disabled={savingUser}
                className="btn btn-primary"
              >
                {savingUser ? 'Saving...' : 'Save Settings'}
              </button>
              <button 
                onClick={() => setSelectedUser(null)} 
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
