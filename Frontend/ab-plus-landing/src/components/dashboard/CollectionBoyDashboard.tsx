"use client";

import { useEffect, useState } from "react";
import { apiService, PathologyTest, ReferredDoctor, Expense } from "@/services/api";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  User,
  Users,
  CreditCard,
  Plus,
  Trash2,
  RefreshCw,
  PlusCircle,
  FileText,
  Search,
  CheckCircle,
  AlertCircle,
  UserPlus,
  X,
  Stethoscope,
  Beaker,
  IndianRupee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CollectionBoyDashboardProps {
  labId: string;
  currentRole: string;
  userName: string;
  selectedDate?: string;
  setSelectedDate?: (date: string) => void;
}

export default function CollectionBoyDashboard({
  labId,
  currentRole,
  userName,
  selectedDate: selectedDateProp,
  setSelectedDate: setSelectedDateProp,
}: CollectionBoyDashboardProps) {
  // Date State (default to today)
  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [localSelectedDate, setLocalSelectedDate] = useState(getTodayDateString());
  const selectedDate = selectedDateProp || localSelectedDate;
  const setSelectedDate = setSelectedDateProp || setLocalSelectedDate;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total_patients: number;
    settled_patients: number;
    pending_patients: number;
    total_collected: number;
    pending_amount: number;
    concession_totals: number;
    total_expenses: number;
    today_expenses?: number;
    net_cash: number;
    settlement_status?: "PENDING" | "SETTLED" | "PENDING CASH";
    settlement_time?: string | null;
    settled_by_name?: string | null;
    net_cash_in_hand?: number;
    submitted_cash_today?: number;
    todays_collected?: number;
    cash_not_submitted?: number;
    total_pending_receivables?: number;
    total_pending_patients?: number;
  }>({
    total_patients: 0,
    settled_patients: 0,
    pending_patients: 0,
    total_collected: 0,
    pending_amount: 0,
    concession_totals: 0,
    total_expenses: 0,
    net_cash: 0,
    settlement_status: "PENDING",
    settlement_time: null,
    settled_by_name: null,
    net_cash_in_hand: 0,
    submitted_cash_today: 0,
    todays_collected: 0,
    cash_not_submitted: 0,
    total_pending_receivables: 0,
    total_pending_patients: 0,
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Expense Form State
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);
  const [expError, setExpError] = useState("");

  // Patient Registration Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [patName, setPatName] = useState("");
  const [patAge, setPatAge] = useState("");
  const [patGender, setPatGender] = useState<"Male" | "Female" | "Other">("Male");
  const [patPhone, setPatPhone] = useState("");
  const [patReferredDoctorName, setPatReferredDoctorName] = useState("");
  const [selectedReferredDoctorId, setSelectedReferredDoctorId] = useState("");
  const [patDate, setPatDate] = useState(new Date().toISOString().split("T")[0]);
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [docSuggestions, setDocSuggestions] = useState<ReferredDoctor[]>([]);
  const [searchingDocs, setSearchingDocs] = useState(false);

  const [availableTests, setAvailableTests] = useState<PathologyTest[]>([]);
  const [selectedTests, setSelectedTests] = useState<PathologyTest[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [paidAmount, setPaidAmount] = useState("");

  // Debounced referred doctor lookup
  useEffect(() => {
    if (!docDropdownOpen || !patReferredDoctorName.trim()) return;
    const delayDebounce = setTimeout(async () => {
      setSearchingDocs(true);
      try {
        const res = await apiService.searchReferredDoctors(labId, patReferredDoctorName);
        setDocSuggestions(res.results);
      } catch {
        /* ignore */
      } finally {
        setSearchingDocs(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [patReferredDoctorName, docDropdownOpen, labId]);

  // Fetch Dashboard Stats and Expenses
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const statsData = await apiService.getCollectionBoyDashboardStats(
        labId,
        selectedDate,
        userName
      );
      setStats(statsData);

      const expList = await apiService.getExpenses(labId, selectedDate, userName);
      setExpenses(expList);

      const testsData = await apiService.getTests(labId);
      setAvailableTests(testsData.filter((t) => t.is_enabled));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, labId, userName]);

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Add Expense Handler
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !expAmount) {
      setExpError("Title and Amount are required.");
      return;
    }
    const amt = Number(expAmount);
    if (isNaN(amt) || amt <= 0) {
      setExpError("Enter a valid expense amount.");
      return;
    }

    setAddingExpense(true);
    setExpError("");
    try {
      await apiService.addExpense(labId, {
        title: expTitle.trim(),
        amount: amt,
        note: expNote.trim(),
        date: selectedDate,
        created_by: userName,
      });
      setExpTitle("");
      setExpAmount("");
      setExpNote("");
      await loadDashboardData();
    } catch {
      setExpError("Failed to record expense. Please try again.");
    } finally {
      setAddingExpense(false);
    }
  };

  // Delete Expense Handler
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await apiService.deleteExpense(labId, expenseId);
      await loadDashboardData();
    } catch {
      alert("Failed to delete expense.");
    }
  };

  // Patient Registration Handlers
  const handleSelectTestToggle = (test: PathologyTest) => {
    if (selectedTests.some((t) => t.id === test.id)) {
      setSelectedTests(selectedTests.filter((t) => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      alert("Please select at least one pathology test.");
      return;
    }
    if (patPhone.length !== 10) {
      alert("Contact phone must be exactly 10 digits.");
      return;
    }

    const totalBill = selectedTests.reduce((sum, t) => sum + Number(t.price), 0);
    const paid = paidAmount === "" ? 0 : Number(paidAmount);
    if (isNaN(paid) || paid < 0 || paid > totalBill) {
      alert(`Paid amount must be between 0 and total bill ₹${totalBill}`);
      return;
    }

    try {
      await apiService.createPatient(labId, {
        name: patName.trim(),
        age: Number(patAge),
        gender: patGender,
        phone: patPhone,
        tests: selectedTests,
        total_bill: totalBill,
        paid_amount: paid,
        referred_doctor_name: patReferredDoctorName.trim() || undefined,
        referred_doctor_id: selectedReferredDoctorId || undefined,
        collected_by: userName,
        created_at: patDate
      });

      // Clear Form and Close Modal
      setPatName("");
      setPatAge("");
      setPatGender("Male");
      setPatPhone("");
      setPatReferredDoctorName("");
      setSelectedReferredDoctorId("");
      setSelectedTests([]);
      setPaidAmount("");
      setPatDate(new Date().toISOString().split("T")[0]);
      setRegisterModalOpen(false);

      // Refresh Stats
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to register patient entry.");
    }
  };

  const filteredTests = availableTests.filter((t) =>
    t.name.toLowerCase().includes(testSearchQuery.toLowerCase())
  );

  const getTubeEmoji = (color: string) => {
    const c = color.toLowerCase();
    if (c.includes("purple") || c.includes("edta")) return "🟣";
    if (c.includes("red") || c.includes("serum")) return "🔴";
    if (c.includes("blue") || c.includes("citrate")) return "🔵";
    if (c.includes("green") || c.includes("heparin")) return "🟢";
    if (c.includes("yellow") || c.includes("sst")) return "🟡";
    if (c.includes("grey") || c.includes("gray") || c.includes("fluoride")) return "⚫";
    return "🧪";
  };

  const uniqueTubes = selectedTests.reduce((acc, t) => {
    const key = `${(t.tube_color || "").toLowerCase()}-${(t.tube_type || "").toLowerCase()}`;
    if (!acc.some((i) => i.key === key)) {
      acc.push({ key, color: t.tube_color || "Unknown", type: t.tube_type || "Unknown" });
    }
    return acc;
  }, [] as { key: string; color: string; type: string }[]);

  return (
    <div className="space-y-6 pb-20">
      {/* ── DATE CONTROLS BAR ── */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 p-3 sm:p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 sm:p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-slate-600"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/50 px-2.5 sm:px-3 py-1.5 rounded-xl">
            <Calendar size={13} className="text-cyan-500" />
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 tracking-tight select-none">
              {selectedDate}
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 sm:p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-slate-600"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
          />
          <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 cursor-pointer shadow-sm">
            <Calendar size={13} className="text-cyan-500" />
            <span>Select Date</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <RefreshCw size={24} className="animate-spin text-cyan-500" />
          <span className="ml-3 font-semibold text-sm">Syncing daily operational stats...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Daily Settlement Completed Banner */}
          {stats.settlement_status === "SETTLED" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl"
            >
              <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600 shrink-0">
                <CheckCircle size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-emerald-800">
                  Today's Settlement Completed
                </h4>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Verified and settled by <span className="font-extrabold">{stats.settled_by_name || "Cashier"}</span> at {stats.settlement_time ? new Date(stats.settlement_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "today"}.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── BIG STAT CARDS (Grid) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Card 1: Net Cash In Hand (carry-forward) */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-5 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[9px] font-black text-cyan-100 uppercase tracking-wider block">
                  Net Cash In Hand
                </span>
                <span className="text-2xl font-black tracking-tight block mt-1">
                  ₹{stats.net_cash_in_hand ?? stats.net_cash}
                </span>
              </div>
              <span className="text-[10px] text-cyan-50 font-bold block mt-2 flex items-center gap-1">
                <DollarSign size={11} /> carry forward
              </span>
            </div>

            {/* Card 2: Today's Collection (date-specific) */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Today&apos;s Collection
                </span>
                <span className="text-2xl font-black text-blue-600 tracking-tight block mt-1">
                  ₹{stats.todays_collected ?? stats.total_collected}
                </span>
              </div>
              <span className="text-[10px] text-blue-500 font-bold block mt-2 flex items-center gap-1">
                <IndianRupee size={11} /> this date only
              </span>
            </div>

            {/* Card 3: Submitted Cash To Cashier */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Submitted to Cashier
                </span>
                <span className="text-2xl font-black text-emerald-600 tracking-tight block mt-1">
                  ₹{stats.submitted_cash_today ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-bold block mt-2 flex items-center gap-1">
                <TrendingUp size={11} /> this date
              </span>
            </div>

            {/* Card 4: Cash Not Submitted (cumulative — NEW) */}
            <div className="bg-white border border-amber-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider block">
                  Cash Not Submitted
                </span>
                <span className="text-2xl font-black text-amber-600 tracking-tight block mt-1">
                  ₹{stats.cash_not_submitted ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-amber-500 font-bold block mt-2 flex items-center gap-1">
                <AlertCircle size={11} /> pending till yesterday
              </span>
            </div>

            {/* Card 5: Today's Expenses */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Today&apos;s Expenses
                </span>
                <span className="text-2xl font-black text-rose-500 tracking-tight block mt-1">
                  ₹{stats.today_expenses ?? expenses.reduce((sum, exp) => sum + exp.amount, 0)}
                </span>
              </div>
              <span className="text-[10px] text-rose-500 font-bold block mt-2 flex items-center gap-1">
                <TrendingDown size={11} /> this date only
              </span>
            </div>
          </div>

          {/* ── TWO COLUMN OPERATIONAL AREA ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COLUMN 1: PATIENT ANALYTICS & REVENUE TRACKING */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                  <Users size={14} className="text-cyan-500" />
                  Patient Analytics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase block">Entered</span>
                    <span className="text-lg font-black text-slate-800 block mt-0.5">{stats.total_patients}</span>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 text-center">
                    <span className="text-[8px] font-black text-emerald-600 uppercase block">Settled</span>
                    <span className="text-lg font-black text-emerald-600 block mt-0.5">{stats.settled_patients}</span>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100/50 rounded-xl p-3 text-center">
                    <span className="text-[8px] font-black text-rose-500 uppercase block">Pending</span>
                    <span className="text-lg font-black text-rose-500 block mt-0.5">{stats.pending_patients}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-cyan-500" />
                  Financial Tracking
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>Collected Cash (This Date)</span>
                    <span className="font-extrabold text-slate-800">₹{stats.todays_collected ?? stats.total_collected}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>Pending Receivables (This Date)</span>
                    <span className="font-extrabold text-slate-800">₹{stats.pending_amount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>Pending Receivables (Cumulative)</span>
                    <span className="font-extrabold text-amber-500">₹{stats.total_pending_receivables ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 border-t border-slate-100 pt-2.5">
                    <span>Concessions Given (This Date)</span>
                    <span className="font-extrabold text-rose-500">₹{stats.concession_totals}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: EXPENSE MANAGEMENT PANEL */}
            <div className="bg-white border border-slate-200/80 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-1.5 justify-between">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown size={14} className="text-cyan-500" />
                    <span>Expenses Listed Today</span>
                  </span>
                  <span className="text-[10px] text-rose-600 font-extrabold normal-case">
                    Total: ₹{expenses.reduce((sum, exp) => sum + exp.amount, 0)}
                  </span>
                </h3>

                {/* Expenses list */}
                {expenses.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    No field expenses recorded for today.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {expenses.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-start justify-between p-2.5 rounded-xl border border-slate-150 bg-slate-50/50 text-xs"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-slate-700 truncate">{e.title}</p>
                          {e.note && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{e.note}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-extrabold text-slate-800">₹{e.amount}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete expense"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Expense Form */}
              <form onSubmit={handleAddExpense} className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Record Field Expense</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Title (e.g. Petrol, Parking)"
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Amount"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-right"
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Optional details / notes"
                    value={expNote}
                    onChange={(e) => setExpNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                {expError && (
                  <p className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1">
                    {expError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={addingExpense}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-250 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-60"
                >
                  {addingExpense ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <>
                      <PlusCircle size={13} className="text-cyan-500" />
                      <span>Log Overhead Expense</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING QUICK PATIENT ENTRY BUTTON ── */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setRegisterModalOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4 text-xs font-black uppercase text-white shadow-xl hover:shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer border-2 border-white/20"
        >
          <UserPlus size={15} />
          <span>New Patient Entry</span>
        </button>
      </div>

      {/* ── REGISTRATION MODAL ── */}
      <AnimatePresence>
        {registerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRegisterModalOpen(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-6 shadow-2xl z-10 max-h-[96vh] sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-100 mb-3 sm:mb-4">
                <h3 className="font-syne text-sm font-extrabold text-slate-800">
                  New Patient Registration
                </h3>
                <button
                  onClick={() => setRegisterModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRegisterPatient} className="space-y-3 sm:space-y-4">
                {/* Name + Age */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Patient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patil"
                      value={patName}
                      onChange={(e) => setPatName(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide truncate">
                      Age (Yrs)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      placeholder="Age"
                      value={patAge}
                      onChange={(e) => setPatAge(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-center"
                    />
                  </div>
                </div>

                {/* Gender + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Gender
                    </label>
                    <div className="flex gap-2 mt-1">
                      {["Male", "Female", "Other"].map((gen) => (
                        <button
                          key={gen}
                          type="button"
                          onClick={() => setPatGender(gen as any)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            patGender === gen
                              ? "bg-cyan-50 border-cyan-500 text-cyan-600"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {gen}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Contact Phone (+91)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="10 digit mobile number"
                      value={patPhone}
                      onChange={(e) => setPatPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                    {patPhone && patPhone.length !== 10 && (
                      <span className="block text-[9px] text-rose-500 font-bold mt-1">
                        Must be exactly 10 digits.
                      </span>
                    )}
                  </div>
                </div>

                {/* Referred Doctor & Registration Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                  <div className="sm:col-span-2 relative">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Referred Doctor / Hospital
                    </label>
                    {docDropdownOpen && patReferredDoctorName.trim().length > 0 && (
                      <div className="fixed inset-0 z-10" onClick={() => setDocDropdownOpen(false)} />
                    )}
                    <input
                      type="text"
                      placeholder="Type doctor name..."
                      value={patReferredDoctorName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPatReferredDoctorName(v);
                        setSelectedReferredDoctorId("");
                        setDocDropdownOpen(v.trim().length > 0);
                      }}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 relative z-20"
                    />
                    {docDropdownOpen && patReferredDoctorName.trim().length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-40 overflow-y-auto py-1">
                        {searchingDocs ? (
                          <div className="px-3.5 py-3 text-center text-slate-400 text-[10px] font-bold flex items-center justify-center gap-2">
                            <span className="h-3 w-3 animate-spin rounded-full border border-cyan-500 border-t-transparent" />
                            Searching...
                          </div>
                        ) : docSuggestions.length === 0 ? (
                          <div className="px-3.5 py-3 text-center text-slate-400 text-[10px] font-bold">
                            No match — will save as custom referral.
                          </div>
                        ) : (
                          docSuggestions
                            .filter((doc) => {
                              const name = doc.doctor_name.toLowerCase();
                              const excludePatterns = [
                                "self / direct",
                                "self/direct",
                                "no referral",
                                "self referral",
                              ];
                              return !excludePatterns.some((p) => name.includes(p));
                            })
                            .map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => {
                                  setPatReferredDoctorName(doc.doctor_name);
                                  setSelectedReferredDoctorId(doc.id);
                                  setDocDropdownOpen(false);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col"
                              >
                                <span className="text-[11px] font-extrabold text-slate-700">
                                  {doc.doctor_name}
                                </span>
                                <span className="text-[9px] text-slate-400 mt-0.5 text-semibold">
                                  {doc.hospital_name}
                                </span>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Registration Date
                    </label>
                    <input
                      type="date"
                      required
                      value={patDate}
                      onChange={(e) => setPatDate(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    />
                  </div>
                </div>

                {/* Select Tests */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Select Pathology Panels
                    </label>
                    <div className="relative w-full sm:w-64">
                      <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search tests..."
                        value={testSearchQuery}
                        onChange={(e) => setTestSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                      {testSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTestSearchQuery("")}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {filteredTests.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        No matching tests found.
                      </div>
                    ) : (
                      filteredTests.map((test) => {
                        const sel = selectedTests.some((t) => t.id === test.id);
                        return (
                          <button
                            key={test.id}
                            type="button"
                            onClick={() => handleSelectTestToggle(test)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              sel
                                ? "bg-cyan-50/70 border-cyan-500 shadow-sm"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <div>
                              <span className="block text-xs font-bold text-slate-800">
                                {test.name}
                              </span>
                              <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                                {test.tube_type} ({test.tube_color})
                              </span>
                            </div>
                            <span className="text-xs font-extrabold text-slate-800">
                              ₹{Number(test.price).toFixed(2)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Required Tubes */}
                {selectedTests.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Beaker size={12} className="text-cyan-500" />
                      Required Sample Tubes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueTubes.map((tube) => (
                        <div
                          key={tube.key}
                          className="flex items-center gap-1.5 text-[10px] font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm"
                        >
                          <span className="text-sm">{getTubeEmoji(tube.color)}</span>
                          <span className="text-slate-700">
                            {tube.color} ({tube.type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Billing + Initial Payment */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Total Amount
                    </label>
                    <p className="text-lg font-black text-slate-800 mt-1">
                      ₹{selectedTests.reduce((sum, t) => sum + Number(t.price), 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Initial Paid (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Register Patient Profile</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
