"use client";

import { useEffect, useState } from "react";
import { apiService, LabDashboardStats, Expense, DailyCloseout } from "@/services/api";
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  Calendar,
  IndianRupee,
  FileText,
  Vault,
  ArrowDownToLine,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

interface OverviewProps {
  labId: string;
  currentRole: string;
  labCode?: string;
}

export default function DashboardOverview({ labId, currentRole, labCode }: OverviewProps) {
  // Date State - Defaults to today's date
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LabDashboardStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const fetchStatsAndExpenses = async (dateStr: string) => {
    setLoading(true);
    try {
      const [dashboardStats, dailyExpenses] = await Promise.all([
        apiService.getLabDashboardStats(labId, dateStr),
        apiService.getExpenses(labId, dateStr),
      ]);
      setStats(dashboardStats);
      setExpenses(dailyExpenses);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndExpenses(selectedDate);
  }, [labId, selectedDate]);

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="ml-3 font-semibold text-xs">Loading analytics...</span>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  const totalExpensesToday = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Top stat cards (first row — 4 cards)
  const topCards = [
    {
      id: "today_patients",
      title: "Today's Patients",
      value: stats?.today_patients ?? 0,
      icon: Users,
      desc: "Patient entries created on this date",
      gradient: "from-cyan-500 to-blue-500",
      iconCls: "text-cyan-600 bg-cyan-50",
      isCurrency: false,
    },
    {
      id: "pending_reports",
      title: "Pending Reports",
      value: stats?.pending_reports ?? 0,
      icon: AlertCircle,
      desc: "Patients with incomplete reports",
      gradient: "from-amber-400 to-orange-500",
      iconCls: "text-amber-600 bg-amber-50",
      isCurrency: false,
    },
    {
      id: "pending_balance",
      title: "Pending Balance",
      value: stats?.pending_balance ?? 0,
      icon: IndianRupee,
      desc: "Total unpaid patient receivables till this date",
      gradient: "from-purple-500 to-pink-500",
      iconCls: "text-purple-600 bg-purple-50",
      isCurrency: true,
    },
    {
      id: "daily_expenses",
      title: "Today's Expenses",
      value: stats?.daily_expenses ?? totalExpensesToday,
      icon: TrendingDown,
      desc: "Total lab expenses for this date",
      gradient: "from-rose-500 to-red-600",
      iconCls: "text-rose-600 bg-rose-50",
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 border border-slate-200/80 p-4 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="font-syne text-[14px] font-extrabold text-slate-800">Workspace Dashboard</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              Lab ID: {labId}
            </span>
            {labCode && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">Staff Code:</span>
                <span className="text-[10px] font-black bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2.5 py-0.5 rounded-lg shadow-sm tracking-wider uppercase select-all">
                  {labCode}
                </span>
              </>
            )}
            <span className="text-slate-300">•</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              Date Analytics
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={15} className="text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            onClick={() => fetchStatsAndExpenses(selectedDate)}
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors border border-slate-100 bg-slate-50/50"
            title="Refresh statistics"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Top 4 Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 h-24 w-24 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-[0.04] rounded-full blur-xl transition-all duration-500`} />
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {card.title}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-800 mt-1">
                    {card.isCurrency ? formatCurrency(card.value as number) : card.value}
                  </h3>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconCls} shadow-inner`}>
                  <Icon size={16} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-3">{card.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Cash Vault Section (2 cards side by side) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card: Cash Available in Vault */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl p-6 shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-xl p-2">
                  <Vault size={18} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
                  Cash Available in Vault
                </span>
              </div>
            </div>
            <div className="mt-1">
              <span className="text-3xl font-black tracking-tight">
                {formatCurrency(stats?.cash_available_in_vault ?? 0)}
              </span>
            </div>
            <p className="text-[10px] text-emerald-100 font-semibold mt-3 flex items-center gap-1">
              <Wallet size={11} />
              Total cash with cashier not yet handed to lab admin
            </p>
          </div>
        </motion.div>

        {/* Card: Received from Cashier Today */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative overflow-hidden rounded-2xl p-6 shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-xl p-2">
                  <ArrowDownToLine size={18} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">
                  Received from Cashier
                </span>
              </div>
            </div>
            <div className="mt-1">
              <span className="text-3xl font-black tracking-tight">
                {formatCurrency(stats?.received_from_cashier_today ?? 0)}
              </span>
            </div>
            <p className="text-[10px] text-blue-100 font-semibold mt-3 flex items-center gap-1">
              <ArrowDownToLine size={11} />
              Total handover received from cashier on this date
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Expenses Listed Today (Lab Admin) ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingDown size={15} className="text-rose-500" />
            <h3 className="font-syne text-[13px] font-extrabold text-slate-800">
              Expenses Listed Today
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
              {expenses.length} entries
            </span>
            <span className="text-[11px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl">
              Total: {formatCurrency(totalExpensesToday)}
            </span>
          </div>
        </div>

        {/* Expense Rows */}
        <div className="divide-y divide-slate-50 max-h-[320px] overflow-y-auto">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText size={28} className="stroke-1 mb-2" />
              <span className="text-[11px] font-bold">No overhead expenses logged for this date.</span>
              <span className="text-[10px] text-slate-300 font-semibold mt-0.5">
                Expenses from staff will appear here
              </span>
            </div>
          ) : (
            expenses.map((exp, idx) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 h-7 w-7 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    <TrendingDown size={13} className="text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{exp.title}</p>
                    {exp.note && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{exp.note}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {exp.id}
                      </span>
                      {exp.created_by && (
                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                          Logged by: {exp.created_by}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-rose-600 shrink-0 ml-3">
                  -{formatCurrency(exp.amount)}
                </span>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer total if entries exist */}
        {expenses.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
              Total Expenses — {selectedDate}
            </span>
            <span className="text-sm font-extrabold text-rose-600">
              -{formatCurrency(totalExpensesToday)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
