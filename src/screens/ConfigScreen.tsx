import { useEffect, useState } from 'react';
import { Building2, Users, Save, Calendar, Phone, Sparkles, MapPin, MailOpen, AlertCircle } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';

export function ConfigScreen() {
  const { navigate } = useNavigation();
  const [settings, setSettings] = useState({
    couple: '',
    date: '',
    e_invite_url: '',
    mandapam_url: '',
    auto_driver_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadSettings() {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (!error && data) {
      const map: any = {};
      data.forEach((item: any) => {
        map[item.key] = item.value || '';
      });
      setSettings({
        couple: map.couple || 'Dharshan & Amulya',
        date: map.date || '05 Jul 2026',
        e_invite_url: map.e_invite_url || 'https://dharshan-amulya-inviation.netlify.app/',
        mandapam_url: map.mandapam_url || 'https://maps.app.goo.gl/gvPnU5aRGoMvWJkH6',
        auto_driver_number: map.auto_driver_number || '',
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const updates = Object.entries(settings).map(([key, value]) =>
        supabase.from('settings').upsert({ key, value })
      );

      await Promise.all(updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

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
          </div>
          
          <div onClick={() => navigate({ name: 'guests' })} className="list-row">
            <div className="row-icon green">
              <Users className="w-5 h-5" />
            </div>
            <div className="row-body">
              <div className="row-title">Manage Guests</div>
              <div className="row-sub">Import, search, and view guest list details</div>
            </div>
          </div>
        </div>

        <div className="section-header">Global Event &amp; Link Settings</div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="card" style={{ margin: '0 16px 24px', padding: '16px' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles className="w-4 h-4 text-blue-600" /> Couple Names
              </label>
              <input
                type="text"
                placeholder="e.g. Dharshan &amp; Amulya"
                value={settings.couple}
                onChange={e => setSettings(prev => ({ ...prev, couple: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar className="w-4 h-4 text-blue-600" /> Wedding Date
              </label>
              <input
                type="text"
                placeholder="e.g. 05 Jul 2026"
                value={settings.date}
                onChange={e => setSettings(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MailOpen className="w-4 h-4 text-blue-600" /> E-Invite URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={settings.e_invite_url}
                onChange={e => setSettings(prev => ({ ...prev, e_invite_url: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin className="w-4 h-4 text-blue-600" /> Wedding Hall Google Maps URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={settings.mandapam_url}
                onChange={e => setSettings(prev => ({ ...prev, mandapam_url: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone className="w-4 h-4 text-blue-600" /> Auto Rickshaw Driver Contact Number
              </label>
              <input
                type="tel"
                placeholder="Auto Driver Number (e.g. 9876543210)"
                value={settings.auto_driver_number}
                onChange={e => setSettings(prev => ({ ...prev, auto_driver_number: e.target.value.replace(/[^\d]/g, '') }))}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span>Guests will see this contact in their dashboard labeled <strong>"at their own cost"</strong>.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
            >
              <Save className="w-4 h-4" /> {saved ? 'Saved Successfully!' : saving ? 'Saving Changes…' : 'Save Event Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
