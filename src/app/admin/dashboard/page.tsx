'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Activity, FileText, TrendingUp, LogOut, Plus, Trash2, RefreshCcw, Shield, ShieldCheck, Edit, Key } from 'lucide-react';
import Link from 'next/link';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialization?: string;
  licenseNumber?: string;
  isActive: boolean;
  diagnosisCount: number;
  createdAt: string;
}

interface Stats {
  totalDoctors: number;
  totalDiagnoses: number;
  diagnosisByType: Record<string, number>;
  recentActivity: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    licenseNumber: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [doctorsRes, statsRes] = await Promise.all([
        fetch('/api/admin/doctors'),
        fetch('/api/admin/stats'),
      ]);

      if (!doctorsRes.ok || !statsRes.ok) {
        router.push('/admin/login');
        return;
      }

      const doctorsData = await doctorsRes.json();
      const statsData = await statsRes.json();

      setDoctors(doctorsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const response = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || 'Failed to create doctor');
        setFormLoading(false);
        return;
      }

      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', specialization: '', licenseNumber: '' });
      await fetchData();
    } catch (error) {
      setFormError('An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!editingDoctor) return;

    try {
      const updates: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        specialization: formData.specialization,
        licenseNumber: formData.licenseNumber,
      };

      // Include password only if provided
      if (formData.password && formData.password.length >= 8) {
        updates.password = formData.password;
      }

      const response = await fetch(`/api/admin/doctors/${editingDoctor._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || 'Failed to update doctor');
        setFormLoading(false);
        return;
      }

      setShowEditModal(false);
      setEditingDoctor(null);
      setFormData({ name: '', email: '', password: '', specialization: '', licenseNumber: '' });
      await fetchData();
    } catch (error) {
      setFormError('An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      email: doctor.email,
      password: '', // Don't show password
      specialization: doctor.specialization || '',
      licenseNumber: doctor.licenseNumber || '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm('Are you sure you want to deactivate this doctor?')) return;

    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting doctor:', error);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4 text-indigo-700">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const activeDoctors = doctors.filter(d => d.isActive);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/cross-validation"
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Cross-Validation</span>
              </Link>
              <Link
                href="/viewer"
                className="flex items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 transition"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">View Slides</span>
              </Link>
              <span className="text-sm text-slate-600">{session?.user?.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Doctors</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalDoctors || 0}</p>
              </div>
              <Users className="h-10 w-10 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Diagnoses</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.totalDiagnoses || 0}</p>
              </div>
              <FileText className="h-10 w-10 text-teal-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Recent (7 days)</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats?.recentActivity || 0}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-emerald-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col h-full">
              <p className="text-sm font-medium text-slate-500 mb-3">Diagnosis Distribution</p>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {stats?.diagnosisByType && Object.keys(stats.diagnosisByType).length > 0 ? (
                  Object.entries(stats.diagnosisByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 font-medium">{type || 'Unspecified'}</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                        {count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">No diagnoses yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Management */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Doctor Management</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
              >
                <Plus className="h-4 w-4" />
                Add Doctor
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Diagnoses</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeDoctors.map((doctor) => (
                  <tr key={doctor._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{doctor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{doctor.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{doctor.specialization || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{doctor.diagnosisCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(doctor)}
                          className="text-indigo-600 hover:text-indigo-800 transition"
                          title="Edit doctor"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doctor._id)}
                          className="text-red-600 hover:text-red-800 transition"
                          title="Deactivate doctor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeDoctors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                      No active doctors found. Add a doctor to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Add New Doctor</h3>
            </div>
            <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  disabled={formLoading}
                >
                  {formLoading ? 'Creating...' : 'Create Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {showEditModal && editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit Doctor Details</h3>
            </div>
            <form onSubmit={handleEditDoctor} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-500" />
                    New Password (optional)
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to keep current password"
                  minLength={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-500">Minimum 8 characters if changing</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDoctor(null);
                    setFormError('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  disabled={formLoading}
                >
                  {formLoading ? 'Updating...' : 'Update Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
