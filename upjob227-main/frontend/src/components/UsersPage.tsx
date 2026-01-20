import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Plus, RefreshCw, Search, Trash2, UserX, UserCheck, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { createUser, deleteUser, listUsers, setUserActive, updateUser } from '../services/api';
import { getStoredRole, type Role } from '../lib/rbac';
import type { ManagedUser } from '../types/api';

// FLOW START: Users Page (EN)
// จุดเริ่มต้น: หน้า Users (TH)

type FormState = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
};

const canManageTarget = (actorRole: Role, targetRole: string): boolean => {
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin_full') return targetRole !== 'super_admin';
  if (actorRole === 'admin_mess') return targetRole === 'manager' || targetRole === 'viewer';
  if (actorRole === 'manager') return targetRole === 'viewer';
  return false;
};

const assignableRoles = (actorRole: Role): string[] => {
  if (actorRole === 'super_admin') return ['super_admin', 'admin_full', 'admintest', 'admin_mess', 'manager', 'viewer'];
  if (actorRole === 'admin_full') return ['admin_full', 'admintest', 'admin_mess', 'manager', 'viewer'];
  if (actorRole === 'admin_mess') return ['manager', 'viewer'];
  if (actorRole === 'manager') return ['viewer'];
  return ['viewer'];
};

const visibleRoles = (actorRole: Role): string[] => {
  if (actorRole === 'super_admin') return ['super_admin', 'admin_full', 'admintest', 'admin_mess', 'manager', 'viewer'];
  if (actorRole === 'admin_full') return ['admin_full', 'admintest', 'admin_mess', 'manager', 'viewer'];
  if (actorRole === 'admin_mess') return ['admin_mess', 'manager', 'viewer'];
  if (actorRole === 'manager') return ['manager', 'viewer'];
  return ['viewer'];
};

const roleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (role === 'super_admin') return 'destructive';
  if (role === 'admin_full') return 'default';
  if (role === 'admintest') return 'secondary';
  if (role === 'admin_mess') return 'secondary';
  if (role === 'manager') return 'outline';
  return 'outline';
};

const displayRole = (role: string): string => {
  if (role === 'admintest') return 'admin_test';
  if (role === 'admin_mess') return 'admin_test';
  return role;
};

const UsersPage: React.FC = () => {
  const role = getStoredRole();
  const allowedRoles = useMemo(() => assignableRoles(role), [role]);
  const filterableRoles = useMemo(() => visibleRoles(role), [role]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const [draftSearch, setDraftSearch] = useState('');
  const [draftRole, setDraftRole] = useState('');
  const [draftActive, setDraftActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    setDraftSearch(search);
    setDraftRole(filterRole);
    setDraftActive(filterActive);
  }, [filterActive, filterRole, search]);

  const filtersDirty =
    draftSearch.trim() !== search || draftRole !== filterRole || draftActive !== filterActive;

  const [modal, setModal] = useState<{ open: boolean; mode: 'create' | 'edit'; user?: ManagedUser }>(
    { open: false, mode: 'create' },
  );

  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: allowedRoles[allowedRoles.length - 1] || 'viewer',
    isActive: true,
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, role: allowedRoles[allowedRoles.length - 1] || 'viewer' }));
  }, [allowedRoles]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await listUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        role: filterRole || undefined,
        isActive: filterActive === 'all' ? undefined : filterActive === 'active',
      });

      setItems(res.users);
      setPagination(res.pagination);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filterActive, filterRole, pagination.limit, pagination.page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: allowedRoles[allowedRoles.length - 1] || 'viewer',
      isActive: true,
    });
    setModal({ open: true, mode: 'create' });
  };

  const openEdit = (u: ManagedUser) => {
    setForm({
      email: u.email || '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      role: u.role || 'viewer',
      isActive: u.isActive !== false,
    });
    setModal({ open: true, mode: 'edit', user: u });
  };

  const closeModal = () => setModal({ open: false, mode: 'create' });

  const submit = async () => {
    try {
      setError(null);
      if (modal.mode === 'create') {
        if (!form.password) {
          setError('Password is required');
          return;
        }
        await createUser({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        });
      } else {
        if (!modal.user?.id) return;
        await updateUser(modal.user.id, {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          isActive: form.isActive,
        });
      }
      closeModal();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Save failed');
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    try {
      setError(null);
      await setUserActive(u.id, !(u.isActive !== false));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update status');
    }
  };

  const remove = async (u: ManagedUser) => {
    try {
      setError(null);
      const ok = window.confirm(`Delete user ${u.email}? This action cannot be undone.`);
      if (!ok) return;
      await deleteUser(u.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Delete failed');
    }
  };

  const canDelete = role === 'super_admin' || role === 'admin_full';

  const applyFilters = () => {
    setPagination((p) => ({ ...p, page: 1 }));
    setSearch(draftSearch.trim());
    setFilterRole(draftRole);
    setFilterActive(draftActive);
  };

  const resetFilters = () => {
    setDraftSearch('');
    setDraftRole('');
    setDraftActive('all');
    setPagination((p) => ({ ...p, page: 1 }));
    setSearch('');
    setFilterRole('');
    setFilterActive('all');
  };

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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-800">Users</h2>
            <p className="text-sm text-gray-500">Create, edit, and deactivate users. Role assignment is restricted by your role.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New user
            </Button>
          </div>
        </div>

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">Filters</CardTitle>
            <CardDescription>Search and filter users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
              <label className="space-y-2 text-sm text-gray-700 md:col-span-5">
                Search
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyFilters();
                      }
                    }}
                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email / name"
                    inputMode="search"
                  />
                  {draftSearch.length > 0 && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
                      onClick={() => setDraftSearch('')}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </label>

              <label className="space-y-2 text-sm text-gray-700 md:col-span-3">
                Role
                <select
                  value={draftRole}
                  onChange={(e) => setDraftRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  {filterableRoles.includes('super_admin') && <option value="super_admin">super_admin</option>}
                  {filterableRoles.includes('admin_full') && <option value="admin_full">admin_full</option>}
                  {filterableRoles.includes('admintest') && <option value="admintest">admin_test</option>}
                  {filterableRoles.includes('admin_mess') && <option value="admin_mess">admin_test</option>}
                  {filterableRoles.includes('manager') && <option value="manager">manager</option>}
                  {filterableRoles.includes('viewer') && <option value="viewer">viewer</option>}
                </select>
              </label>

              <label className="space-y-2 text-sm text-gray-700 md:col-span-2">
                Status
                <select
                  value={draftActive}
                  onChange={(e) => setDraftActive(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row md:flex-col">
                <Button className="w-full" onClick={applyFilters} disabled={loading || !filtersDirty}>
                  Apply
                </Button>
                <Button variant="outline" className="w-full" onClick={resetFilters} disabled={loading && items.length === 0}>
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-800">User list</CardTitle>
            <CardDescription>
              Showing {items.length} of {pagination.total}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-3 text-gray-700">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Loading users...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 p-8 text-center">
                <p className="text-sm font-semibold text-gray-800">No users found</p>
                <p className="mt-2 text-sm text-gray-600">Try adjusting filters or create a new user.</p>
                <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <Button variant="outline" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New user
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraftSearch('');
                      setDraftRole('');
                      setDraftActive('all');
                      setPagination((p) => ({ ...p, page: 1 }));
                      setSearch('');
                      setFilterRole('');
                      setFilterActive('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border border-gray-200 bg-white max-h-[60vh]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((u) => {
                      const active = u.isActive !== false;
                      const manageable = canManageTarget(role, u.role);
                      const fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || '—';
                      return (
                        <tr key={u.id} className="last:border-b-0 hover:bg-orange-50/40">
                          <td className="py-3 px-4 text-gray-700 font-medium max-w-[240px] truncate" title={fullName}>
                            {fullName}
                          </td>
                          <td className="py-3 px-4 text-gray-700 max-w-[320px] truncate" title={u.email || ''}>
                            {u.email}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge variant={roleBadgeVariant(u.role)}>{displayRole(u.role)}</Badge>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {active ? (
                              <Badge variant="secondary">active</Badge>
                            ) : (
                              <Badge variant="outline">inactive</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!manageable}
                                onClick={() => openEdit(u)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!manageable}
                                onClick={() => toggleActive(u)}
                              >
                                {active ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Activate</span>
                                  </>
                                )}
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={!manageable}
                                  onClick={() => remove(u)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {pagination.page} / {pagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pagination.limit}
                  onChange={(e) => setPagination((p) => ({ ...p, page: 1, limit: Number(e.target.value) }))}
                  className="hidden sm:block px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page <= 1 || loading}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {modal.open && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
            onMouseDown={() => closeModal()}
          >
            <div className="w-full max-w-xl" onMouseDown={(e) => e.stopPropagation()}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-gray-800">{modal.mode === 'create' ? 'Create user' : 'Edit user'}</CardTitle>
                  <CardDescription>
                    {modal.mode === 'create'
                      ? 'Create a new user in this tenant.'
                      : 'Update user details. Role selection is restricted by your role.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-2 text-sm text-gray-700">
                      First name
                      <input
                        value={form.firstName}
                        onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-gray-700">
                      Last name
                      <input
                        value={form.lastName}
                        onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-gray-700 md:col-span-2">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                    {modal.mode === 'create' && (
                      <label className="space-y-2 text-sm text-gray-700 md:col-span-2">
                        Password
                        <input
                          type="password"
                          value={form.password || ''}
                          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    )}
                    <label className="space-y-2 text-sm text-gray-700">
                      Role
                      <select
                        value={form.role}
                        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {allowedRoles.map((r) => (
                          <option key={r} value={r}>
                            {displayRole(r)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm text-gray-700">
                      Status
                      <select
                        value={form.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'active' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={modal.mode === 'create'}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button onClick={submit}>{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// FLOW END: Users Page (EN)
// จุดสิ้นสุด: หน้า Users (TH)

export default UsersPage;
