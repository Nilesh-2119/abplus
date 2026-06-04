"use client";

import { useEffect, useState } from "react";
import { apiService, LabDashboardStats, User, Expense, DailyCloseout, CashierLabSettlement } from "@/services/api";
import { useIntervalRefetch } from "@/hooks/useIntervalRefetch";
import {
  Calendar,
  RefreshCw,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ClipboardList,
  Coins,
  FileText,
  Plus,
  Trash2,
  TrendingDown,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CashierDashboardProps {
  labId: string;
  currentRole: string;
  userName?: string;
}

interface CollectionBoyStats {
  total_patients: number;
  settled_patients: number;
  pending_patients: number;
  total_collected: number;
  pending_amount: number;
  concession_totals: number;
  total_expenses: number;
  net_cash: number;
  settlement_status?: "PENDING" | "SETTLED" | "PENDING CASH";
  settlement_time?: string | null;
  settled_by_name?: string | null;
  net_cash_in_hand?: number;
  submitted_cash_today?: number;
  total_pending_receivables?: number;
  total_pending_patients?: number;
}

interface CollectionBoyRowData {
  user: User;
  stats: CollectionBoyStats | null;
  loading: boolean;
}

export default function CashierDashboard({ labId, currentRole, userName = "Cashier" }: CashierDashboardProps) {
  // Date State - Defaults to today's date
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LabDashboardStats | null>(null);
  const [collectionBoys, setCollectionBoys] = useState<CollectionBoyRowData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashierSettlements, setCashierSettlements] = useState<CashierLabSettlement[]>([]);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Expense Form State
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);

  // Settlement Form State
  const [settlementRemarks, setSettlementRemarks] = useState("");
  const [submittingLabSettlement, setSubmittingLabSettlement] = useState(false);

  // Settlement Modal State
  const [settleBoy, setSettleBoy] = useState<CollectionBoyRowData | null>(null);
  const [amountReceived, setAmountReceived] = useState("");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  const fetchStatsBoysExpensesAndCloseout = async (dateStr: string, isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setErrorMsg("");
    }
    try {
      // 1. Fetch top dashboard metrics
      const dashboardStats = await apiService.getLabDashboardStats(labId, dateStr);
      setStats(dashboardStats);

      // 2. Fetch daily expenses logged by cashier
      const dailyExpenses = await apiService.getExpenses(labId, dateStr);
      setExpenses(dailyExpenses);

      // 3. Fetch cashier settlements for this date
      const settlementsList = await apiService.getCashierLabSettlements(labId, dateStr);
      setCashierSettlements(settlementsList);

      // 4. Fetch active collection boys
      const employees = await apiService.getEmployees(labId);
      const boys = employees.filter(
        (e) => e.role === "COLLECTION_BOY" && (e.status || "").toLowerCase() === "active"
      );

      // Initialize/update rows safely to prevent visual flicker in background
      setCollectionBoys((prev) => {
        if (isBackground && prev.length === boys.length && prev.every((row, i) => row.user.id === boys[i].id)) {
          return prev;
        }
        return boys.map((boy) => {
          const existing = prev.find((p) => p.user.id === boy.id);
          return {
            user: boy,
            stats: existing?.stats || null,
            loading: !existing,
          };
        });
      });

      // Fetch stats for each boy in parallel
      const statsPromises = boys.map(async (boy) => {
        try {
          const boyStats = await apiService.getCollectionBoyDashboardStats(
            labId,
            dateStr,
            boy.username
          );
          return { userId: boy.id, stats: boyStats };
        } catch {
          return { userId: boy.id, stats: null };
        }
      });

      const results = await Promise.all(statsPromises);

      setCollectionBoys((prev) =>
        prev.map((row) => {
          const result = results.find((r) => r.userId === row.user.id);
          return {
            ...row,
            stats: result?.stats || row.stats,
            loading: false,
          };
        })
      );
    } catch (e) {
      console.error(e);
      if (!isBackground) setErrorMsg("Failed to retrieve dashboard details.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsBoysExpensesAndCloseout(selectedDate);
  }, [labId, selectedDate]);

  useIntervalRefetch(() => fetchStatsBoysExpensesAndCloseout(selectedDate, true), 5000);

  const handleRefresh = () => {
    fetchStatsBoysExpensesAndCloseout(selectedDate);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) {
      setErrorMsg("Please provide a title and amount.");
      return;
    }
    const amt = Number(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }

    setAddingExpense(true);
    setErrorMsg("");
    try {
      await apiService.addExpense(labId, {
        title: expenseTitle.trim(),
        amount: amt,
        note: expenseNote.trim(),
        date: selectedDate,
      });

      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseNote("");
      
      // Reload expenses and metrics
      await fetchStatsBoysExpensesAndCloseout(selectedDate);
      setSuccessMsg("Expense recorded successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to log expense.");
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await apiService.deleteExpense(labId, expenseId);
      await fetchStatsBoysExpensesAndCloseout(selectedDate);
    } catch {
      setErrorMsg("Failed to delete expense.");
    }
  };

  const handleLabSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stats || !stats.cashier_pending || stats.cashier_pending <= 0.01) {
      setErrorMsg("No pending cash collections to submit to Lab Admin.");
      return;
    }

    setSubmittingLabSettlement(true);
    setErrorMsg("");
    try {
      await apiService.submitCashierLabSettlement(labId, settlementRemarks.trim());
      setSettlementRemarks("");
      setSuccessMsg("Cash settlement submitted to Lab Admin successfully!");
      setTimeout(() => setSuccessMsg(""), 5000);
      
      // Refresh stats
      await fetchStatsBoysExpensesAndCloseout(selectedDate);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit settlement.");
    } finally {
      setSubmittingLabSettlement(false);
    }
  };

  const openSettlementModal = (row: CollectionBoyRowData) => {
    setSettleBoy(row);
    const expectedCash = row.stats?.net_cash_in_hand ?? 0;
    setAmountReceived(expectedCash.toString());
    setSettlementNotes("");
    setErrorMsg("");
  };

  const closeSettlementModal = () => {
    setSettleBoy(null);
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleBoy || !settleBoy.stats) return;

    if (!amountReceived || isNaN(Number(amountReceived)) || Number(amountReceived) < 0) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }

    setSubmittingSettlement(true);
    setErrorMsg("");
    try {
      const expectedNet = settleBoy.stats.net_cash_in_hand ?? 0;
      await apiService.settleCollectionBoy(labId, settleBoy.user.id, {
        date: selectedDate,
        amount_collected: settleBoy.stats.total_collected,
        expenses: settleBoy.stats.total_expenses,
        net_cash_expected: expectedNet,
        amount_received: Number(amountReceived),
        notes: settlementNotes,
      });

      setSuccessMsg(`Successfully received payment for ${settleBoy.user.name || settleBoy.user.username}`);
      setTimeout(() => setSuccessMsg(""), 4000);
      
      closeSettlementModal();
      fetchStatsBoysExpensesAndCloseout(selectedDate);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to submit cash settlement.");
    } finally {
      setSubmittingSettlement(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  const totalOverheadExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netDailyRevenue = (stats?.net_cash_received || 0) - totalOverheadExpenses;
  const totalPendingReceivablesSum = collectionBoys.reduce((sum, row) => {
    return sum + (row.stats?.total_pending_receivables || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 border border-slate-200/80 p-4 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="font-syne text-[14px] font-extrabold text-slate-800">
            Cashier Desk Terminal
          </h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
            Daily Operational Handover & Rolling Settlements Workspace • {userName}
          </p>
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
            onClick={handleRefresh}
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors border border-slate-100 bg-slate-50/50"
            title="Refresh dashboard"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Top Dashboard Section ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Cash In Vault */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-[0.03] rounded-full blur-xl transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                Cash In Vault
              </span>
              <h3 className="text-2xl font-black text-cyan-600 mt-1">
                {formatCurrency(stats?.cash_in_vault || 0)}
              </h3>
            </div>
            <div className="rounded-xl p-2.5 bg-cyan-50 text-cyan-600 shadow-inner">
              <Coins size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-3">
            Physical cash in Cashier vault
          </p>
        </div>

        {/* Metric 2: Cash Submitted to Lab Admin */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-[0.03] rounded-full blur-xl transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                Cash Submitted to Lab Admin
              </span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {formatCurrency(stats?.cash_submitted_today || 0)}
              </h3>
            </div>
            <div className="rounded-xl p-2.5 bg-emerald-50 text-emerald-600 shadow-inner">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-3">
            Settled with Lab Admin today
          </p>
        </div>

        {/* Metric 3: Previous Cash Submission Pending */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-violet-500 to-indigo-500 opacity-0 group-hover:opacity-[0.03] rounded-full blur-xl transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                Previous Cash Pending
              </span>
              <h3 className="text-2xl font-black text-violet-600 mt-1">
                {formatCurrency(stats?.previous_cash_pending || 0)}
              </h3>
            </div>
            <div className="rounded-xl p-2.5 bg-violet-50 text-violet-600 shadow-inner">
              <Wallet size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-3">
            Cashier pending collections from yesterday
          </p>
        </div>

        {/* Metric 4: Cash Not Submitted to Lab Admin */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-amber-400 to-orange-500 opacity-0 group-hover:opacity-[0.03] rounded-full blur-xl transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                Cash Not Submitted to Admin
              </span>
              <h3 className="text-2xl font-black text-amber-600 mt-1">
                {formatCurrency(stats?.cash_not_submitted_to_admin || 0)}
              </h3>
            </div>
            <div className="rounded-xl p-2.5 bg-amber-50 text-amber-600 shadow-inner">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold mt-3">
            Total unsettled vault cash till this date
          </p>
        </div>
      </div>

      {/* ── Main Section: Collection Boys List ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-syne text-[13px] font-extrabold text-slate-800">
              Collection Boys Daily Settlements
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
              Cash handovers and concessions summary for {selectedDate}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Collection Boy</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">Cash In Hand</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">Cash Received Today</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">Patients Bill Pending</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && collectionBoys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    <div className="flex justify-center items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                      Loading collection boy details...
                    </div>
                  </td>
                </tr>
              ) : collectionBoys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-semibold">
                    No active collection boys found.
                  </td>
                </tr>
              ) : (
                collectionBoys.map((row) => {
                  const isSettled = row.stats?.settlement_status === "SETTLED";
                  const netCashWaiting = row.stats?.net_cash_in_hand ?? 0;
                  const submittedCashToday = row.stats?.submitted_cash_today ?? 0;
                  const pendingReceivables = row.stats?.total_pending_receivables ?? 0;
                  
                  return (
                    <tr key={row.user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 min-w-[150px]">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-cyan-50 text-cyan-600 font-black flex items-center justify-center text-xs border border-cyan-100">
                            {row.user.name ? row.user.name.charAt(0).toUpperCase() : row.user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{row.user.name || row.user.username}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">@{row.user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-slate-800">
                        {row.loading ? "—" : formatCurrency(netCashWaiting)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                        {row.loading ? "—" : formatCurrency(submittedCashToday)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-amber-600">
                        {row.loading ? "—" : formatCurrency(pendingReceivables)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isSettled ? (
                          <div className="text-[9px] text-slate-400 font-bold">
                            At {formatTime(row.stats?.settlement_time)}
                          </div>
                        ) : (
                          <button
                            disabled={row.loading}
                            onClick={() => openSettlementModal(row)}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] hover:shadow-md hover:from-cyan-600 hover:to-blue-600 transition-all cursor-pointer shadow-sm shadow-cyan-500/10 disabled:opacity-50"
                          >
                            Receive Money
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Daily Expenses & EOD Closeout Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Expenses Panel (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Expense Logger form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-syne text-[12px] font-extrabold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-1.5">
              <TrendingDown size={14} className="text-rose-500" />
              Log Overhead Expense
            </h3>

            <form onSubmit={handleAddExpense} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                  Expense Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fuel Allowance, Chemistry Reagents"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1500"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Date Context
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedDate}
                    className="w-full mt-1.5 rounded-xl border border-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-400 bg-slate-55 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                  Internal Note (Optional)
                </label>
                <textarea
                  placeholder="Provide description..."
                  rows={2}
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={addingExpense}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/15 transition-all cursor-pointer"
              >
                {addingExpense ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Log Overhead Expense</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Expenses list */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h3 className="font-syne text-[12px] font-extrabold text-slate-800 pb-3 border-b border-slate-100 flex justify-between items-center">
              <span>Expenses Listed Today <span className="text-rose-600 ml-1.5">(Total: {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))})</span></span>
              <span className="text-[9px] font-bold text-slate-400">Total count: {expenses.length}</span>
            </h3>

            <div className="mt-4 space-y-3 overflow-y-auto max-h-[300px]">
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileText size={24} className="stroke-1 mb-1.5" />
                  <span className="text-[10px] font-bold">No overhead expenses logged for this date.</span>
                </div>
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex justify-between items-start p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{exp.title}</h4>
                      {exp.note && (
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{exp.note}</p>
                      )}
                      <span className="text-[8px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                        {exp.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-rose-600">
                        -{formatCurrency(exp.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Lab Admin Cash Handovers Desk (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full space-y-4">
            <div>
              <h3 className="font-syne text-[12px] font-extrabold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-1.5">
                <UserCheck size={14} className="text-cyan-500" />
                Lab Admin Cash Handovers Desk
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-2">
                Submit reconciled net cash collections to Lab Admin (continuous handovers)
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Settlement Metrics Summary</p>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Pending Cash with Cashier:</span>
                  <span className="font-black text-slate-800">{formatCurrency(stats?.cashier_pending || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Unsubmitted Expenses:</span>
                  <span className="font-bold text-rose-500">-{formatCurrency(expenses.filter(e => e.submitted_to_lab_admin !== "Y").reduce((sum, e) => sum + e.amount, 0))}</span>
                </div>
              </div>

              <form onSubmit={handleLabSettlementSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">
                    Settlement Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={settlementRemarks}
                    onChange={(e) => setSettlementRemarks(e.target.value)}
                    placeholder="Provide details about cash submitted (e.g. currency count, handover detail)"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingLabSettlement || !stats?.cashier_pending || stats.cashier_pending <= 0.01}
                  className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/15 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingLabSettlement ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Submit Handovers to Lab Admin</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </form>

              {/* History of Settlements Today */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-2.5">Today's Settlements History</p>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {cashierSettlements.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-bold italic py-4 text-center">No settlements submitted to Lab Admin today.</p>
                  ) : (
                    cashierSettlements.map((s) => (
                      <div key={s.id} className="bg-emerald-50/40 border border-emerald-100/60 rounded-xl p-3 text-xs space-y-1.5 hover:bg-emerald-50/60 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-emerald-800">₹{Number(s.settlement_amount).toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 font-bold">{s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        {s.remarks && (
                          <p className="text-[10px] text-slate-600 font-medium italic mt-0.5">"{s.remarks}"</p>
                        )}
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold border-t border-emerald-100/30 pt-1">
                          <span>Expenses: ₹{Number(s.expenses_amount).toFixed(2)}</span>
                          <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded text-[8px] font-black uppercase">Submitted</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Settlement Handover Modal ── */}
      <AnimatePresence>
        {settleBoy && settleBoy.stats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={closeSettlementModal}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 overflow-hidden"
            >
              <h3 className="font-syne text-[14px] font-black text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
                <Wallet size={16} className="text-cyan-500" />
                Receive Cash Handover
              </h3>

              <div className="mt-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Expected Handover Metrics</p>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Collection Boy:</span>
                  <span className="font-bold text-slate-800">{settleBoy.user.name || settleBoy.user.username}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Patients Visited Today:</span>
                  <span className="font-bold text-slate-800">{settleBoy.stats.total_patients}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Total Cash Collected:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(settleBoy.stats.total_collected)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Logged Expenses:</span>
                  <span className="font-bold text-rose-500">-{formatCurrency(settleBoy.stats.total_expenses)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Rebates/Concessions (Info Only):</span>
                  <span className="font-semibold text-violet-600">{formatCurrency(settleBoy.stats.concession_totals)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-sm">
                  <span className="font-black text-slate-700">Expected Net Cash:</span>
                  <span className="font-black text-lg text-emerald-600">{formatCurrency(settleBoy.stats.net_cash_in_hand ?? 0)}</span>
                </div>
              </div>

              <form onSubmit={handleSettleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">
                    Physical Cash Received (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    readOnly
                    min="0"
                    step="0.01"
                    value={amountReceived}
                    placeholder="Enter cash amount received"
                    className="w-full rounded-xl border border-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-400 bg-slate-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-1.5">
                    Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="Add cash reconciliation remarks or note shortages..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeSettlementModal}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSettlement}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/15 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingSettlement ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>Confirm Receipt</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
