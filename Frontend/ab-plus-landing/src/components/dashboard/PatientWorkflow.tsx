"use client";

import { useEffect, useState, useRef } from "react";
import { apiService, PatientEntry, PathologyTest, ReferredDoctor } from "@/services/api";
import { useIntervalRefetch } from "@/hooks/useIntervalRefetch";
import {
  Search,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Beaker,
  FileText,
  UserPlus,
  CheckCircle,
  FileSpreadsheet,
  UserCheck,
  X,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Phone,
  Calendar,
  Stethoscope,
  BadgeCheck,
  Trash2,
  TriangleAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WorkflowProps {
  labId: string;
  currentRole: string;
  userName?: string;
  initialTab?: "patients" | "received";
}

export default function PatientWorkflow({ labId, currentRole, userName = "Staff", initialTab = "patients" }: WorkflowProps) {
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [availableTests, setAvailableTests] = useState<PathologyTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Technician Workflow Sub-Tabs
  const [techTab, setTechTab] = useState<"patients" | "received">(initialTab);
  const [reportStatusFilter, setReportStatusFilter] = useState<"ALL" | "PENDING" | "DONE">("ALL");

  useEffect(() => {
    setTechTab(initialTab);
  }, [initialTab]);

  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const dateInputRef = useRef<HTMLInputElement>(null);

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Registration form
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [patName, setPatName] = useState("");
  const [patAge, setPatAge] = useState("");
  const [patGender, setPatGender] = useState<"Male" | "Female" | "Other">("Male");
  const [patPhone, setPatPhone] = useState("");
  const [selectedTests, setSelectedTests] = useState<PathologyTest[]>([]);
  const [paidAmount, setPaidAmount] = useState("");
  const [selectedReferredDoctorId, setSelectedReferredDoctorId] = useState("");
  const [patReferredDoctorName, setPatReferredDoctorName] = useState("");
  const [patDate, setPatDate] = useState(new Date().toISOString().split("T")[0]);
  const [docSuggestions, setDocSuggestions] = useState<ReferredDoctor[]>([]);
  const [searchingDocs, setSearchingDocs] = useState(false);
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [debouncedTestSearchQuery, setDebouncedTestSearchQuery] = useState("");

  // Patient Details Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPatient, setDrawerPatient] = useState<PatientEntry | null>(null);

  // Payment inside drawer
  const [receiveAmount, setReceiveAmount] = useState("");
  const [concessionAmount, setConcessionAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "UPI" | "CREDIT">("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMsg, setPaymentMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [clientTxnId, setClientTxnId] = useState("");

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);

  // Results logging
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsPatient, setResultsPatient] = useState<PatientEntry | null>(null);
  const [resultsData, setResultsData] = useState<Record<string, number>>({});

  // Edit Patient Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPatientId, setEditPatientId] = useState("");
  const [editPatName, setEditPatName] = useState("");
  const [editPatAge, setEditPatAge] = useState("");
  const [editPatGender, setEditPatGender] = useState<"Male" | "Female" | "Other">("Male");
  const [editPatPhone, setEditPatPhone] = useState("");
  const [editSelectedTests, setEditSelectedTests] = useState<PathologyTest[]>([]);
  const [editSelectedReferredDoctorId, setEditSelectedReferredDoctorId] = useState("");
  const [editPatReferredDoctorName, setEditPatReferredDoctorName] = useState("");
  const [editDocSuggestions, setEditDocSuggestions] = useState<ReferredDoctor[]>([]);
  const [editDocDropdownOpen, setEditDocDropdownOpen] = useState(false);
  const [editSearchingDocs, setEditSearchingDocs] = useState(false);
  const [editTestSearchQuery, setEditTestSearchQuery] = useState("");
  const [editErrorMsg, setEditErrorMsg] = useState("");
  const [updatingPatient, setUpdatingPatient] = useState(false);

  // ── debounce edit doctor search ──
  useEffect(() => {
    if (!editDocDropdownOpen || !editPatReferredDoctorName.trim()) return;
    const h = setTimeout(async () => {
      setEditSearchingDocs(true);
      try {
        const res = await apiService.searchReferredDoctors(labId, editPatReferredDoctorName);
        setEditDocSuggestions(res.results);
      } catch { /* silent */ }
      finally { setEditSearchingDocs(false); }
    }, 300);
    return () => clearTimeout(h);
  }, [editPatReferredDoctorName, editDocDropdownOpen, labId]);

  const handleOpenEditModal = (patient: PatientEntry) => {
    setEditPatientId(patient.id);
    setEditPatName(patient.name);
    setEditPatAge(String(patient.age));
    setEditPatGender(patient.gender);
    setEditPatPhone(patient.phone);
    setEditSelectedTests(patient.tests);
    setEditSelectedReferredDoctorId(patient.referred_doctor_id || "");
    setEditPatReferredDoctorName(patient.referred_doctor_name || "");
    setEditTestSearchQuery("");
    setEditErrorMsg("");
    setEditDocDropdownOpen(false);
    setEditModalOpen(true);
  };

  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatientId || !editPatName || !editPatAge || !editPatPhone || editSelectedTests.length === 0) {
      setEditErrorMsg("Complete all fields and select at least one test.");
      return;
    }
    if (editPatPhone.length !== 10) {
      setEditErrorMsg("Phone must be exactly 10 digits.");
      return;
    }
    setUpdatingPatient(true);
    setEditErrorMsg("");
    
    // Calculate new total bill
    const totalBill = editSelectedTests.reduce((s, t) => s + Number(t.price), 0);

    try {
      const updated = await apiService.updatePatient(editPatientId, {
        name: editPatName,
        age: Number(editPatAge),
        gender: editPatGender,
        phone: editPatPhone,
        tests: editSelectedTests,
        total_bill: totalBill,
        referred_doctor_id: editSelectedReferredDoctorId || undefined,
        referred_doctor_name: editPatReferredDoctorName || undefined,
      });

      // Update state
      setEditModalOpen(false);
      
      // Update drawerPatient if currently open
      if (drawerPatient && drawerPatient.id === editPatientId) {
        setDrawerPatient(updated);
      }
      
      // Reload lists
      await fetchAll();
    } catch (err: any) {
      setEditErrorMsg(err.message || "Failed to update patient profile.");
    } finally {
      setUpdatingPatient(false);
    }
  };

  const handleSelectTestToggleEdit = (test: PathologyTest) => {
    const already = editSelectedTests.some(t => t.id === test.id);
    setEditSelectedTests(already ? editSelectedTests.filter(t => t.id !== test.id) : [...editSelectedTests, test]);
  };

  const filteredTestsEdit = availableTests.filter(t =>
    t.name.toLowerCase().includes(editTestSearchQuery.toLowerCase())
  );

  // ── debounce test search ──
  useEffect(() => {
    const h = setTimeout(() => setDebouncedTestSearchQuery(testSearchQuery), 150);
    return () => clearTimeout(h);
  }, [testSearchQuery]);

  useEffect(() => {
    if (!registerModalOpen) setTestSearchQuery("");
  }, [registerModalOpen]);

  // ── debounce doctor search ──
  useEffect(() => {
    if (!docDropdownOpen || !patReferredDoctorName.trim()) return;
    const h = setTimeout(async () => {
      setSearchingDocs(true);
      try {
        const res = await apiService.searchReferredDoctors(labId, patReferredDoctorName);
        setDocSuggestions(res.results);
      } catch { /* silent */ }
      finally { setSearchingDocs(false); }
    }, 300);
    return () => clearTimeout(h);
  }, [patReferredDoctorName, docDropdownOpen, labId]);

  const fetchAll = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await apiService.getPatients(labId, currentRole, searchQuery, statusFilter, selectedDate);
      setPatients(data);
      const testsData = await apiService.getTests(labId);
      setAvailableTests(testsData.filter(t => t.is_enabled));
      if (!isBackground) setErrorMsg("");
    } catch { 
      if (!isBackground) setErrorMsg("Failed to load patient workflow."); 
    }
    finally { 
      if (!isBackground) setLoading(false); 
    }
  };

  useEffect(() => { fetchAll(); }, [labId, currentRole, searchQuery, statusFilter, selectedDate]);

  useIntervalRefetch(() => fetchAll(true), 5000);

  // Keep drawer in sync after refresh
  useEffect(() => {
    if (drawerPatient) {
      const updated = patients.find(p => p.id === drawerPatient.id);
      if (updated) setDrawerPatient(updated);
      else { setDrawerOpen(false); setDrawerPatient(null); } // deleted
    }
  }, [patients]);

  // ── Registration ──
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patName || !patAge || !patPhone || selectedTests.length === 0) {
      setErrorMsg("Complete all fields and select at least one test.");
      return;
    }
    if (patPhone.length !== 10) {
      setErrorMsg("Phone must be exactly 10 digits.");
      return;
    }
    const totalBill = selectedTests.reduce((s, t) => s + Number(t.price), 0);
    try {
      await apiService.createPatient(labId, {
        name: patName, age: Number(patAge), gender: patGender, phone: patPhone,
        tests: selectedTests,
        paid_amount: Math.min(Number(paidAmount) || 0, totalBill),
        total_bill: totalBill,
        referred_doctor_id: selectedReferredDoctorId || undefined,
        referred_doctor_name: patReferredDoctorName || undefined,
        collected_by: currentRole === "COLLECTION_BOY" ? userName : "",
        created_at: patDate
      });
      setPatName(""); setPatAge(""); setPatGender("Male"); setPatPhone("");
      setSelectedTests([]); setPaidAmount("");
      setSelectedReferredDoctorId(""); setPatReferredDoctorName("");
      setPatDate(new Date().toISOString().split("T")[0]);
      setRegisterModalOpen(false);
      fetchAll();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register patient.");
    }
  };

  // ── Drawer ──
  const openDrawer = (patient: PatientEntry) => {
    setDrawerPatient(patient);
    setReceiveAmount(""); setConcessionAmount("");
    setPaymentMode("CASH"); setPaymentNotes("");
    setPaymentMsg(null); setDeleteConfirmOpen(false);
  
    // Generate unique transaction token for duplicate protection
    const token = "TXN-" + Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
    setClientTxnId(token);
  
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => { setDrawerPatient(null); setDeleteConfirmOpen(false); }, 300);
  };

  // ── Payment ──
  const handleReceivePayment = async () => {
    if (!drawerPatient) return;
    const pending = Math.max(0, drawerPatient.total_bill - drawerPatient.paid_amount - (drawerPatient.concession || 0));
    
    const receiveVal = receiveAmount.trim();
    const concessionVal = concessionAmount.trim();
    
    if (receiveVal === "" && concessionVal === "") {
      return setPaymentMsg({ type: "error", text: "Please enter receive or concession amount." });
    }
    
    const receive = receiveVal === "" ? 0 : Number(receiveVal);
    const concession = concessionVal === "" ? 0 : Number(concessionVal);
    
    if (isNaN(receive) || isNaN(concession)) {
      return setPaymentMsg({ type: "error", text: "Please enter valid numbers." });
    }
    
    if (receive < 0 || concession < 0) {
      return setPaymentMsg({ type: "error", text: "Amounts cannot be negative." });
    }
    
    if (receive === 0 && concession === 0) {
      return setPaymentMsg({ type: "error", text: "Enter receive or concession amount." });
    }
    
    if (receive + concession > pending) {
      return setPaymentMsg({ type: "error", text: `Total ₹${receive + concession} exceeds pending balance ₹${pending}.` });
    }

    setProcessingPayment(true);
    setPaymentMsg(null);
    try {
      await apiService.updatePatientPayment(drawerPatient.id, receive, concession, paymentMode, paymentNotes, clientTxnId);
      setReceiveAmount(""); setConcessionAmount(""); setPaymentNotes("");
      setPaymentMsg({ type: "success", text: `Payment ₹${receive} & Concession ₹${concession} recorded!` });
      
      // Generate new token for subsequent payments in same session
      const nextToken = "TXN-" + Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
      setClientTxnId(nextToken);
      
      // Refresh details
      const refreshed = await apiService.getPatientDetails(drawerPatient.id);
      setDrawerPatient(refreshed);
      await fetchAll();
    } catch (err: any) { 
      setPaymentMsg({ type: "error", text: err.message || "Payment failed. Try again." }); 
    }
    finally { setProcessingPayment(false); }
  };

  // ── Delete ──
  const handleDeletePatient = async () => {
    if (!drawerPatient) return;
    setDeletingPatient(true);
    try {
      await apiService.deletePatient(drawerPatient.id);
      closeDrawer();
      await fetchAll();
    } catch { setErrorMsg("Failed to delete patient entry."); }
    finally { setDeletingPatient(false); }
  };

  // ── Report Given (Deliver) ──
  const handleDeliverReport = async (patient: PatientEntry) => {
    try {
      const refreshed = await apiService.updatePatientStatus(patient.id, "DELIVERED");
      setDrawerPatient(refreshed);
      setPaymentMsg({ type: "success", text: "Report marked as Delivered!" });
      await fetchAll();
    } catch { setErrorMsg("Failed to mark report as delivered."); }
  };


  // ── Results ──
  const handleOpenResults = (patient: PatientEntry) => {
    setResultsPatient(patient);
    const init: Record<string, number> = {};
    patient.tests.forEach(t => t.parameters.forEach(p => {
      if (patient.results[p.id] !== undefined) init[p.id] = patient.results[p.id];
    }));
    setResultsData(init);
    setResultsModalOpen(true);
  };

  const handleSaveResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultsPatient) return;
    try {
      await apiService.saveTestResults(resultsPatient.id, resultsData);
      setResultsModalOpen(false);
      fetchAll();
    } catch { setErrorMsg("Failed to save results."); }
  };

  const handleSelectTestToggle = (test: PathologyTest) => {
    const already = selectedTests.some(t => t.id === test.id);
    setSelectedTests(already ? selectedTests.filter(t => t.id !== test.id) : [...selectedTests, test]);
  };

  // ── Helpers ──
  const getParamFlag = (v: number | undefined, min: number, max: number) => {
    if (v === undefined || isNaN(v)) return "NORMAL";
    if (v < min) return "LOW";
    if (v > max) return "HIGH";
    return "NORMAL";
  };

  const statusBadge = (s: PatientEntry["status"]) => {
    switch (s) {
      case "CREATED":   return "bg-slate-100 text-slate-500 border border-slate-200/50";
      case "COLLECTED": return "bg-violet-50 text-violet-600 border border-violet-100/50";
      case "LAB_RECEIVED": return "bg-blue-50 text-blue-600 border border-blue-100/50";
      case "COMPLETED": return "bg-amber-50 text-amber-600 border border-amber-100/50";
      case "DELIVERED": return "bg-emerald-50 text-emerald-600 border border-emerald-100/50";
    }
  };

  const statusLabel = (s: PatientEntry["status"]) => {
    switch (s) {
      case "CREATED":   return "Pending Results";
      case "COLLECTED": return "Sample Collected";
      case "LAB_RECEIVED": return "Received at Lab";
      case "COMPLETED": return "Reports Ready";
      case "DELIVERED": return "Delivered";
    }
  };

  const statusDot = (s: PatientEntry["status"]) => {
    switch (s) {
      case "CREATED":   return "bg-slate-400";
      case "COLLECTED": return "bg-violet-500";
      case "LAB_RECEIVED": return "bg-blue-500";
      case "COMPLETED": return "bg-amber-500";
      case "DELIVERED": return "bg-emerald-500";
    }
  };

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

  const filteredTests = availableTests.filter(t =>
    t.name.toLowerCase().includes(debouncedTestSearchQuery.toLowerCase())
  );

  const uniqueTubes = selectedTests.reduce((acc, t) => {
    const key = `${(t.tube_color || "").toLowerCase()}-${(t.tube_type || "").toLowerCase()}`;
    if (!acc.some(i => i.key === key)) acc.push({ key, color: t.tube_color || "Unknown", type: t.tube_type || "Unknown" });
    return acc;
  }, [] as { key: string; color: string; type: string }[]);

  // Local filtering for technician tabs and sub-filters
  const displayPatients = patients.filter(pat => {
    if (currentRole === "TECHNICIAN") {
      if (techTab === "patients") {
        return pat.status === "CREATED" || pat.status === "COLLECTED";
      } else { // received
        if (reportStatusFilter === "PENDING") {
          return pat.status === "LAB_RECEIVED";
        } else if (reportStatusFilter === "DONE") {
          return pat.status === "COMPLETED" || pat.status === "DELIVERED";
        }
        return pat.status === "LAB_RECEIVED" || pat.status === "COMPLETED" || pat.status === "DELIVERED";
      }
    }
    return true;
  });

  // Derived drawer values
  const drawerPending = drawerPatient ? Math.max(0, drawerPatient.total_bill - drawerPatient.paid_amount - (drawerPatient.concession || 0)) : 0;
  const canPayment = drawerPending > 0 &&
    (currentRole === "LAB_ADMIN" || currentRole === "COLLECTION_BOY");

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Date Navigation Toolbar ── */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 p-3 sm:p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 sm:p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-slate-650"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/50 px-2.5 sm:px-3 py-1.5 rounded-xl">
            <Calendar size={13} className="text-cyan-500" />
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-705 tracking-tight select-none">
              {selectedDate}
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 sm:p-2 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer text-slate-650"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="relative">
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="absolute w-0 h-0 opacity-0 pointer-events-none"
          />
          <button
            type="button"
            onClick={() => {
              if (dateInputRef.current) {
                try {
                  dateInputRef.current.showPicker();
                } catch {
                  dateInputRef.current.click();
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-650 cursor-pointer shadow-sm"
          >
            <Calendar size={13} className="text-cyan-500" />
            <span>Select Date</span>
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 border border-slate-200/80 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-sm">
        <div className="flex-1 max-w-md relative">
          <Search size={15} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, phone, or PAT-ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentRole === "TECHNICIAN" ? (
            initialTab !== "received" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTechTab("patients")}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer border ${
                    techTab === "patients"
                      ? "bg-cyan-500 text-white border-cyan-500 shadow-sm shadow-cyan-500/10"
                      : "bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  Patients
                </button>
                <button
                  type="button"
                  onClick={() => setTechTab("received")}
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer border ${
                    techTab === "received"
                      ? "bg-cyan-500 text-white border-cyan-500 shadow-sm shadow-cyan-500/10"
                      : "bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  Received Samples
                </button>
              </div>
            )
          ) : (
            ["ALL", "CREATED", "COLLECTED", "LAB_RECEIVED", "COMPLETED", "DELIVERED"].map(st => (
              <button key={st} onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer border ${
                  statusFilter === st
                    ? "bg-cyan-500 text-white border-cyan-500 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                {st === "CREATED" ? "Pending" : st === "COLLECTED" ? "Collected" : st === "LAB_RECEIVED" ? "At Lab" : st === "COMPLETED" ? "Ready" : st === "DELIVERED" ? "Delivered" : "All"}
              </button>
            ))
          )}
          {currentRole !== "TECHNICIAN" && currentRole !== "CASHIER" && (
            <button onClick={() => setRegisterModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-[11px] font-black uppercase text-white shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <UserPlus size={13} /><span>New Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Technician Sub-Filters (Only shown when on Received Samples tab) ── */}
      {currentRole === "TECHNICIAN" && techTab === "received" && (
        <div className="flex items-center gap-2 bg-slate-100/50 border border-slate-200/50 p-2 rounded-xl shadow-inner max-w-fit animate-fade-in">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2">Filter Reports:</span>
          {[
            { id: "ALL", label: "All Received" },
            { id: "PENDING", label: "Report Pending" },
            { id: "DONE", label: "Report Done" }
          ].map(sub => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setReportStatusFilter(sub.id as any)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer border ${
                reportStatusFilter === sub.id
                  ? "bg-white text-cyan-600 shadow-sm border-slate-200"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={15} /><span>{errorMsg}</span>
        </div>
      )}

      {/* ── Patient List ── */}
      {loading ? (
        <div className="flex h-44 items-center justify-center text-slate-400">
          <RefreshCw size={20} className="animate-spin text-cyan-500" />
          <span className="ml-3 font-semibold text-sm">Loading patient workflow...</span>
        </div>
      ) : displayPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44 bg-white border border-slate-200/60 rounded-2xl p-6 text-slate-400">
          <UserCheck size={28} className="stroke-1 mb-1.5" />
          <span className="text-sm font-bold">No patient entries found.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {displayPatients.map(pat => {
            const pendingBal = Math.max(0, pat.total_bill - pat.paid_amount - (pat.concession || 0));
            const hasPending = pendingBal > 0.01;
            return (
              <motion.div key={pat.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => openDrawer(pat)}
                className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-black text-slate-400">{pat.id}</span>
                      {currentRole !== "COLLECTION_BOY" && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusBadge(pat.status)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDot(pat.status)}`} />
                          {statusLabel(pat.status)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-800 mt-0.5 leading-tight">{pat.name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {pat.age} yrs • {pat.gender} • <span className="font-bold text-slate-600">{pat.phone}</span>
                    </p>
                    {pat.referred_doctor_name && (
                      <p className="text-[10px] text-cyan-600 font-bold mt-1 flex items-center gap-1">
                        <Stethoscope size={10} />Ref: {pat.referred_doctor_name}
                      </p>
                    )}
                    {pat.collected_by && (
                      <p className="text-[10px] text-violet-600 font-bold mt-0.5 flex items-center gap-1">
                        <UserCheck size={10} />Collected by: {pat.collected_by}
                      </p>
                    )}
                    {currentRole === "CASHIER" && pat.created_at && (
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />Date: {pat.created_at}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-center">
                    {currentRole === "TECHNICIAN" && techTab === "received" && (
                      <div className="flex items-center gap-2">
                        {pat.status === "LAB_RECEIVED" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenResults(pat);
                            }}
                            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl hover:from-cyan-600 hover:to-blue-600 active:scale-95 transition-all shadow-sm shadow-cyan-500/10 cursor-pointer"
                          >
                            Make Report
                          </button>
                        ) : (pat.status === "COMPLETED" || pat.status === "DELIVERED") ? (
                          <span className="px-3.5 py-2 text-xs font-black bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl flex items-center gap-1.5 select-none">
                            <CheckCircle size={12} className="stroke-[2.5]" />
                            Report Ready
                          </span>
                        ) : null}
                      </div>
                    )}
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>
                </div>
                {currentRole === "TECHNICIAN" ? (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Tests Ordered</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pat.tests.map(t => (
                        <span key={t.id} className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-650">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: t.tube_color?.toLowerCase() }} />
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
                        <p className="text-sm font-black text-slate-800">₹{pat.total_bill}</p>
                      </div>
                      <div className="w-px h-7 bg-slate-100" />
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Paid</p>
                        <p className="text-sm font-black text-emerald-600">₹{pat.paid_amount}</p>
                      </div>
                    </div>
                    {hasPending ? (
                      <span className="text-xs font-extrabold bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-full">
                        {currentRole === "COLLECTION_BOY" ? "Due" : `Due ₹${pendingBal}`}
                      </span>
                    ) : (
                      <span className="text-xs font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-100/50 px-3 py-1 rounded-full flex items-center gap-1">
                        <BadgeCheck size={12} />Settled
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════
          PATIENT DETAILS DRAWER
      ══════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && drawerPatient && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 max-h-[92vh] sm:max-h-[85vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base font-black text-slate-800">{drawerPatient.name}</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {drawerPatient.id} • {drawerPatient.age} yrs • {drawerPatient.gender}
                  </p>
                </div>
                <button onClick={closeDrawer}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* Status + info strip */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider ${statusBadge(drawerPatient.status)}`}>
                    <span className={`h-2 w-2 rounded-full ${statusDot(drawerPatient.status)}`} />
                    {statusLabel(drawerPatient.status)}
                  </span>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><Phone size={11} />{drawerPatient.phone}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} />{drawerPatient.created_at}</span>
                  </div>
                </div>

                {/* Referred Doctor */}
                {drawerPatient.referred_doctor_name && (
                  <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-100 rounded-xl px-3 py-2">
                    <Stethoscope size={14} className="text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[9px] text-cyan-500 font-extrabold uppercase tracking-wide">Referred By</p>
                      <p className="text-sm font-bold text-cyan-700">{drawerPatient.referred_doctor_name}</p>
                    </div>
                  </div>
                )}

                {/* Collected By (BCB) */}
                {drawerPatient.collected_by && (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                    <UserCheck size={14} className="text-violet-500 shrink-0" />
                    <div>
                      <p className="text-[9px] text-violet-500 font-extrabold uppercase tracking-wide">Collected By (BCB)</p>
                      <p className="text-sm font-bold text-violet-700">{drawerPatient.collected_by}</p>
                    </div>
                  </div>
                )}

                {/* Tests ordered */}
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Beaker size={12} className="text-cyan-500" />
                    Tests Ordered ({drawerPatient.tests.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {drawerPatient.tests.map(test => (
                      <div key={test.id}
                        className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                        <span className="h-2.5 w-2.5 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: test.tube_color?.toLowerCase() }} />
                        <span className="text-slate-700">{test.name}</span>
                        <span className="text-slate-400 font-semibold">₹{Number(test.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing Summary */}
                {currentRole !== "TECHNICIAN" && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                      <IndianRupee size={12} className="text-cyan-500" />
                      Billing Summary
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-600 pb-2 border-b border-slate-200/60 mb-2">
                        <span>Payment Status</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          drawerPatient.payment_status === "FULLY_PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : drawerPatient.payment_status === "PARTIAL_PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : drawerPatient.payment_status === "FULL_CONCESSION"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {drawerPatient.payment_status === "FULLY_PAID" && "Fully Paid"}
                          {drawerPatient.payment_status === "PARTIAL_PENDING" && "Partial Pending"}
                          {drawerPatient.payment_status === "FULL_CONCESSION" && "Full Concession"}
                          {drawerPatient.payment_status === "CREDIT_PENDING" && "Credit Pending"}
                          {!drawerPatient.payment_status && "Credit Pending"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-slate-600">
                        <span>Total Bill</span>
                        <span className="font-black text-slate-800">₹{drawerPatient.total_bill}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-slate-600">
                        <span>Amount Paid</span>
                        <span className="font-black text-emerald-600">₹{drawerPatient.paid_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-slate-600">
                        <span>Concession</span>
                        <span className="font-black text-rose-500">₹{drawerPatient.concession || 0}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                        <span className="font-semibold text-slate-600">Pending Balance</span>
                        <span className={`font-black text-lg ${drawerPending > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {drawerPending > 0 ? `₹${drawerPending}` : "✓ Settled"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PAYMENT COLLECTION ── */}
              {canPayment && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <CreditCard size={12} className="text-cyan-500" />
                    Receive Remaining Payment
                  </p>

                  {/* Pending Amount (readonly) */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">
                      Pending Amount
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`₹${drawerPending}`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-rose-600 focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Receive Amount and Concession Amount */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 truncate">
                        Receive Amount (₹)
                      </label>
                      <input
                        type="number" min="0" max={drawerPending}
                        placeholder="Amount"
                        value={receiveAmount}
                        onChange={e => { setReceiveAmount(e.target.value); setPaymentMsg(null); }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-1 truncate">
                        Concession (₹)
                      </label>
                      <input
                        type="number" min="0" max={drawerPending}
                        placeholder="Concession"
                        value={concessionAmount}
                        onChange={e => { setConcessionAmount(e.target.value); setPaymentMsg(null); }}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                    </div>
                  </div>

                  {/* Remarks / Notes (full width) */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-1">
                      Remarks / Notes (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Transaction details..."
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleReceivePayment}
                    disabled={processingPayment}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/15 hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer h-[38px]"
                  >
                    {processingPayment ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Receive Payment</span>
                    )}
                  </button>

                  {/* Live total preview */}
                  {(receiveAmount || concessionAmount) && (
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Total credit: ₹{(Number(receiveAmount) || 0) + (Number(concessionAmount) || 0)} / Pending: ₹{drawerPending}
                    </p>
                  )}

                  {/* Validation / success message */}
                  {paymentMsg && (
                    <p className={`text-[10px] font-bold rounded-lg px-2.5 py-1.5 ${
                      paymentMsg.type === "error"
                        ? "text-rose-600 bg-rose-50 border border-rose-100"
                        : "text-emerald-600 bg-emerald-50 border border-emerald-100"
                    }`}>
                      {paymentMsg.type === "error" ? "⚠ " : "✓ "}{paymentMsg.text}
                    </p>
                  )}
                </div>
              )}

                {/* ── ACTION BUTTONS ── */}
                <div className="space-y-2.5 pb-4">

                  {/* ── CASHIER: MARK AS LAB_RECEIVED BUTTON ── */}
                  {currentRole === "CASHIER" && (drawerPatient.status === "CREATED" || drawerPatient.status === "COLLECTED") && (
                    <button
                      onClick={async () => {
                        try {
                          const refreshed = await apiService.updatePatientStatus(drawerPatient.id, "LAB_RECEIVED");
                          setDrawerPatient(refreshed);
                          setPaymentMsg({ type: "success", text: "Sample marked as Received at Lab!" });
                          await fetchAll();
                        } catch { setPaymentMsg({ type: "error", text: "Failed to mark sample as received at lab." }); }
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3.5 text-sm font-bold text-white shadow-md hover:from-cyan-600 hover:to-blue-600 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Beaker size={16} />
                      <span>Sample Received At Lab</span>
                    </button>
                  )}

                  {/* ── REPORT GIVEN BUTTON (hidden for CASHIER/TECHNICIAN) ── */}
                  {currentRole !== "CASHIER" && currentRole !== "TECHNICIAN" && (
                    <div className="relative">
                      <button
                        onClick={() => handleDeliverReport(drawerPatient)}
                        disabled={drawerPatient.status === "DELIVERED"}
                        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition-all ${
                          drawerPatient.status === "DELIVERED"
                            ? "bg-emerald-600 cursor-not-allowed opacity-90"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.99] cursor-pointer"
                        }`}
                        title={
                          drawerPatient.status === "DELIVERED"
                            ? "Report already given"
                            : "Mark report as delivered"
                        }
                      >
                        <CheckCircle size={16} />
                        <span>{drawerPatient.status === "DELIVERED" ? "Report Given (Delivered)" : "Report Given"}</span>
                      </button>
                    </div>
                  )}

                  {/* ── DELETE PATIENT BUTTON (hidden for CASHIER/TECHNICIAN) ── */}
                  {currentRole !== "CASHIER" && currentRole !== "TECHNICIAN" && (
                    <>
                      {!deleteConfirmOpen ? (
                        <button
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 py-3.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer active:scale-[0.99]"
                        >
                          <Trash2 size={16} />
                          <span>Delete Patient</span>
                        </button>
                      ) : (
                        /* Delete confirmation popup */
                        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <TriangleAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-extrabold text-red-700">Confirm Delete</p>
                              <p className="text-xs text-red-500 font-semibold mt-0.5">
                                This will permanently remove <strong>{drawerPatient.name}</strong>&apos;s entry. This cannot be undone.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeleteConfirmOpen(false)}
                              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDeletePatient}
                              disabled={deletingPatient}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-60"
                            >
                              {deletingPatient
                                ? <RefreshCw size={13} className="animate-spin" />
                                : <><Trash2 size={13} /><span>Yes, Delete</span></>
                              }
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── TECHNICIAN: EDIT PATIENT PROFILE ── */}
                  {currentRole === "TECHNICIAN" && (
                    <button
                      onClick={() => handleOpenEditModal(drawerPatient)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3.5 text-sm font-bold text-white shadow-md hover:from-cyan-600 hover:to-blue-600 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <UserPlus size={16} />
                      <span>Edit Patient Profile</span>
                    </button>
                  )}

                  {/* Technician / Admin result entry actions */}
                  {(currentRole === "TECHNICIAN" || currentRole === "LAB_ADMIN") && 
                   (drawerPatient.status === "LAB_RECEIVED" || drawerPatient.status === "COMPLETED") && (
                    <button onClick={() => { handleOpenResults(drawerPatient); closeDrawer(); }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer mt-2"
                    >
                      <FileSpreadsheet size={16} />
                      {drawerPatient.status === "LAB_RECEIVED" ? "Enter Test Results" : "Edit Results"}
                    </button>
                  )}

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════
          REGISTER NEW PATIENT MODAL
      ══════════════════════════════════ */}
      <AnimatePresence>
        {registerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <h3 className="font-syne text-sm font-extrabold text-slate-800">New Patient Registration</h3>
                <button onClick={() => setRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={handleRegisterPatient} className="space-y-3 sm:space-y-4">
                {/* Name + Age */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Patient Full Name</label>
                    <input type="text" required placeholder="e.g. Ramesh Patil" value={patName}
                      onChange={e => setPatName(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide truncate">Age (Yrs)</label>
                    <input type="number" required min="1" max="120" placeholder="Age" value={patAge}
                      onChange={e => setPatAge(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-center" />
                  </div>
                </div>

                {/* Gender + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Gender</label>
                    <div className="flex gap-2 mt-1">
                      {["Male", "Female", "Other"].map(gen => (
                        <button key={gen} type="button" onClick={() => setPatGender(gen as any)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            patGender === gen ? "bg-cyan-50 border-cyan-500 text-cyan-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >{gen}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Contact Phone (+91)</label>
                    <input type="text" required placeholder="10 digit mobile number" value={patPhone}
                      onChange={e => setPatPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                    {patPhone && patPhone.length !== 10 && (
                      <span className="block text-[9px] text-red-500 font-bold mt-1">Must be exactly 10 digits.</span>
                    )}
                  </div>
                </div>

                {/* Referred Doctor & Registration Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                  <div className="sm:col-span-2 relative">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Referred Doctor / Hospital</label>
                    {docDropdownOpen && patReferredDoctorName.trim().length > 0 && (
                      <div className="fixed inset-0 z-10" onClick={() => setDocDropdownOpen(false)} />
                    )}
                    <input type="text" placeholder="Type doctor name..." value={patReferredDoctorName}
                      onChange={e => {
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
                            <span className="h-3 w-3 animate-spin rounded-full border border-cyan-500 border-t-transparent" />Searching...
                          </div>
                        ) : docSuggestions.length === 0 ? (
                          <div className="px-3.5 py-3 text-center text-slate-400 text-[10px] font-bold">No match — will save as custom referral.</div>
                        ) : (
                          docSuggestions
                            .filter(doc => {
                              const name = doc.doctor_name.toLowerCase();
                              const excludePatterns = ["self / direct", "self/direct", "no referral", "self referral"];
                              return !excludePatterns.some(p => name.includes(p));
                            })
                            .map(doc => (
                              <button key={doc.id} type="button"
                                onClick={() => { setPatReferredDoctorName(doc.doctor_name); setSelectedReferredDoctorId(doc.id); setDocDropdownOpen(false); }}
                                className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col"
                              >
                                <span className="text-[11px] font-extrabold text-slate-700">{doc.doctor_name}</span>
                                <span className="text-[9px] text-slate-400 mt-0.5">{doc.hospital_name}</span>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Registration Date</label>
                    <input type="date" required value={patDate}
                      onChange={e => setPatDate(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white" />
                  </div>
                </div>

                {/* Select Tests */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Select Pathology Panels</label>
                    <div className="relative w-full sm:w-64">
                      <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                      <input type="text" placeholder="Search tests..." value={testSearchQuery}
                        onChange={e => setTestSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                      {testSearchQuery && (
                        <button type="button" onClick={() => setTestSearchQuery("")}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"><X size={12} /></button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {filteredTests.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No matching tests found.</div>
                    ) : filteredTests.map(test => {
                      const sel = selectedTests.some(t => t.id === test.id);
                      return (
                        <button key={test.id} type="button" onClick={() => handleSelectTestToggle(test)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${sel ? "bg-cyan-50/70 border-cyan-500 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                        >
                          <div>
                            <span className="block text-xs font-bold text-slate-800">{test.name}</span>
                            <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                              {test.tube_type} ({test.tube_color})
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800">₹{Number(test.price).toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Required Tubes */}
                {selectedTests.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Beaker size={12} className="text-cyan-500" />Required Sample Tubes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueTubes.map(tube => (
                        <div key={tube.key}
                          className="flex items-center gap-1.5 text-[10px] font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
                          <span className="text-sm">{getTubeEmoji(tube.color)}</span>
                          <span className="text-slate-700">{tube.color} ({tube.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Billing + Initial Payment */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Total Amount</label>
                    <p className="text-lg font-black text-slate-800 mt-1">₹{selectedTests.reduce((s, t) => s + Number(t.price), 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Initial Paid (₹)</label>
                    <input type="number" placeholder="e.g. 500" value={paidAmount}
                      onChange={e => setPaidAmount(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                  </div>
                </div>

                <button type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer">
                  <UserPlus size={14} /><span>Register Patient Profile</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════
          ENTER RESULTS MODAL
      ══════════════════════════════════ */}
      <AnimatePresence>
        {resultsModalOpen && resultsPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setResultsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="font-syne text-sm font-extrabold text-slate-800">Input Diagnostic Parameters</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Patient: {resultsPatient.name} • ID: {resultsPatient.id}</p>
                </div>
                <button onClick={() => setResultsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveResults} className="space-y-6">
                {resultsPatient.tests.map(test => (
                  <div key={test.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
                    <h4 className="text-xs font-black text-slate-800 pb-2 border-b border-slate-100 mb-3 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: test.tube_color.toLowerCase() }} />
                      {test.name} ({test.code})
                    </h4>
                    <div className="space-y-3">
                      {test.parameters.map(param => {
                        const val = resultsData[param.id];
                        const flag = getParamFlag(val, param.min_val, param.max_val);
                        return (
                          <div key={param.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100/50 bg-white">
                            <div className="sm:w-1/3">
                              <span className="block text-xs font-bold text-slate-700">{param.name}</span>
                              <span className="block text-[8px] font-extrabold text-slate-400 uppercase mt-0.5">Ref: {param.min_val} – {param.max_val} {param.unit}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <input type="number" step="any" required placeholder="Value"
                                  value={val === undefined ? "" : val}
                                  onChange={e => setResultsData({ ...resultsData, [param.id]: parseFloat(e.target.value) })}
                                  className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-right pr-8"
                                />
                                <span className="absolute right-2.5 top-2 text-[9px] font-extrabold text-slate-400">{param.unit}</span>
                              </div>
                              {val !== undefined && !isNaN(val) && (
                                <span className={`text-[8px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                  flag !== "NORMAL" ? "bg-rose-50 text-rose-600 border border-rose-100/50 animate-pulse" : "bg-slate-100 text-slate-400"
                                }`}>{flag}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer">
                  <FileText size={14} /><span>Verify and Log Results</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════
          EDIT PATIENT PROFILE MODAL
      ══════════════════════════════════ */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-6 shadow-2xl z-10 max-h-[96vh] sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-100 mb-3 sm:mb-4">
                <h3 className="font-syne text-sm font-extrabold text-slate-800">Edit Patient Profile</h3>
                <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>

              {editErrorMsg && (
                <div className="flex items-center gap-2 p-3 mb-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle size={14} /><span>{editErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleEditPatient} className="space-y-3 sm:space-y-4">
                {/* Name + Age */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Patient Full Name</label>
                    <input id="edit-pat-name" type="text" required placeholder="e.g. Ramesh Patil" value={editPatName}
                      onChange={e => setEditPatName(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide truncate">Age (Yrs)</label>
                    <input id="edit-pat-age" type="number" required min="1" max="120" placeholder="Age" value={editPatAge}
                      onChange={e => setEditPatAge(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-center" />
                  </div>
                </div>

                {/* Gender + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Gender</label>
                    <div className="flex gap-2 mt-1">
                      {["Male", "Female", "Other"].map(gen => (
                        <button key={gen} type="button" onClick={() => setEditPatGender(gen as any)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            editPatGender === gen ? "bg-cyan-50 border-cyan-500 text-cyan-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >{gen}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Contact Phone (+91)</label>
                    <input id="edit-pat-phone" type="text" required placeholder="10 digit mobile number" value={editPatPhone}
                      onChange={e => setEditPatPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                    {editPatPhone && editPatPhone.length !== 10 && (
                      <span className="block text-[9px] text-red-500 font-bold mt-1">Must be exactly 10 digits.</span>
                    )}
                  </div>
                </div>

                {/* Referred Doctor */}
                <div className="relative">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Referred Doctor / Hospital</label>
                  {editDocDropdownOpen && editPatReferredDoctorName.trim().length > 0 && (
                    <div className="fixed inset-0 z-10" onClick={() => setEditDocDropdownOpen(false)} />
                  )}
                  <input id="edit-pat-referred-doctor-name" type="text" placeholder="Type doctor name..." value={editPatReferredDoctorName}
                    onChange={e => {
                      const v = e.target.value;
                      setEditPatReferredDoctorName(v);
                      setEditSelectedReferredDoctorId("");
                      setEditDocDropdownOpen(v.trim().length > 0);
                    }}
                    className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 relative z-20"
                  />
                  {editDocDropdownOpen && editPatReferredDoctorName.trim().length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-40 overflow-y-auto py-1">
                      {editSearchingDocs ? (
                        <div className="px-3.5 py-3 text-center text-slate-400 text-[10px] font-bold flex items-center justify-center gap-2">
                          <span className="h-3 w-3 animate-spin rounded-full border border-cyan-500 border-t-transparent" />Searching...
                        </div>
                      ) : editDocSuggestions.length === 0 ? (
                        <div className="px-3.5 py-3 text-center text-slate-400 text-[10px] font-bold">No match — will save as custom referral.</div>
                      ) : (
                        editDocSuggestions
                          .filter(doc => {
                            const name = doc.doctor_name.toLowerCase();
                            const excludePatterns = ["self / direct", "self/direct", "no referral", "self referral"];
                            return !excludePatterns.some(p => name.includes(p));
                          })
                          .map(doc => (
                            <button key={doc.id} type="button"
                              onClick={() => { setEditPatReferredDoctorName(doc.doctor_name); setEditSelectedReferredDoctorId(doc.id); setEditDocDropdownOpen(false); }}
                              className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col"
                            >
                              <span className="text-[11px] font-extrabold text-slate-700">{doc.doctor_name}</span>
                              <span className="text-[9px] text-slate-400 mt-0.5">{doc.hospital_name}</span>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>

                {/* Select Tests */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Update Pathology Panels</label>
                    <div className="relative w-full sm:w-64">
                      <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
                      <input id="edit-test-search-query" type="text" placeholder="Search tests..." value={editTestSearchQuery}
                        onChange={e => setEditTestSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                      {editTestSearchQuery && (
                        <button type="button" onClick={() => setEditTestSearchQuery("")}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"><X size={12} /></button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {filteredTestsEdit.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No matching tests found.</div>
                    ) : filteredTestsEdit.map(test => {
                      const sel = editSelectedTests.some(t => t.id === test.id);
                      return (
                        <button key={test.id} type="button" onClick={() => handleSelectTestToggleEdit(test)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${sel ? "bg-cyan-50/70 border-cyan-500 shadow-sm" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                        >
                          <div>
                            <span className="block text-xs font-bold text-slate-800">{test.name}</span>
                            <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                              {test.tube_type} ({test.tube_color})
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800">₹{Number(test.price).toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <button id="edit-submit-btn" type="submit" disabled={updatingPatient}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer">
                  {updatingPatient ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Updating Patient Profile...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
