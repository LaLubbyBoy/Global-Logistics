/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, LayoutDashboard, PlusCircle, Package, Search, LogOut, 
  Eye, Edit, Trash2, Copy, Check, AlertCircle, CheckCircle2, 
  Clock, MapPin, Phone, Mail, DollarSign, Calendar, X, Menu, ShieldCheck, User, Lock, ArrowLeft, ExternalLink 
} from 'lucide-react';

interface Admin {
  id: number;
  username: string;
  email: string;
}

interface TrackingRecord {
  id: number;
  tracking_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_location: string;
  delivery_address: string;
  package_description: string;
  package_weight: string;
  package_value: string;
  date_registered: string;
  estimated_delivery_date: string;
  delivery_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  inTransit: number;
  delivered: number;
  pending: number;
}

const deliveryStatuses = [
  'Registered',
  'Processing',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'On Hold',
  'Cancelled'
];

export default function AdminApp() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Login form state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Navigation state within dashboard: 'dashboard' | 'generate' | 'records'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generate' | 'records'>('dashboard');

  // Dashboard Data
  const [stats, setStats] = useState<Stats>({ total: 0, inTransit: 0, delivered: 0, pending: 0 });
  const [recentRecords, setRecentRecords] = useState<TrackingRecord[]>([]);
  const [allRecords, setAllRecords] = useState<TrackingRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(false);

  // Generate Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_location: '',
    delivery_address: '',
    package_description: '',
    package_weight: '1.5 kg',
    package_value: '$250.00',
    date_registered: new Date().toISOString().split('T')[0],
    estimated_delivery_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    delivery_status: 'Registered',
    notes: ''
  });
  const [generatedResult, setGeneratedResult] = useState<TrackingRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modal states
  const [viewingRecord, setViewingRecord] = useState<TrackingRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<TrackingRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Mobile sidebar toggle
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Check auth on load or token change
  useEffect(() => {
    if (!token) {
      setLoadingAuth(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then(data => {
        setAdmin(data.admin);
        fetchDashboardData(token);
      })
      .catch(() => {
        localStorage.removeItem('admin_token');
        setToken(null);
        setAdmin(null);
      })
      .finally(() => setLoadingAuth(false));
  }, [token]);

  const fetchDashboardData = async (currentToken: string) => {
    setLoadingData(true);
    try {
      const statsRes = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setRecentRecords(statsData.recentRecords);
      }

      const recRes = await fetch('/api/admin/records', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (recRes.ok) {
        const recData = await recRes.json();
        setAllRecords(recData.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
      setAdmin(data.admin);
      fetchDashboardData(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid username or password');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('admin_token');
    setToken(null);
    setAdmin(null);
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.customer_phone || !formData.delivery_location || !formData.package_description) {
      alert('Please fill in all required fields.');
      return;
    }

    setGenerating(true);
    setSuccessMessage(null);
    setGeneratedResult(null);

    try {
      const res = await fetch('/api/admin/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate tracking code');

      setGeneratedResult(data.record);
      setSuccessMessage('Tracking code successfully generated and saved to database!');
      if (token) fetchDashboardData(token);

      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        delivery_location: '',
        delivery_address: '',
        package_description: '',
        package_weight: '1.5 kg',
        package_value: '$250.00',
        date_registered: new Date().toISOString().split('T')[0],
        estimated_delivery_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
        delivery_status: 'Registered',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'Error generating tracking code');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !token) return;

    try {
      const res = await fetch(`/api/admin/records/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingRecord)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update record');

      setEditingRecord(null);
      fetchDashboardData(token);
      alert('Tracking record updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Error updating record');
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/records/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete record');

      setDeletingId(null);
      fetchDashboardData(token);
    } catch (err: any) {
      alert(err.message || 'Error deleting record');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'In Transit':
      case 'Out for Delivery':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Processing':
      case 'Registered':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'On Hold':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
            Admin Portal Login
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Global Express Logistics Management System
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 py-8 px-4 shadow-2xl border border-slate-800 sm:rounded-3xl sm:px-10">
            {loginError && (
              <div className="mb-6 bg-rose-500/15 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Username or Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 text-xs font-semibold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="font-semibold text-blue-400">Default Credentials:</span> Username <code className="text-white bg-slate-800 px-1.5 py-0.5 rounded">admin</code> | Password <code className="text-white bg-slate-800 px-1.5 py-0.5 rounded">password123</code>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-600/30 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-75 transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  {loginLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Secure Sign In</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <a href="/" className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Customer Tracking Website</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN DASHBOARD ---
  const filteredRecords = allRecords.filter(r => 
    r.tracking_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.delivery_location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight">Global Express</span>
            <span className="block text-xs font-semibold text-blue-400">Admin Control</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
              activeTab === 'dashboard' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
              activeTab === 'generate' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Generate Code</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition ${
              activeTab === 'records' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>All Records ({allRecords.length})</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-950 p-3 rounded-xl mb-3 border border-slate-800">
            <span className="block text-xs text-slate-500 font-medium">Logged in as</span>
            <span className="block text-sm font-bold text-white truncate">{admin.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-semibold text-sm transition border border-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Truck className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-sm">Global Express Admin</span>
        </div>
        <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="p-2 text-slate-300">
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Modal */}
      {mobileSidebarOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => { setActiveTab('generate'); setMobileSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm ${activeTab === 'generate' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Generate Code</span>
          </button>
          <button
            onClick={() => { setActiveTab('records'); setMobileSidebarOpen(false); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm ${activeTab === 'records' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
          >
            <Package className="w-5 h-5" />
            <span>All Records</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-rose-500/10 text-rose-400 rounded-xl font-semibold text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Logout</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top Bar with Public site link */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Administrator Dashboard</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {activeTab === 'dashboard' && 'Welcome back, ' + admin.username}
                {activeTab === 'generate' && 'Generate New Tracking Code'}
                {activeTab === 'records' && 'All Tracking Records'}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl transition border border-slate-700 flex items-center space-x-2"
              >
                <span>View Customer Portal</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Records</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white">{stats.total}</div>
                  <span className="text-xs text-slate-500 mt-1 block">Active shipments in DB</span>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Transit</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white">{stats.inTransit}</div>
                  <span className="text-xs text-blue-400 mt-1 block">On route / moving</span>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivered</span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white">{stats.delivered}</div>
                  <span className="text-xs text-emerald-400 mt-1 block">Successfully completed</span>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending / Processing</span>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white">{stats.pending}</div>
                  <span className="text-xs text-amber-400 mt-1 block">Registered & processing</span>
                </div>
              </div>

              {/* Recent Records Table */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">Recently Generated Tracking Codes</h2>
                    <p className="text-xs text-slate-400">Latest shipments registered in the system</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('records')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                  >
                    View All Records →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Tracking Code</th>
                        <th className="px-6 py-4">Customer Name</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Date Created</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {recentRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No records found.</td>
                        </tr>
                      ) : (
                        recentRecords.map(r => (
                          <tr key={r.id} className="hover:bg-slate-850 transition">
                            <td className="px-6 py-4 font-mono font-bold text-blue-400">{r.tracking_code}</td>
                            <td className="px-6 py-4 font-semibold text-white">{r.customer_name}</td>
                            <td className="px-6 py-4 text-slate-400">{r.delivery_location}</td>
                            <td className="px-6 py-4 text-slate-400">{r.created_at.split('T')[0]}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(r.delivery_status)}`}>
                                {r.delivery_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button 
                                onClick={() => setViewingRecord(r)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setEditingRecord(r)}
                                className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERATE TRACKING CODE */}
          {activeTab === 'generate' && (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-6 sm:p-10">
              <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-2">Create New Shipment & Tracking Code</h2>
                  <p className="text-sm text-slate-400">
                    Fill in the customer and package information below. A unique tracking code (TRK-2026-XXXXXXXX) will be automatically generated.
                  </p>
                </div>

                {successMessage && generatedResult && (
                  <div className="mb-8 bg-emerald-500/15 border border-emerald-500/30 p-6 rounded-2xl">
                    <div className="flex items-center space-x-3 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span className="font-bold text-emerald-300 text-lg">{successMessage}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block mb-1">Generated Tracking Code</span>
                        <span className="text-2xl font-mono font-extrabold text-white">{generatedResult.tracking_code}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyToClipboard(generatedResult.tracking_code)}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center space-x-2 transition"
                        >
                          {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                        </button>
                        <a
                          href={`/?code=${generatedResult.tracking_code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm flex items-center space-x-2 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Test on Portal</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleGenerateCode} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Customer Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.customer_name}
                        onChange={e => setFormData({...formData, customer_name: e.target.value})}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Customer Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.customer_phone}
                        onChange={e => setFormData({...formData, customer_phone: e.target.value})}
                        placeholder="+1 (555) 987-6543"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Customer Email Address</label>
                      <input
                        type="email"
                        value={formData.customer_email}
                        onChange={e => setFormData({...formData, customer_email: e.target.value})}
                        placeholder="john.doe@example.com"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Delivery Destination Location *</label>
                      <input
                        type="text"
                        required
                        value={formData.delivery_location}
                        onChange={e => setFormData({...formData, delivery_location: e.target.value})}
                        placeholder="London, UK or Tokyo, Japan"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Full Delivery Address</label>
                    <textarea
                      rows={2}
                      value={formData.delivery_address}
                      onChange={e => setFormData({...formData, delivery_address: e.target.value})}
                      placeholder="123 Baker Street, Apt 2B, London NW1 6XE"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Package Description *</label>
                      <input
                        type="text"
                        required
                        value={formData.package_description}
                        onChange={e => setFormData({...formData, package_description: e.target.value})}
                        placeholder="MacBook Pro & Documents"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Package Weight</label>
                      <input
                        type="text"
                        value={formData.package_weight}
                        onChange={e => setFormData({...formData, package_weight: e.target.value})}
                        placeholder="2.1 kg"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Package Declared Value</label>
                      <input
                        type="text"
                        value={formData.package_value}
                        onChange={e => setFormData({...formData, package_value: e.target.value})}
                        placeholder="$1,200.00"
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Date Registered</label>
                      <input
                        type="date"
                        value={formData.date_registered}
                        onChange={e => setFormData({...formData, date_registered: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Estimated Delivery Date</label>
                      <input
                        type="date"
                        value={formData.estimated_delivery_date}
                        onChange={e => setFormData({...formData, estimated_delivery_date: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Initial Delivery Status</label>
                      <select
                        value={formData.delivery_status}
                        onChange={e => setFormData({...formData, delivery_status: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {deliveryStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Courier Notes / Remarks</label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Package accepted at main sorting facility."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={generating}
                      className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-75 cursor-pointer"
                    >
                      {generating ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <PlusCircle className="w-5 h-5" />
                          <span>Generate Tracking Code & Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: ALL RECORDS & SEARCH */}
          {activeTab === 'records' && (
            <div className="space-y-6">
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by code, customer name, phone..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="text-sm text-slate-400">
                  Showing <span className="font-bold text-white">{filteredRecords.length}</span> of {allRecords.length} records
                </div>
              </div>

              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Tracking Code</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Destination</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No matching tracking records found.</td>
                        </tr>
                      ) : (
                        filteredRecords.map(r => (
                          <tr key={r.id} className="hover:bg-slate-850 transition">
                            <td className="px-6 py-4 font-mono font-bold text-blue-400">{r.tracking_code}</td>
                            <td className="px-6 py-4 font-semibold text-white">{r.customer_name}</td>
                            <td className="px-6 py-4 text-slate-400">{r.customer_phone}</td>
                            <td className="px-6 py-4 text-slate-400">{r.delivery_location}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(r.delivery_status)}`}>
                                {r.delivery_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button 
                                onClick={() => setViewingRecord(r)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setEditingRecord(r)}
                                className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDeletingId(r.id)}
                                className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* VIEW MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <div>
                <span className="text-xs font-bold uppercase text-blue-400 tracking-wider">Shipment Details</span>
                <h3 className="text-2xl font-extrabold text-white font-mono mt-1">{viewingRecord.tracking_code}</h3>
              </div>
              <button onClick={() => setViewingRecord(null)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Customer Name</span>
                  <span className="font-bold text-white text-base">{viewingRecord.customer_name}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Phone Number</span>
                  <span className="font-bold text-white text-base">{viewingRecord.customer_phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Delivery Destination</span>
                  <span className="font-bold text-white">{viewingRecord.delivery_location}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Current Status</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mt-1 ${getStatusColor(viewingRecord.delivery_status)}`}>
                    {viewingRecord.delivery_status}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block mb-1">Full Delivery Address</span>
                <span className="font-medium text-slate-200">{viewingRecord.delivery_address || 'N/A'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Package Description</span>
                  <span className="font-semibold text-white">{viewingRecord.package_description}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Weight / Value</span>
                  <span className="font-semibold text-white">{viewingRecord.package_weight} / {viewingRecord.package_value}</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Est. Delivery Date</span>
                  <span className="font-bold text-blue-400">{viewingRecord.estimated_delivery_date}</span>
                </div>
              </div>

              {viewingRecord.notes && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">Courier Remarks</span>
                  <p className="text-xs text-blue-300 leading-relaxed">{viewingRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => copyToClipboard(viewingRecord.tracking_code)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Tracking Code</span>
              </button>
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-xl font-extrabold text-white">Edit Shipment: {editingRecord.tracking_code}</h3>
              <button onClick={() => setEditingRecord(null)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editingRecord.customer_name}
                    onChange={e => setEditingRecord({...editingRecord, customer_name: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingRecord.customer_phone}
                    onChange={e => setEditingRecord({...editingRecord, customer_phone: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Delivery Destination</label>
                  <input
                    type="text"
                    value={editingRecord.delivery_location}
                    onChange={e => setEditingRecord({...editingRecord, delivery_location: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Delivery Status</label>
                  <select
                    value={editingRecord.delivery_status}
                    onChange={e => setEditingRecord({...editingRecord, delivery_status: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-blue-400"
                  >
                    {deliveryStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  value={editingRecord.delivery_address}
                  onChange={e => setEditingRecord({...editingRecord, delivery_address: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Package Description</label>
                  <input
                    type="text"
                    value={editingRecord.package_description}
                    onChange={e => setEditingRecord({...editingRecord, package_description: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Weight / Value</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={editingRecord.package_weight}
                      onChange={e => setEditingRecord({...editingRecord, package_weight: e.target.value})}
                      className="w-1/2 px-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    />
                    <input
                      type="text"
                      value={editingRecord.package_value}
                      onChange={e => setEditingRecord({...editingRecord, package_value: e.target.value})}
                      className="w-1/2 px-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Est. Delivery Date</label>
                  <input
                    type="date"
                    value={editingRecord.estimated_delivery_date}
                    onChange={e => setEditingRecord({...editingRecord, estimated_delivery_date: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Courier Remarks</label>
                <textarea
                  rows={2}
                  value={editingRecord.notes || ''}
                  onChange={e => setEditingRecord({...editingRecord, notes: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/15 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Tracking Record?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This action cannot be undone. The tracking code will be permanently removed and will no longer be valid on the customer tracking portal.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(deletingId)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
