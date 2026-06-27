import { Building2, Users, ChevronRight } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';

export function ConfigScreen() {
  const { navigate } = useNavigation();

  return (
    <div className="screen active">
      <div className="topbar">
        <h1>Configuration</h1>
      </div>

      <div className="scroll">
        <div className="section-header">Lodge &amp; Guest Management</div>
        <div className="card" style={{ margin: '16px' }}>
          <div onClick={() => navigate({ name: 'lodges' })} className="list-row">
            <div className="row-icon blue">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="row-body">
              <div className="row-title">Manage Lodges</div>
              <div className="row-sub">View and add lodges, rooms, and assignments</div>
            </div>
            <span className="chevron">
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
          
          <div onClick={() => navigate({ name: 'guests' })} className="list-row">
            <div className="row-icon green">
              <Users className="w-5 h-5" />
            </div>
            <div className="row-body">
              <div className="row-title">Manage Guests</div>
              <div className="row-sub">Import, search, and view guest list details</div>
            </div>
            <span className="chevron">
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
