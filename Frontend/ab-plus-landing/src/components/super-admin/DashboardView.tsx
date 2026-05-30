"use client";

import { useEffect, useState } from "react";
import { apiService, DashboardStats, ActivityLog } from "@/services/api";
import LabDetailModal from "./LabDetailModal";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock,
  RotateCw,
} from "lucide-react";
import { motion } from "framer-motion";

interface DashboardViewProps {
  onNavigateToLabs: () => void;
  onNavigateToUsers: () => void;
  onNavigateToLogs: () => void;
}

// Simple CountUp helper component to run count animation
function CountUp({ end, duration = 1.2 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function DashboardView({
  onNavigateToLabs,
  onNavigateToUsers,
  onNavigateToLogs,
}: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [modalFilterStatus, setModalFilterStatus] = useState<"active" | "suspended" | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, logsRes] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getActivityLogs({ page: 1, limit: 4 }),
      ]);
      setStats(statsRes);
      setRecentLogs(logsRes.results);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch dashboard metrics. Please reload.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openStatusModal = (status: "active" | "suspended") => {
    setModalFilterStatus(status);
    setDetailModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-400">
        <RotateCw className="animate-spin text-sky-500" size={36} />
        <span className="mt-4 font-semibold text-sm">Loading admin metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <div className="rounded-2xl bg-red-50 p-4 text-red-500 shadow-sm border border-red-100">
          <p className="font-semibold text-sm">{error}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-600 shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-sm backdrop-blur-md">
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-800 tracking-tight md:text-2xl">
            SaaS Overview Dashboard
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Real-time insight metrics across pathology tenants and users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            System Live & Healthy
          </span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {/* Total Labs */}
        <motion.div
          variants={itemVariants}
          onClick={onNavigateToLabs}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Labs</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-syne text-3xl font-extrabold text-slate-800 tracking-tight">
              <CountUp end={stats?.total_labs || 0} />
            </h3>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-sky-500">
              <TrendingUp size={12} />
              <span>{stats?.labs_trend}</span>
            </div>
          </div>
          {/* Subtle Glow Ring */}
          <div className="absolute inset-0 border border-transparent rounded-2xl group-hover:border-sky-400/20 pointer-events-none" />
        </motion.div>

        {/* Active Labs (Clickable Modal) */}
        <motion.div
          variants={itemVariants}
          onClick={() => openStatusModal("active")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Labs</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-syne text-3xl font-extrabold text-emerald-600 tracking-tight">
              <CountUp end={stats?.active_labs || 0} />
            </h3>
            <span className="mt-1 inline-block text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-200">
              Click to view summary
            </span>
          </div>
          {/* Subtle Glow Ring */}
          <div className="absolute inset-0 border border-transparent rounded-2xl group-hover:border-emerald-400/20 pointer-events-none" />
        </motion.div>

        {/* Inactive/Suspended Labs (Clickable Modal) */}
        <motion.div
          variants={itemVariants}
          onClick={() => openStatusModal("suspended")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md hover:shadow-amber-100/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inactive Labs</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-syne text-3xl font-extrabold text-amber-600 tracking-tight">
              <CountUp end={stats?.inactive_labs || 0} />
            </h3>
            <span className="mt-1 inline-block text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100/50 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-200">
              Click to view summary
            </span>
          </div>
          {/* Subtle Glow Ring */}
          <div className="absolute inset-0 border border-transparent rounded-2xl group-hover:border-amber-400/20 pointer-events-none" />
        </motion.div>

        {/* Total Users */}
        <motion.div
          variants={itemVariants}
          onClick={onNavigateToUsers}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-syne text-3xl font-extrabold text-slate-800 tracking-tight">
              <CountUp end={stats?.total_users || 0} />
            </h3>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-indigo-500">
              <TrendingUp size={12} />
              <span>{stats?.users_trend}</span>
            </div>
          </div>
          {/* Subtle Glow Ring */}
          <div className="absolute inset-0 border border-transparent rounded-2xl group-hover:border-indigo-400/20 pointer-events-none" />
        </motion.div>

        {/* Total Patient Entries */}
        <motion.div
          variants={itemVariants}
          className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Entries</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-syne text-3xl font-extrabold text-slate-800 tracking-tight">
              <CountUp end={stats?.total_patient_entries || 0} />
            </h3>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-sky-500">
              <TrendingUp size={12} />
              <span>{stats?.patients_trend}</span>
            </div>
          </div>
          {/* Subtle Glow Ring */}
          <div className="absolute inset-0 border border-transparent rounded-2xl group-hover:border-sky-400/20 pointer-events-none" />
        </motion.div>
      </motion.div>

      {/* Analytics Graph & Activity Log Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sparkline Graph Card */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-syne font-bold text-slate-800 text-sm">System Registration Curve</h4>
              <p className="text-xs text-slate-400 font-medium">Daily patient diagnostic entry volume</p>
            </div>
            <div className="flex items-center gap-1 bg-sky-50 text-sky-600 px-2 py-0.5 rounded-lg border border-sky-100/50 text-[10px] font-bold">
              <TrendingUp size={12} />
              <span>+14.2%</span>
            </div>
          </div>

          <div className="mt-6 flex h-48 items-end justify-between px-2">
            {/* Simple static SVG mockup representing high-end dashboard sparkline */}
            <svg className="w-full h-full text-sky-500/10" viewBox="0 0 100 35" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M0,35 L0,22 Q15,10 25,18 T50,8 T75,25 T100,5 L100,35 Z"
                fill="url(#gradient)"
              />
              <path
                d="M0,22 Q15,10 25,18 T50,8 T75,25 T100,5"
                fill="none"
                stroke="url(#gradient-line)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <linearGradient id="gradient-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </svg>
          </div>

          {/* Graph X labels */}
          <div className="mt-4 flex items-center justify-between px-2 text-[10px] font-semibold text-slate-400">
            <span>May 15</span>
            <span>May 16</span>
            <span>May 17</span>
            <span>May 18</span>
            <span>May 19</span>
            <span>May 20</span>
            <span>Today</span>
          </div>
        </div>

        {/* Recent Admin Activity Log Summary */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h4 className="font-syne font-bold text-slate-800 text-sm">Recent System Logs</h4>
            <button
              onClick={onNavigateToLogs}
              className="text-xs font-semibold text-sky-500 hover:text-sky-600 transition-colors"
            >
              See all
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-4">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-slate-400">
                  <Clock size={12} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-700">{log.action}</span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    • {log.user_email}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onNavigateToLogs}
            className="mt-6 w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all border-dashed"
          >
            Open Logs Panel
          </button>
        </div>
      </div>

      {/* Lightweight detail modal */}
      <LabDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        status={modalFilterStatus}
      />
    </div>
  );
}
