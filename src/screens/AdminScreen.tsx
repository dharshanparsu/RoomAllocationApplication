import { useEffect, useState } from 'react';
import { X, ChevronRight, LogOut, Check, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
// @ts-ignore
import XLSX from 'xlsx-js-style';

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
  const [exporting, setExporting] = useState(false);

  const exportToExcel = async (options: { consolidated?: boolean; sideFilter?: 'bride' | 'groom'; hideNamesAndPhone?: boolean } = {}) => {
    setExporting(true);
    try {
      const { consolidated, sideFilter, hideNamesAndPhone } = options;

      // 1. Fetch lodges
      const { data: lodgesData, error: lodgesErr } = await supabase
        .from('lodges')
        .select('id, name')
        .order('name');
      
      if (lodgesErr) throw lodgesErr;
      if (!lodgesData || lodgesData.length === 0) {
        alert('No lodges found to export.');
        return;
      }

      // 2. Fetch rooms with guest and key/AC remote details
      const { data: roomsData, error: roomsErr } = await supabase
        .from('rooms')
        .select(`
          id,
          room_no,
          lodge_id,
          room_guests (
            keys_given,
            ac_remote_given,
            guest:guests (
              name,
              phone,
              hometown,
              side
            )
          )
        `);

      if (roomsErr) throw roomsErr;

      // Helper function to extract numerical room numbers for sorting
      const getNumericValue = (roomNo: string) => {
        const match = roomNo.match(/\d+/);
        return match ? parseInt(match[0], 10) : Infinity;
      };

      // 3. Generate workbook
      const wb = XLSX.utils.book_new();

      // Helper to capitalize side
      const formatSide = (side: string | null | undefined) => {
        if (!side) return '—';
        return side.charAt(0).toUpperCase() + side.slice(1);
      };

      if (consolidated) {
        // Consolidated single-tab report
        const consolidatedRows: any[] = [];
        const merges: any[] = [];
        let sNo = 1; // Continuous across all lodges
        
        lodgesData.forEach(lodge => {
          const lodgeRooms = (roomsData || [])
            .filter((r: any) => r.lodge_id === lodge.id)
            .sort((a: any, b: any) => {
              const numA = getNumericValue(a.room_no);
              const numB = getNumericValue(b.room_no);
              if (numA !== numB) return numA - numB;
              return a.room_no.localeCompare(b.room_no, undefined, { numeric: true, sensitivity: 'base' });
            });

          // Keep rooms that are vacant OR have matching guests
          const matchingRooms = lodgeRooms.filter((room: any) => {
            const roomGuests = room.room_guests || [];
            if (roomGuests.length === 0) return true;
            if (!sideFilter) return true;
            return roomGuests.some((rg: any) => rg.guest?.side === sideFilter || rg.guest?.side === 'both');
          });

          if (matchingRooms.length > 0) {
            // Record header index for merging (row index in worksheet is consolidatedRows.length + 1)
            const headerRowIdx = consolidatedRows.length + 1; // +1 offset for worksheet rows
            merges.push({
              s: { r: headerRowIdx, c: 0 },
              e: { r: headerRowIdx, c: 9 } // merges across S.No. (0) to AC remote collected (9)
            });

            // Add Lodge Divider Subheader Row
            consolidatedRows.push({
              'S.No.': lodge.name.toUpperCase(),
              'Room Number': '',
              'Guest Name': '',
              'Phone Number': '',
              'Place': '',
              'Side': '',
              'Keys Given': '',
              'Keys Collected': '',
              'AC Remote Given': '',
              'AC Remote Collected': ''
            });

            matchingRooms.forEach((room: any) => {
              const roomGuests = room.room_guests || [];
              if (roomGuests.length === 0) {
                consolidatedRows.push({
                  'S.No.': sNo++,
                  'Room Number': room.room_no,
                  'Guest Name': hideNamesAndPhone ? '' : '—',
                  'Phone Number': hideNamesAndPhone ? '' : '—',
                  'Place': '—',
                  'Side': '—',
                  'Keys Given': '',
                  'Keys Collected': '',
                  'AC Remote Given': '',
                  'AC Remote Collected': ''
                });
              } else {
                const matchingGuests = !sideFilter
                  ? roomGuests
                  : roomGuests.filter((rg: any) => rg.guest?.side === sideFilter || rg.guest?.side === 'both');

                matchingGuests.forEach((rg: any) => {
                  const guestInfo = rg.guest;
                  const showDetails = !hideNamesAndPhone;
                  
                  consolidatedRows.push({
                    'S.No.': sNo++,
                    'Room Number': room.room_no,
                    'Guest Name': showDetails ? (guestInfo?.name || '') : '',
                    'Phone Number': showDetails ? (guestInfo?.phone || '') : '',
                    'Place': guestInfo?.hometown || '—',
                    'Side': formatSide(guestInfo?.side),
                    'Keys Given': '',
                    'Keys Collected': '',
                    'AC Remote Given': '',
                    'AC Remote Collected': ''
                  });
                });
              }
            });

            // Empty row for visual spacing
            consolidatedRows.push({
              'S.No.': '',
              'Room Number': '',
              'Guest Name': '',
              'Phone Number': '',
              'Place': '',
              'Side': '',
              'Keys Given': '',
              'Keys Collected': '',
              'AC Remote Given': '',
              'AC Remote Collected': ''
            });
          }
        });

        if (consolidatedRows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(consolidatedRows);
          ws['!merges'] = merges;
          
          // Apply custom print styles to consolidated sheet
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const isLodgeHeader = merges.some(m => m.s.r === R);
            const isBlankRow = R > 0 && String(ws[XLSX.utils.encode_cell({ c: 1, r: R })]?.v || '') === '' && String(ws[XLSX.utils.encode_cell({ c: 0, r: R })]?.v || '') === '';

            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cell_address = { c: C, r: R };
              const cell_ref = XLSX.utils.encode_cell(cell_address);
              if (!ws[cell_ref]) continue;

              ws[cell_ref].s = {
                font: { name: 'Arial', size: 10 },
                border: {
                  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                },
                alignment: { vertical: 'center', horizontal: 'left' }
              };

              if (R === 0) {
                // Main Header
                ws[cell_ref].s.fill = { fgColor: { rgb: '1E3A8A' } };
                ws[cell_ref].s.font = { name: 'Arial', size: 10, bold: true, color: { rgb: 'FFFFFF' } };
                ws[cell_ref].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
              } else if (isLodgeHeader) {
                // Lodge Subheader: Bold, 16pt, Center Aligned, Light Blue Fill
                ws[cell_ref].s.fill = { fgColor: { rgb: 'DBEAFE' } }; 
                ws[cell_ref].s.font = { name: 'Arial', size: 16, bold: true, color: { rgb: '1E40AF' } };
                ws[cell_ref].s.alignment = { horizontal: 'center', vertical: 'center' };
              } else if (isBlankRow) {
                ws[cell_ref].s.border = {}; // Strip borders for separator rows
              } else {
                // S.No. styling: bold, light gray fill, centered
                if (C === 0) {
                  ws[cell_ref].s.font.bold = true;
                  ws[cell_ref].s.alignment.horizontal = 'center';
                  ws[cell_ref].s.fill = { fgColor: { rgb: 'F3F4F6' } };
                }
                // Room Number styling: bold, light gray fill, centered
                if (C === 1) {
                  ws[cell_ref].s.font.bold = true;
                  ws[cell_ref].s.alignment.horizontal = 'center';
                  ws[cell_ref].s.fill = { fgColor: { rgb: 'F3F4F6' } };
                }
                // Side styling: centered
                if (C === 5) {
                  ws[cell_ref].s.alignment.horizontal = 'center';
                }
                // Yes/No columns centered alignment
                if (C >= 6) {
                  ws[cell_ref].s.alignment.horizontal = 'center';
                }
              }
            }
          }

          ws['!views'] = [{ showGridLines: true }];
          ws['!pageSetup'] = {
            orientation: 'landscape',
            paperSize: 9,
            scale: 100,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
          };
          ws['!margins'] = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

          const maxLens: { [key: string]: number } = {};
          consolidatedRows.forEach(row => {
            Object.keys(row).forEach(key => {
              const val = String(row[key] || '');
              if (!merges.some(m => m.s.r === consolidatedRows.indexOf(row) + 1)) {
                maxLens[key] = Math.max(maxLens[key] || key.length, val.length);
              }
            });
          });
          ws['!cols'] = Object.keys(maxLens).map(key => ({
            wch: maxLens[key] + 3
          }));

          const tabLabel = sideFilter 
            ? `${formatSide(sideFilter)} ${hideNamesAndPhone ? 'Special' : 'Consolidated'}`
            : 'Consolidated Report';
          XLSX.utils.book_append_sheet(wb, ws, tabLabel.substring(0, 31));
        }
      } else {
        // Multi-tab standard sheet generation
        lodgesData.forEach(lodge => {
          // Filter and sort rooms numerically
          const lodgeRooms = (roomsData || [])
            .filter((r: any) => r.lodge_id === lodge.id)
            .sort((a: any, b: any) => {
              const numA = getNumericValue(a.room_no);
              const numB = getNumericValue(b.room_no);
              if (numA !== numB) {
                return numA - numB;
              }
              return a.room_no.localeCompare(b.room_no, undefined, { numeric: true, sensitivity: 'base' });
            });
          
          // Omit rooms occupied by the other side
          const matchingRooms = lodgeRooms.filter((room: any) => {
            const roomGuests = room.room_guests || [];
            if (roomGuests.length === 0) return true; // Keep empty rooms
            if (!sideFilter) return true;
            return roomGuests.some((rg: any) => rg.guest?.side === sideFilter || rg.guest?.side === 'both');
          });

          const aoaData: any[][] = [];
          
          // 1. Lodge name header row (Row 1)
          aoaData.push([lodge.name.toUpperCase(), '', '', '', '', '', '', '', '', '']);
          
          // 2. Visual spacer row (Row 2)
          aoaData.push(['', '', '', '', '', '', '', '', '', '']);
          
          // 3. Column headers (Row 3)
          const headers = [
            'S.No.',
            'Room Number',
            'Guest Name',
            'Phone Number',
            'Place',
            'Side',
            'Keys Given',
            'Keys Collected',
            'AC Remote Given',
            'AC Remote Collected'
          ];
          aoaData.push(headers);

          let sNo = 1; // Reset per lodge
          
          matchingRooms.forEach((room: any) => {
            const roomGuests = room.room_guests || [];
            
            if (roomGuests.length === 0) {
              aoaData.push([
                sNo++,
                room.room_no,
                '—',
                '—',
                '—',
                '—',
                '',
                '',
                '',
                ''
              ]);
            } else {
              const matchingGuests = !sideFilter 
                ? roomGuests 
                : roomGuests.filter((rg: any) => rg.guest?.side === sideFilter || rg.guest?.side === 'both');

              matchingGuests.forEach((rg: any) => {
                const guestInfo = rg.guest;
                aoaData.push([
                  sNo++,
                  room.room_no,
                  guestInfo?.name || '—',
                  guestInfo?.phone || '—',
                  guestInfo?.hometown || '—',
                  formatSide(guestInfo?.side),
                  '',
                  '',
                  '',
                  ''
                ]);
              });
            }
          });

          // If no rooms in this lodge, add a placeholder row
          if (aoaData.length === 3) {
            aoaData.push([
              '',
              '—',
              '—',
              '—',
              '—',
              '—',
              '',
              '',
              '',
              ''
            ]);
          }

          const ws = XLSX.utils.aoa_to_sheet(aoaData);
          
          // Merge A1 to J1 (Row index 0, Col index 0 to 9)
          ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }
          ];

          // Apply printable styling
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const isLodgeHeader = R === 0;
            const isBlankRow = R === 1;
            const isColumnHeaders = R === 2;

            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cell_address = { c: C, r: R };
              const cell_ref = XLSX.utils.encode_cell(cell_address);
              if (!ws[cell_ref]) continue;

              // Default style
              ws[cell_ref].s = {
                font: { name: 'Arial', size: 10 },
                border: {
                  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                },
                alignment: { vertical: 'center', horizontal: 'left' }
              };

              if (isLodgeHeader) {
                // Lodge Header: Bold, 18pt, Centered, Light Blue Highlight
                ws[cell_ref].s.fill = { fgColor: { rgb: 'DBEAFE' } }; 
                ws[cell_ref].s.font = { name: 'Arial', size: 18, bold: true, color: { rgb: '1E40AF' } };
                ws[cell_ref].s.alignment = { horizontal: 'center', vertical: 'center' };
              } else if (isBlankRow) {
                ws[cell_ref].s.border = {}; // Strip borders
              } else if (isColumnHeaders) {
                // Header style: dark blue background, bold white text, centered
                ws[cell_ref].s.fill = { fgColor: { rgb: '1E3A8A' } };
                ws[cell_ref].s.font = { name: 'Arial', size: 10, bold: true, color: { rgb: 'FFFFFF' } };
                ws[cell_ref].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
              } else {
                // Data styling
                
                // S.No. styling: bold, light gray fill, centered
                if (C === 0) {
                  ws[cell_ref].s.font.bold = true;
                  ws[cell_ref].s.alignment.horizontal = 'center';
                  ws[cell_ref].s.fill = { fgColor: { rgb: 'F3F4F6' } };
                }
                // Room Number styling: bold, light gray fill, centered
                if (C === 1) {
                  ws[cell_ref].s.font.bold = true;
                  ws[cell_ref].s.alignment.horizontal = 'center';
                  ws[cell_ref].s.fill = { fgColor: { rgb: 'F3F4F6' } };
                }
                
                // Side styling: centered
                if (C === 5) {
                  ws[cell_ref].s.alignment.horizontal = 'center';
                }

                // Yes/No columns centered alignment
                if (C >= 6) {
                  ws[cell_ref].s.alignment.horizontal = 'center';
                }
              }
            }
          }

          // Print & gridline configurations
          ws['!views'] = [{ showGridLines: true }];
          ws['!pageSetup'] = {
            orientation: 'landscape',
            paperSize: 9, // A4
            scale: 100,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
          };
          ws['!margins'] = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
          
          // Auto-fit column widths (skip Row 0 (lodge name) and Row 1 (blank) for width calculations)
          const maxLens: { [key: string]: number } = {};
          aoaData.forEach((row, rIdx) => {
            if (rIdx < 2) return;
            row.forEach((cellVal, cIdx) => {
              const val = String(cellVal || '');
              const key = headers[cIdx];
              maxLens[key] = Math.max(maxLens[key] || key.length, val.length);
            });
          });
          ws['!cols'] = headers.map(key => ({
            wch: maxLens[key] + 3
          }));

          // Clean sheet name: remove invalid characters and limit to 31 chars
          const cleanName = lodge.name.replace(/[\\\/\?\*\:\[\]]/g, '').substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, cleanName || `Lodge_${lodge.id.substring(0, 4)}`);
        });
      }

      // Filename based on filters
      let baseName = 'Room_Allocations_All';
      if (consolidated) {
        if (sideFilter === 'bride') {
          baseName = hideNamesAndPhone ? 'Room_Allocations_Bride_Special' : 'Room_Allocations_Bride_Consolidated';
        } else if (sideFilter === 'groom') {
          baseName = 'Room_Allocations_Groom_Consolidated';
        } else {
          baseName = 'Room_Allocations_Consolidated';
        }
      } else {
        if (sideFilter === 'bride') {
          baseName = 'Room_Allocations_Bride';
        } else if (sideFilter === 'groom') {
          baseName = 'Room_Allocations_Groom';
        }
      }

      // Write and download
      XLSX.writeFile(wb, `${baseName}_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export to Excel: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

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

                 {/* Reports */}
                <div className="section-header">Reports & Exports</div>
                <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Generate formatted Excel sheets for printing.
                  </p>
                  
                  {/* Multi-Tab Exports */}
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '4px' }}>MULTI-TAB EXPORTS (BY LODGE)</div>
                  
                  <button
                    onClick={() => exportToExcel()}
                    disabled={exporting}
                    className="btn btn-primary"
                    style={{ gap: '8px', justifyContent: 'center', width: '100%', display: 'flex', alignItems: 'center' }}
                  >
                    <Download className="w-4 h-4" /> {exporting ? 'Generating...' : 'Export All (Multi-Tab)'}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => exportToExcel({ sideFilter: 'bride' })}
                      disabled={exporting}
                      className="btn btn-secondary"
                      style={{ gap: '6px', justifyContent: 'center', display: 'flex', alignItems: 'center', fontSize: '12px', padding: '10px 4px' }}
                    >
                      <Download className="w-3.5 h-3.5" /> Bride (Multi-Tab)
                    </button>
                    
                    <button
                      onClick={() => exportToExcel({ sideFilter: 'groom' })}
                      disabled={exporting}
                      className="btn btn-secondary"
                      style={{ gap: '6px', justifyContent: 'center', display: 'flex', alignItems: 'center', fontSize: '12px', padding: '10px 4px' }}
                    >
                      <Download className="w-3.5 h-3.5" /> Groom (Multi-Tab)
                    </button>
                  </div>

                  {/* Consolidated Single-Tab Exports */}
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '8px' }}>CONSOLIDATED EXPORTS (SINGLE TAB)</div>

                  <button
                    onClick={() => exportToExcel({ consolidated: true })}
                    disabled={exporting}
                    className="btn btn-primary"
                    style={{ gap: '8px', justifyContent: 'center', width: '100%', display: 'flex', alignItems: 'center', background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid var(--blue)' }}
                  >
                    <Download className="w-4 h-4" /> {exporting ? 'Generating...' : 'Consolidated Report'}
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => exportToExcel({ consolidated: true, sideFilter: 'bride' })}
                      disabled={exporting}
                      className="btn btn-secondary"
                      style={{ gap: '6px', justifyContent: 'center', display: 'flex', alignItems: 'center', fontSize: '12px', padding: '10px 4px' }}
                    >
                      <Download className="w-3.5 h-3.5" /> Bride (Consolidated)
                    </button>
                    
                    <button
                      onClick={() => exportToExcel({ consolidated: true, sideFilter: 'groom' })}
                      disabled={exporting}
                      className="btn btn-secondary"
                      style={{ gap: '6px', justifyContent: 'center', display: 'flex', alignItems: 'center', fontSize: '12px', padding: '10px 4px' }}
                    >
                      <Download className="w-3.5 h-3.5" /> Groom (Consolidated)
                    </button>
                  </div>

                  <button
                    onClick={() => exportToExcel({ consolidated: true, sideFilter: 'bride', hideNamesAndPhone: true })}
                    disabled={exporting}
                    className="btn btn-ghost"
                    style={{ gap: '8px', justifyContent: 'center', width: '100%', display: 'flex', alignItems: 'center', border: '1px dashed var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}
                  >
                    <Download className="w-4 h-4" /> Bride (Consolidated, Blank Names & Phones)
                  </button>
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
