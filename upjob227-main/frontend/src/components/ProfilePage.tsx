import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Loader2, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { updateUser } from '../services/api';

interface ProfileState {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

// FLOW START: Profile Page (EN)
// จุดเริ่มต้น: หน้า Profile (TH)

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, error, refetch } = useCurrentUser();

  const initialProfile: ProfileState = useMemo(
    () => ({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatarUrl || null,
    }),
    [user]
  );

  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile(initialProfile);
    setHasUnsavedChanges(false);
  }, [initialProfile, user]);

  const handleFieldChange = (field: keyof ProfileState, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) return;
      setProfile((prev) => ({ ...prev, avatarUrl: value }));
      setHasUnsavedChanges(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSavedMessage('');
    try {
      await updateUser(user.id, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone || '',
        avatarUrl: profile.avatarUrl || '',
      });
      await refetch();
      setHasUnsavedChanges(false);
      setSavedMessage('Profile saved successfully');
      setTimeout(() => setSavedMessage(''), 2500);
    } catch {
      setSavedMessage('');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProfile(initialProfile);
    setHasUnsavedChanges(false);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800"
        style={
          {
            ['--theme-background' as any]: '#ffffff',
            ['--theme-surface' as any]: '#ffffff',
            ['--surface-muted' as any]: '#fff7ed',
            ['--theme-text' as any]: '#1f232c',
            ['--theme-muted' as any]: '#6b7280',
            ['--theme-border' as any]: 'rgba(15, 23, 42, 0.08)',
            ['--accent-color' as any]: '#3b82f6',
          } as React.CSSProperties
        }
      >
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-gray-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fdf6f0] p-6 lg:p-10 text-gray-800"
      style={
        {
          ['--theme-background' as any]: '#ffffff',
          ['--theme-surface' as any]: '#ffffff',
          ['--surface-muted' as any]: '#fff7ed',
          ['--theme-text' as any]: '#1f232c',
          ['--theme-muted' as any]: '#6b7280',
          ['--theme-border' as any]: 'rgba(15, 23, 42, 0.08)',
          ['--accent-color' as any]: '#3b82f6',
        } as React.CSSProperties
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="bg-white rounded-3xl shadow p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative w-32 h-32">
            <img
              src={profile.avatarUrl || 'https://placehold.co/300x300?text=Avatar'}
              alt={profile.firstName}
              className="w-32 h-32 rounded-2xl object-cover"
            />
            <label className="absolute bottom-2 right-2 inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white shadow cursor-pointer">
              <Camera className="h-5 w-5 text-gray-600" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-wider text-gray-500">Profile</p>
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-sm text-gray-500">{(user?.role || 'viewer').toUpperCase()}</p>
            {savedMessage && <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {savedMessage}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={handleReset}
              disabled={saving}
            >
              Reset
            </button>
            <button
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-semibold shadow-md disabled:opacity-60"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </div>

        <section className="bg-white rounded-3xl shadow p-6 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.0em] text-gray-500">Basic Information</p>
            <h2 className="text-xl font-semibold text-gray-900">Update account details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm text-gray-700">
              First name
              <input
                type="text"
                className="w-full rounded-2xl border border-gray-200 px-4 py-2"
                value={profile.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              Last name
              <input
                type="text"
                className="w-full rounded-2xl border border-gray-200 px-4 py-2"
                value={profile.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700 md:col-span-2">
              Email
              <input
                type="email"
                className="w-full rounded-2xl border border-gray-200 px-4 py-2"
                value={profile.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700 md:col-span-2">
              Phone
              <input
                type="tel"
                className="w-full rounded-2xl border border-gray-200 px-4 py-2"
                value={profile.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-3xl shadow p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-xs uppercase tracking-[0.0em] text-gray-500">Registration details</p>
              <h2 className="text-xl font-semibold text-gray-900">Account timeline</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.0em] text-gray-400">Registered on</p>
              <p className="mt-1 text-base font-semibold text-gray-900">—</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.0em] text-gray-400">Last login</p>
              <p className="mt-1 text-base font-semibold text-gray-900">—</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.0em] text-gray-400">Tenant ID</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{user?.tenantId || '—'}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.0em] text-gray-400">User ID</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{user?.id || '—'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// FLOW END: Profile Page (EN)
// จุดสิ้นสุด: หน้า Profile (TH)

export default ProfilePage;
