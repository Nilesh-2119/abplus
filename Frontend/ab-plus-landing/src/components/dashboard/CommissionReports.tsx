"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiService } from "@/services/api";
import { useIntervalRefetch } from "@/hooks/useIntervalRefetch";
import {
  Percent,
  Users,
  TrendingUp,
  Clock,
  Search,
  Printer,
  ChevronRight,
  User,
  Building,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  X,
  DollarSign,
  Activity,
  Info,
  RefreshCw,
  Stethoscope,
  FileText,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CommissionReportsProps {
  labId: string;
  currentRole: string;
}

interface Stats {
  total_earned: number;
  doctors_count: number;
  pending_commission: number;
  top_doctor: {
    id: string;
    name: string;
    hospital: string;
    total_commission: number;
    patient_count: number;
  } | null;
}

interface DoctorSummary {
  doctor_id: string;
  doctor_name: string;
  hospital_name: string;
  patient_count: number;
  total_revenue: number;
  total_commission: number;
  unpaid_commission: number;
  paid_commission: number;
}

export default function CommissionReports({ labId }: CommissionReportsProps) {
  const [stats, setStats] = useState<Stats>({
    total_earned: 0,
    doctors_count: 0,
    pending_commission: 0,
    top_doctor: null
  });
  
  const [reports, setReports] = useState<DoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Filter States
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [searchDoctor, setSearchDoctor] = useState("");

  // Drilldown Detail State
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    doctor_id: string;
    doctor_name: string;
    hospital_name: string;
    summary: {
      total_revenue: number;
      total_commission: number;
      unpaid_commission: number;
      paid_commission: number;
      patient_count: number;
    };
    entries: Array<{
      id: string;
      patient_id: string;
      patient_name: string;
      patient_code: string;
      test_id: string;
      test_name: string;
      test_price: number;
      commission_percentage: number;
      commission_amount: number;
      entry_date: string;
      is_paid: boolean;
      created_at: string;
    }>;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Settlement Confirm Modal
  const [settlementConfirm, setSettlementConfirm] = useState<{
    doctorId: string;
    doctorName: string;
  } | null>(null);
  const [settling, setSettling] = useState(false);

  // Report Generation Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'consolidated' | 'doctor_wise'>('consolidated');
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportDoctorId, setReportDoctorId] = useState('');
  const [reportIncludePatients, setReportIncludePatients] = useState(false);
  const [reportDateError, setReportDateError] = useState('');
  const [doctorsList, setDoctorsList] = useState<Array<{id: string; doctor_name: string; hospital_name: string}>>([]);
  const [reportGenerating, setReportGenerating] = useState(false);

  // Load Main Dashboard Data
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const statsData = await apiService.getCommissionDashboardStats(labId);
      setStats(statsData);
      
      const reportsData = await apiService.getCommissionReports(
        labId,
        selectedMonth,
        selectedYear
      );
      setReports(reportsData);
      if (!isBackground) setErrorMsg("");
    } catch (e) {
      console.error(e);
      if (!isBackground) setErrorMsg("Failed to load doctor commission information.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [labId, selectedMonth, selectedYear]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  useIntervalRefetch(() => loadData(true), 5000);

  // Load Doctor Details
  const loadDoctorDetail = async (doctorId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await apiService.getDoctorCommissionDetail(
        labId,
        doctorId,
        selectedMonth,
        selectedYear
      );
      setDetailData(detail);
      setSelectedDoctorId(doctorId);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to load details for this doctor.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Perform Settlement Payout
  const handleSettlePayout = async () => {
    if (!settlementConfirm) return;
    setSettling(true);
    try {
      await apiService.settleDoctorCommission(
        labId,
        settlementConfirm.doctorId,
        selectedMonth,
        selectedYear
      );
      setSettlementConfirm(null);
      // Reload detail if open
      if (selectedDoctorId === settlementConfirm.doctorId) {
        await loadDoctorDetail(settlementConfirm.doctorId);
      }
      // Reload main stats & summary
      await loadData();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to complete payout settlement.");
    } finally {
      setSettling(false);
    }
  };

  // Load doctors list for report modal
  const loadDoctorsList = async () => {
    try {
      const doctors = await apiService.getReferredDoctors(labId);
      setDoctorsList(doctors.map((d: any) => ({ id: d.id, doctor_name: d.doctor_name, hospital_name: d.hospital_name })));
    } catch (e) {
      console.error('Failed to load doctors for report modal', e);
    }
  };

  // Handle report generation
  const handleGenerateReport = () => {
    if (!reportFromDate || !reportToDate) {
      setReportDateError('Both From Date and To Date are required.');
      return;
    }
    if (reportFromDate > reportToDate) {
      setReportDateError('From Date cannot be greater than To Date.');
      return;
    }
    if (reportType === 'doctor_wise' && !reportDoctorId) {
      setReportDateError('Please select a doctor for Doctor Wise report.');
      return;
    }
    setReportDateError('');
    const params = new URLSearchParams({
      type: reportType,
      from: reportFromDate,
      to: reportToDate,
      lab_id: labId,
    });
    if (reportType === 'doctor_wise') {
      params.set('doctor_id', reportDoctorId);
      if (reportIncludePatients) params.set('include_patients', 'true');
    }
    window.open(`/commission-report?${params.toString()}`, '_blank');
    setShowReportModal(false);
  };

  // Print Report Helper
  const handlePrintReport = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Filtered reports list (by search bar)
  const filteredReports = reports.filter(r =>
    r.doctor_name.toLowerCase().includes(searchDoctor.toLowerCase()) ||
    r.hospital_name.toLowerCase().includes(searchDoctor.toLowerCase())
  );

  const months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];

  const years = [selectedYear - 1, selectedYear, selectedYear + 1];

  return (
    <div className="space-y-6">
      {/* Printable Report View (Invisible in screen mode, visible in print) */}
      {detailData && (
        <div className="hidden print:block bg-white text-slate-900 p-8 space-y-6 font-sans">
          <div className="flex justify-between items-start border-b border-slate-300 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AB+ Diagnostics</h1>
              <p className="text-sm text-slate-500 font-medium">Doctor Commission Payout Summary</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p className="font-bold">Period: {months.find(m => m.value === selectedMonth)?.name} {selectedYear}</p>
              <p className="mt-1">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referring Doctor</h2>
              <p className="text-lg font-bold text-slate-800 mt-1">{detailData.doctor_name}</p>
              <p className="text-sm text-slate-500 mt-0.5">{detailData.hospital_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referred Patients</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{detailData.summary.patient_count}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Commission</p>
                <p className="text-lg font-bold text-slate-800 mt-1">₹{detailData.summary.total_commission.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse text-left border border-slate-200 rounded-xl overflow-hidden mt-6 text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-3 font-bold text-slate-700">Patient</th>
                <th className="p-3 font-bold text-slate-700">Test Referrals</th>
                <th className="p-3 font-bold text-slate-700 text-right">Price</th>
                <th className="p-3 font-bold text-slate-700 text-center">Comm %</th>
                <th className="p-3 font-bold text-slate-700 text-right">Earned</th>
                <th className="p-3 font-bold text-slate-700 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailData.entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{entry.patient_name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{entry.patient_code}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800">{entry.test_name}</p>
                  </td>
                  <td className="p-3 text-right">₹{entry.test_price.toFixed(2)}</td>
                  <td className="p-3 text-center font-mono">{entry.commission_percentage}%</td>
                  <td className="p-3 text-right font-bold text-slate-800">₹{entry.commission_amount.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      entry.is_paid ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {entry.is_paid ? "Paid" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-slate-300 pt-6 mt-12 flex justify-between">
            <div className="text-slate-400 text-xs">
              <p>Generated via AB+ Laboratory Platform</p>
              <p className="mt-1">Tenant ID: {labId}</p>
            </div>
            <div className="w-64 space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>Total Settled:</span>
                <span className="font-bold text-emerald-600">₹{detailData.summary.paid_commission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span>Total Owed:</span>
                <span className="font-bold text-amber-600">₹{detailData.summary.unpaid_commission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t border-slate-300">
                <span>Total Commission:</span>
                <span>₹{detailData.summary.total_commission.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-around items-center pt-24 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <div className="border-t border-slate-300 pt-3 w-48 text-center">Lab Administrator</div>
            <div className="border-t border-slate-300 pt-3 w-48 text-center">Receiving Doctor</div>
          </div>
        </div>
      )}

      {/* Screen Mode Layout (Print hidden) */}
      <div className="print:hidden space-y-6">
        
        {/* ── ERROR DISPLAY MESSAGE ── */}
        {errorMsg && (
          <div className="flex items-center justify-between gap-2 p-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Dynamic Navigation/Header Details */}
        <AnimatePresence mode="wait">
          {!selectedDoctorId ? (
            <motion.div
              key="main-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* ── Stats Dashboard Cards ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Monthly Earnings Card */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Commission Earned</span>
                      <span className="text-2xl font-black text-slate-800 mt-1 block">₹{stats.total_earned.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-3 bg-cyan-50 text-cyan-500 rounded-xl border border-cyan-100/50 shadow-sm flex items-center justify-center">
                      <Percent size={18} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-4.5 text-[11px] font-bold text-slate-400">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Calculated for this current month</span>
                  </div>
                </div>

                {/* Total Referring Doctors Card */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Active Referrals</span>
                      <span className="text-2xl font-black text-slate-800 mt-1 block">{stats.doctors_count} Doctors</span>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-500 rounded-xl border border-purple-100/50 shadow-sm flex items-center justify-center">
                      <Users size={18} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-4.5 text-[11px] font-bold text-slate-400">
                    <Activity size={13} className="text-purple-400" />
                    <span>Referring patients this month</span>
                  </div>
                </div>

                {/* Pending Payout Commission Card */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Pending Payouts</span>
                      <span className={`text-2xl font-black mt-1 block ${stats.pending_commission > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        ₹{stats.pending_commission.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-500 rounded-xl border border-amber-100/50 shadow-sm flex items-center justify-center">
                      <Clock size={18} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-4.5 text-[11px] font-bold text-slate-400">
                    <Info size={13} className="text-amber-400" />
                    <span>Accumulated across all periods</span>
                  </div>
                </div>

                {/* Top Referring Doctor Card */}
                <div className="relative overflow-hidden bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  {stats.top_doctor ? (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Top Referred Doctor</span>
                          <span className="text-[14px] font-black text-slate-800 mt-1 block truncate" title={stats.top_doctor.name}>{stats.top_doctor.name}</span>
                          <span className="text-[10px] text-slate-400 font-extrabold block truncate mt-0.5">{stats.top_doctor.hospital}</span>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl border border-emerald-100/50 shadow-sm flex items-center justify-center flex-shrink-0 ml-2">
                          <TrendingUp size={18} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 text-[11px] font-bold text-slate-500">
                        <span>Patients: <b className="text-slate-800">{stats.top_doctor.patient_count}</b></span>
                        <span className="text-emerald-600 font-black">₹{stats.top_doctor.total_commission.toFixed(0)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-center text-slate-400 py-4">
                      <TrendingUp size={24} className="text-slate-300 mb-1" />
                      <span className="text-xs font-bold">No referrals logged yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Filters and Search Control Bar ── */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm justify-between">
                {/* Search Autocomplete doctor */}
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search doctor reports by name or clinic..."
                    value={searchDoctor}
                    onChange={(e) => setSearchDoctor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold bg-slate-50/50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-700 placeholder-slate-400 transition-all"
                  />
                </div>

                {/* Period Select Fields */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="flex items-center gap-1 bg-slate-50/80 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-inner">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer p-1 py-1.5"
                    >
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.name}</option>
                      ))}
                    </select>

                    <span className="text-slate-300 font-bold px-1">/</span>

                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer p-1 py-1.5"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Generate Report Button */}
                  <button
                    onClick={() => {
                      loadDoctorsList();
                      setShowReportModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-500/10 px-4 py-2.5 text-xs font-black text-white transition-all cursor-pointer shadow-sm"
                  >
                    <FileText size={14} />
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>

              {/* ── Summary Reports Table ── */}
              {loading ? (
                <div className="flex h-64 items-center justify-center text-slate-400 bg-white/70 border border-slate-200/80 rounded-2xl shadow-sm">
                  <RefreshCw size={22} className="animate-spin text-cyan-500" />
                  <span className="ml-3 font-semibold text-sm">Generating monthly payouts summary...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
                  <AlertCircle size={36} className="text-slate-300 mb-3" />
                  <h3 className="text-sm font-black text-slate-700">No Commission Data</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1 max-w-sm">
                    No doctor commission entries match the selected period ({months.find(m => m.value === selectedMonth)?.name} {selectedYear}).
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Doctor Details</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Patient Count</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Referral Billing</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Total Comm.</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Paid</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Unpaid (Owed)</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReports.map((r) => (
                        <tr key={r.doctor_id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-500 shadow-sm flex-shrink-0">
                                <Stethoscope size={16} />
                              </div>
                              <div>
                                <span className="text-sm font-black text-slate-800 block">{r.doctor_name}</span>
                                <span className="text-xs font-bold text-slate-400 block mt-0.5 flex items-center gap-1">
                                  <Building size={11} /> {r.hospital_name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                              {r.patient_count}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-sm font-bold text-slate-700">₹{r.total_revenue.toFixed(2)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-sm font-black text-slate-800">₹{r.total_commission.toFixed(2)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-xs font-bold text-emerald-600">₹{r.paid_commission.toFixed(2)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`text-sm font-black ${r.unpaid_commission > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              ₹{r.unpaid_commission.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => loadDoctorDetail(r.doctor_id)}
                                className="p-1.5.px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-black text-slate-600 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span>Details</span>
                                <ChevronRight size={13} />
                              </button>
                              {r.unpaid_commission > 0 && (
                                <button
                                  onClick={() => setSettlementConfirm({
                                    doctorId: r.doctor_id,
                                    doctorName: r.doctor_name
                                  })}
                                  className="p-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/10 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-sm"
                                  title="Mark as Paid/Settled"
                                >
                                  Settle
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── Doctor Commission Drilldown Profile View ── */
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Profile Header Block */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSelectedDoctorId(null);
                      setDetailData(null);
                    }}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-syne text-lg font-extrabold text-slate-800">{detailData?.doctor_name}</h2>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 border border-slate-200/50 rounded-md">
                        Detail breakdown
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Building size={12} /> {detailData?.hospital_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={handlePrintReport}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print Report</span>
                  </button>
                  {detailData && detailData.summary.unpaid_commission > 0 && (
                    <button
                      onClick={() => setSettlementConfirm({
                        doctorId: detailData.doctor_id,
                        doctorName: detailData.doctor_name
                      })}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 px-4 text-xs font-black text-white shadow-sm shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer animate-pulse"
                    >
                      <CheckCircle size={14} />
                      <span>Settle Payout (₹{detailData.summary.unpaid_commission.toFixed(0)})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Monthly totals overview grid */}
              {detailData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Patients Count Detail */}
                  <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4.5 shadow-sm">
                    <div className="h-10 w-10 bg-cyan-50 border border-cyan-100 rounded-lg text-cyan-500 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Patient Referrals</span>
                      <span className="text-xl font-black text-slate-800 mt-0.5 block">{detailData.summary.patient_count}</span>
                    </div>
                  </div>

                  {/* Revenue billing generated */}
                  <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4.5 shadow-sm">
                    <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500 flex items-center justify-center">
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Referrals Price</span>
                      <span className="text-xl font-black text-slate-800 mt-0.5 block">₹{detailData.summary.total_revenue.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Commission amount total */}
                  <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4.5 shadow-sm">
                    <div className="h-10 w-10 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-500 flex items-center justify-center">
                      <Percent size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Commission</span>
                      <span className="text-xl font-black text-slate-800 mt-0.5 block">₹{detailData.summary.total_commission.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Settlement payout status breakdown */}
                  <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4.5 shadow-sm">
                    <div className="h-10 w-10 bg-amber-50 border border-amber-100 rounded-lg text-amber-500 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Paid vs Owed</span>
                      <span className="text-sm font-black text-slate-800 mt-0.5 block flex items-center gap-1.5">
                        <span className="text-emerald-600">₹{detailData.summary.paid_commission.toFixed(0)}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-amber-600">₹{detailData.summary.unpaid_commission.toFixed(0)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient and Referral detailed logs table */}
              {loadingDetail ? (
                <div className="flex h-64 items-center justify-center text-slate-400 bg-white/70 border border-slate-200/80 rounded-2xl shadow-sm">
                  <RefreshCw size={22} className="animate-spin text-cyan-500" />
                  <span className="ml-3 font-semibold text-sm">Loading historical commission breakdown...</span>
                </div>
              ) : !detailData || detailData.entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-center">
                  <AlertCircle size={36} className="text-slate-300 mb-3" />
                  <h3 className="text-sm font-black text-slate-700">No Patient Transactions</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    There are no patient transactions associated with this doctor in the filtered period.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Patient Info</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Test Referrals</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Test Price</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Comm. Snap %</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Amount Earned</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Entry Date</th>
                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailData.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 border border-slate-150 text-slate-500">
                                <User size={13} />
                              </div>
                              <div>
                                <span className="text-xs font-black text-slate-800 block">{entry.patient_name}</span>
                                <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 block">{entry.patient_code}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-700">{entry.test_name}</td>
                          <td className="p-4 text-right text-xs font-bold text-slate-700">₹{entry.test_price.toFixed(2)}</td>
                          <td className="p-4 text-center text-xs font-bold text-slate-600 font-mono">{entry.commission_percentage}%</td>
                          <td className="p-4 text-right text-xs font-black text-slate-800">₹{entry.commission_amount.toFixed(2)}</td>
                          <td className="p-4 text-xs font-bold text-slate-500">{entry.entry_date}</td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border transition-all ${
                              entry.is_paid
                                ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                : "bg-amber-50 border-amber-100 text-amber-600"
                            }`}>
                              {entry.is_paid ? "Paid" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modal: Settlement Confirmation Payout ── */}
      <AnimatePresence>
        {settlementConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettlementConfirm(null)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-50 text-slate-800"
            >
              <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle size={22} />
                </div>
                <div>
                  <h3 className="font-syne text-sm font-extrabold">Confirm Commission Payout</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                    Period: {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 bg-slate-50 border border-slate-200/50 p-4 rounded-xl text-xs font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>Referring Doctor:</span>
                  <span className="text-slate-800 font-black">{settlementConfirm.doctorName}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <span>Action Summary:</span>
                  <span className="text-slate-800 font-black">Mark all pending entries for this doctor as Paid.</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 mt-6">
                <button
                  onClick={() => setSettlementConfirm(null)}
                  disabled={settling}
                  className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 text-xs font-black text-slate-500 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettlePayout}
                  disabled={settling}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/10 py-2.5 text-xs font-black text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {settling ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <span>Confirm Settlement</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Generate Commission Report ── */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-50 text-slate-800"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-teal-600">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="font-syne text-sm font-extrabold text-slate-800">Generate Commission Report</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">Configure and generate a downloadable report</p>
                </div>
                <button onClick={() => setShowReportModal(false)} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Report Type Radio */}
              <div className="space-y-3 mb-5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">Report Type</label>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      reportType === 'consolidated'
                        ? 'border-teal-400 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => { setReportType('consolidated'); setReportDoctorId(''); setReportIncludePatients(false); }}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      reportType === 'consolidated' ? 'border-teal-500' : 'border-slate-300'
                    }`}>
                      {reportType === 'consolidated' && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                    </div>
                    <span className="text-xs font-black text-slate-700">Consolidated Report</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      reportType === 'doctor_wise'
                        ? 'border-teal-400 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setReportType('doctor_wise')}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      reportType === 'doctor_wise' ? 'border-teal-500' : 'border-slate-300'
                    }`}>
                      {reportType === 'doctor_wise' && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                    </div>
                    <span className="text-xs font-black text-slate-700">Doctor Wise Report</span>
                  </label>
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => { setReportFromDate(e.target.value); setReportDateError(''); }}
                    className="w-full px-3 py-2.5 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(e) => { setReportToDate(e.target.value); setReportDateError(''); }}
                    className="w-full px-3 py-2.5 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                  />
                </div>
              </div>

              {/* Doctor Selection (Doctor Wise only) */}
              {reportType === 'doctor_wise' && (
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">Select Doctor</label>
                    <select
                      value={reportDoctorId}
                      onChange={(e) => setReportDoctorId(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 cursor-pointer"
                    >
                      <option value="">Choose a referring doctor...</option>
                      {doctorsList.map(d => (
                        <option key={d.id} value={d.id}>{d.doctor_name} — {d.hospital_name}</option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={reportIncludePatients}
                      onChange={(e) => setReportIncludePatients(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500/20 cursor-pointer"
                    />
                    <span className="text-xs font-black text-slate-700">Include Patient Details</span>
                  </label>
                </div>
              )}

              {/* Date Validation Error */}
              {reportDateError && (
                <div className="flex items-center gap-2 p-3 mb-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle size={14} />
                  <span>{reportDateError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 text-xs font-black text-slate-500 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={reportGenerating}
                  className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-500/10 py-2.5 text-xs font-black text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText size={14} />
                  <span>Generate Report</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
