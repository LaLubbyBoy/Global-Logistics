/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Package, Search, ShieldCheck, Clock, MapPin, Phone, Mail, 
  Truck, CheckCircle2, AlertCircle, ArrowRight, Copy, Check, 
  ExternalLink, Globe, Headphones, Box, ChevronRight, Menu, X 
} from 'lucide-react';

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

const statusSteps = [
  'Registered',
  'Processing',
  'In Transit',
  'Out for Delivery',
  'Delivered'
];

export default function App() {
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check URL search params on load for ?code=TRK-...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setTrackingCodeInput(codeParam);
      handleTrack(codeParam);
    }
  }, []);

  const handleTrack = async (codeToSearch?: string) => {
    const code = (codeToSearch !== undefined ? codeToSearch : trackingCodeInput).trim();
    if (!code) {
      setError('Please enter a valid tracking code.');
      setRecord(null);
      return;
    }

    setLoading(true);
    setError(null);
    setRecord(null);

    try {
      const res = await fetch(`/api/track/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Tracking code not found.');
      }
      setRecord(data.record);
      // Update browser URL without reload
      window.history.replaceState({}, '', `?code=${code}`);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve tracking information.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Transit':
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Processing':
      case 'Registered':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'On Hold':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getCurrentStepIndex = (status: string) => {
    if (status === 'Delivered') return 4;
    if (status === 'Out for Delivery') return 3;
    if (status === 'In Transit') return 2;
    if (status === 'Processing') return 1;
    if (status === 'Registered') return 0;
    return -1; // On Hold or Cancelled
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setRecord(null); setTrackingCodeInput(''); window.history.replaceState({}, '', window.location.pathname); }}>
            <div className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">Global Express</span>
              <span className="block text-xs font-medium text-blue-600 uppercase tracking-widest">Logistics & Courier</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-sm font-semibold text-blue-600 transition hover:text-blue-700">Track Package</a>
            <a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-blue-600">Services</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-blue-600">How It Works</a>
            <a href="#support" className="text-sm font-medium text-slate-600 transition hover:text-blue-600">Support</a>
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <a 
              href="#track-section" 
              onClick={() => {
                const el = document.getElementById('track-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/30 transition"
            >
              Track Now
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-3">
            <a href="#" className="block py-2 text-base font-medium text-blue-600">Track Package</a>
            <a href="#features" className="block py-2 text-base font-medium text-slate-600" onClick={() => setMobileMenuOpen(false)}>Services</a>
            <a href="#how-it-works" className="block py-2 text-base font-medium text-slate-600" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#support" className="block py-2 text-base font-medium text-slate-600" onClick={() => setMobileMenuOpen(false)}>Support</a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900 text-white py-20 lg:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-800/80 border border-blue-500/30 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-6 backdrop-blur-sm">
            <Globe className="w-3.5 h-3.5" />
            <span>Global Logistics Network</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            Track Your Package in Real-Time
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto font-normal">
            Enter your unique tracking code below to instantly retrieve live delivery updates, courier location, and estimated arrival times.
          </p>

          {/* Tracking Input Card */}
          <div id="track-section" className="bg-white p-3 sm:p-4 rounded-2xl shadow-2xl max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                placeholder="Enter tracking code (e.g. TRK-2026-94821037)"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition text-base"
              />
            </div>
            <button
              onClick={() => handleTrack()}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-75 cursor-pointer"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Track Package</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Sample code helper */}
          <div className="mt-4 text-xs text-blue-200 flex items-center justify-center space-x-2">
            <span>Sample code:</span>
            <button 
              onClick={() => { setTrackingCodeInput('TRK-2026-94821037'); handleTrack('TRK-2026-94821037'); }} 
              className="underline hover:text-white font-semibold"
            >
              TRK-2026-94821037
            </button>
          </div>
        </div>
      </section>

      {/* Main Results or Default Information Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-20">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl shadow-lg flex items-start space-x-4 mb-8">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg mb-1">Tracking Not Found</h3>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {record && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header banner of tracking result */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Shipment Details</span>
                <div className="flex items-center space-x-3 mt-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{record.tracking_code}</h2>
                  <button 
                    onClick={() => copyToClipboard(record.tracking_code)} 
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-200 transition"
                    title="Copy Tracking Code"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(record.delivery_status)}`}>
                  {record.delivery_status}
                </span>
              </div>
            </div>

            {/* Visual Delivery Progress Tracker */}
            {record.delivery_status !== 'Cancelled' && record.delivery_status !== 'On Hold' && (
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">Delivery Progress</h4>
                <div className="relative">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 hidden sm:block"></div>
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 transition-all duration-500 hidden sm:block"
                    style={{ width: `${(getCurrentStepIndex(record.delivery_status) / (statusSteps.length - 1)) * 100}%` }}
                  ></div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
                    {statusSteps.map((step, idx) => {
                      const currentIndex = getCurrentStepIndex(record.delivery_status);
                      const isComplete = idx <= currentIndex;
                      const isCurrent = idx === currentIndex;

                      return (
                        <div key={step} className="flex flex-col items-center text-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition shadow-sm ${
                            isCurrent 
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' 
                              : isComplete 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-white text-slate-400 border border-slate-300'
                          }`}>
                            {isComplete ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                          </div>
                          <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-600 font-bold' : isComplete ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Shipment & Route Info */}
              <div className="space-y-6">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span>Package & Route Information</span>
                </h3>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Package Description</span>
                    <span className="font-semibold text-slate-900 text-right">{record.package_description}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Package Weight</span>
                    <span className="font-semibold text-slate-900">{record.package_weight}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Declared Value</span>
                    <span className="font-semibold text-slate-900">{record.package_value}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Destination Hub</span>
                    <span className="font-semibold text-slate-900 flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span>{record.delivery_location}</span>
                    </span>
                  </div>
                  <div className="py-2">
                    <span className="text-slate-500 font-medium block mb-1">Delivery Address</span>
                    <span className="font-medium text-slate-900 bg-slate-50 p-3 rounded-xl block border border-slate-200">
                      {record.delivery_address || 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Customer & Timeline Info */}
              <div className="space-y-6">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Timeline & Recipient</span>
                </h3>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Customer Name</span>
                    <span className="font-semibold text-slate-900">{record.customer_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Phone Number</span>
                    <span className="font-semibold text-slate-900">{record.customer_phone}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Date Registered</span>
                    <span className="font-semibold text-slate-900">{record.date_registered}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Estimated Delivery Date</span>
                    <span className="font-bold text-blue-600">{record.estimated_delivery_date}</span>
                  </div>
                  {record.notes && (
                    <div className="py-2">
                      <span className="text-slate-500 font-medium block mb-1">Courier Notes / Status Remarks</span>
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-900 text-xs leading-relaxed">
                        {record.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Section */}
        {!record && (
          <div id="how-it-works" className="my-16">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">How Our Tracking Works</h2>
              <p className="text-slate-600">Experience seamless end-to-end transparency with our advanced global tracking system.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center hover:shadow-md transition">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-extrabold shadow-inner">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Enter Tracking Number</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Locate your tracking code (format: TRK-2026-XXXXXXXX) provided in your shipping confirmation email or receipt.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center hover:shadow-md transition">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-extrabold shadow-inner">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Real-Time Status Updates</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Instantly view live checkpoints, package location, weight, value, and estimated delivery dates.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center hover:shadow-md transition">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-extrabold shadow-inner">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Secure Delivery</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Receive your parcel safely at your destination address with signature verification and status notifications.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Features / Services Section */}
        <div id="features" className="my-16 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2 block">Enterprise Logistics</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
                Fast, Reliable & Secure Global Shipping Solutions
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Global Express connects businesses and individuals across 220+ countries with state-of-the-art air and ground freight networks. Our platform ensures maximum accountability and real-time visibility for every consignment.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Express Air & Ocean Freight</h4>
                    <p className="text-slate-600 text-xs">Priority dispatch and expedited customs clearance.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">End-to-End Insurance</h4>
                    <p className="text-slate-600 text-xs">Full coverage protection for high-value packages.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">24/7 Dedicated Support</h4>
                    <p className="text-slate-600 text-xs">Expert customer service representatives ready to assist you.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-tr from-blue-900 to-indigo-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <Box className="w-64 h-64" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Need to Ship a Package?</h3>
              <p className="text-blue-100 text-sm mb-8 leading-relaxed">
                Contact our sales and logistics team today to set up business shipping accounts or schedule a pickup.
              </p>
              <div className="space-y-4 text-sm font-medium">
                <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <Phone className="w-5 h-5 text-blue-300" />
                  <span>+1 (800) 555-GLOBAL</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <Mail className="w-5 h-5 text-blue-300" />
                  <span>support@globalexpress.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer id="support" className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white">Global Express</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Your trusted global partner for fast, secure, and transparent package delivery and freight logistics.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition">Track Package</a></li>
              <li><a href="#features" className="hover:text-white transition">Services & Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Support & Help</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition">Shipping FAQ</a></li>
              <li><a href="#" className="hover:text-white transition">Customs Clearance</a></li>
              <li><a href="#" className="hover:text-white transition">Claims & Insurance</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Global Headquarters</h4>
            <p className="text-sm text-slate-400 mb-2">100 Logistics Parkway, Suite 500</p>
            <p className="text-sm text-slate-400 mb-4">New York, NY 10001, USA</p>
            <p className="text-sm text-blue-400 font-semibold">+1 (800) 555-GLOBAL</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Global Express Logistics Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
