import { useEffect, useState } from 'react';
import { X, ChevronRight, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AppUser {
  id: string;
  email: string;
  role: string;
  status: string;
  room_access?: { id: string }[];
}

function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export function AdminScreen() {
  const { profile, isAdmin, signOut } = useAuth();
  const [pending, setPending] = useState<AppUser[]>([]);
  const [approved, setApproved] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  async function load() {
    const [pendingRes, approvedRes] = await Promise.all([
      supabase.from('users').select('id, email, role, status').eq('status', 'pending').order('created_at'),
      supabase.from('users').select('id, email, role, status, room_access(id)').eq('status', 'approved').order('email'),
    ]);
    setPending((pendingRes.data ?? []) as AppUser[]);
    setApproved((approvedRes.data ?? []) as AppUser[]);
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
                      <div key={u.id} className="list-row" style={u.role !== 'admin' ? undefined : { cursor: 'default' }}>
                        <div className="user-avatar" style={isMe ? { background: 'var(--green-bg)', color: 'var(--green)' } : undefined}>
                          {initials(u.email)}
                        </div>
                        <div className="row-body">
                          <div className="row-title">
                            {u.email.split('@')[0]}{isMe ? ' (You)' : ''}
                          </div>
                          <div className="row-sub">{u.email}{u.role !== 'admin' ? ` · ${roomCount} rooms` : ''}</div>
                        </div>
                        <div className="row-end">
                          <span className={`badge ${u.role === 'admin' ? 'green' : 'blue'}`}>
                            {u.role === 'admin' ? 'Admin' : 'Coordinator'}
                          </span>
                        </div>
                        {u.role !== 'admin' && (
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
    </div>
  );
}
