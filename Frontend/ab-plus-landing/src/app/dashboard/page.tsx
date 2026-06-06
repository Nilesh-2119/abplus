"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiService } from "@/services/api";
import {
  LayoutDashboard,
  ClipboardList,
  Printer,
  Beaker,
  Users,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  User,
  LogOut,
  RefreshCw,
  Stethoscope,
  FolderCheck,
  Percent,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Sub-views imports
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import PatientWorkflow from "@/components/dashboard/PatientWorkflow";
import ReportsSection from "@/components/dashboard/ReportsSection";
import TestManagement from "@/components/dashboard/TestManagement";
import StaffManagement from "@/components/dashboard/StaffManagement";
import ActivityLogs from "@/components/dashboard/ActivityLogs";
import LabSettings from "@/components/dashboard/LabSettings";
import ReferredDoctors from "@/components/dashboard/ReferredDoctors";
import CollectionBoyDashboard from "@/components/dashboard/CollectionBoyDashboard";
import CashierDashboard from "@/components/dashboard/CashierDashboard";
import CommissionReports from "@/components/dashboard/CommissionReports";
import InformativeReports from "@/components/dashboard/InformativeReports";

type UserRole = "SUPER_ADMIN" | "LAB_ADMIN" | "CASHIER" | "TECHNICIAN" | "COLLECTION_BOY";
type TabId = "overview" | "workflow" | "received-samples" | "reports" | "tests" | "staff" | "logs" | "settings" | "doctors" | "commission" | "informative-reports";

interface NavItem {
  id: TabId;
  label: string;
  icon: any;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "workflow", label: "Patient Workflow", icon: ClipboardList },
  { id: "received-samples", label: "Received Samples", icon: FolderCheck },
  { id: "informative-reports", label: "Informative Reports", icon: BarChart3 },
  { id: "reports", label: "Blood Reports", icon: Printer },
  { id: "commission", label: "Commission Reports", icon: Percent },
  { id: "tests", label: "Test Catalog", icon: Beaker },
  { id: "staff", label: "Staff Directory", icon: Users },
  { id: "doctors", label: "Referred Doctors", icon: Stethoscope },
  { id: "logs", label: "Activity Logs", icon: History },
  { id: "settings", label: "Lab Settings", icon: Settings },
];

function LabDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Lab ID (Multi-tenant scope)
  const [labId, setLabId] = useState("LAB-DEFAULT");
  const [labCode, setLabCode] = useState("");

  // Current logged in user details simulation
  const [currentRole, setCurrentRole] = useState<UserRole>("LAB_ADMIN");
  const [userName, setUserName] = useState("Laboratory Director");
  const [userEmail, setUserEmail] = useState("");
  const [labName, setLabName] = useState("AB+ Diagnostic Laboratory");

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Date State for Collection Boy Dashboard (Sync header display)
  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Sync role and tab with URL / local state
  useEffect(() => {
    // If role parameter is present in URL, strip it to prevent spoofing
    if (searchParams.has("role")) {
      const params = new URLSearchParams(window.location.search);
      params.delete("role");
      const query = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/dashboard${query}`);
      return;
    }

    apiService.getProfile()
      .then((user) => {
        if (user.role === "SUPER_ADMIN") {
          router.push("/super-admin");
          return;
        }
        setUserName(user.name);
        setUserEmail(user.phone_number || user.email || user.username);
        setLabName(user.lab_name);
        if (user.lab_id) {
          setLabId(user.lab_id);
        }
        if (user.lab_code) {
          setLabCode(user.lab_code);
        }
        setCurrentRole(user.role);
      })
      .catch((err) => {
        console.error("Auth guard error:", err);
        router.push("/");
      });

    const tabParam = searchParams.get("tab") as TabId;
    if (tabParam && ["overview", "workflow", "received-samples", "reports", "tests", "staff", "logs", "settings", "doctors", "commission", "informative-reports"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, router]);

  const handleLogout = () => {
    apiService.logout();
    router.push("/");
  };

  // Determine which tabs are visible for the current role
  const getAllowedTabs = (): TabId[] => {
    switch (currentRole) {
      case "LAB_ADMIN":
        return ["overview", "workflow", "informative-reports", "reports", "commission", "tests", "staff", "doctors", "logs", "settings"];
      case "CASHIER":
        return ["overview", "workflow", "reports", "logs"];
      case "TECHNICIAN":
        return ["received-samples", "workflow", "reports", "tests"];
      case "COLLECTION_BOY":
        return ["overview", "workflow"];
      default:
        return ["workflow"];
    }
  };

  const allowedTabs = getAllowedTabs();

  // If the active tab is not allowed for the selected role, reset it
  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      const defaultTab = allowedTabs[0] || "workflow";
      setActiveTab(defaultTab);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", defaultTab);
      router.push(`?${params.toString()}`);
    }
  }, [currentRole, allowedTabs, activeTab]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.push(`?${params.toString()}`);
  };

  // Get active menu list, preserving role's allowedTabs specific order
  const navItems = allowedTabs
    .map((tabId) => ALL_NAV_ITEMS.find((item) => item.id === tabId))
    .filter((item): item is NavItem => !!item);

  const getRoleDisplayLabel = (role: UserRole) => {
    switch (role) {
      case "LAB_ADMIN": return "Doctor / Lab Admin";
      case "CASHIER": return "Cashier";
      case "TECHNICIAN": return "Lab Technician";
      case "COLLECTION_BOY": return "Collection Boy";
      default: return role;
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "overview":
        return labName;
      case "workflow":
      case "received-samples":
        // Show user name + role instead of generic title
        return null; // rendered separately below
      case "informative-reports":
        return "Informative Reports Center";
      case "reports":
        return "Blood Reports Portal";
      case "commission":
        return "Doctor Commission Reports";
      case "tests":
        return "Diagnostic Catalog & Ranges";
      case "staff":
        return "Staff Management";
      case "doctors":
        return "Referred Doctors";
      case "logs":
        return "Workspace Audit Logs";
      case "settings":
        return "Letterhead & Lab Settings";
      default:
        return "Lab Dashboard";
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-md transition-all duration-300 shrink-0 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-syne text-sm font-extrabold text-white shadow-md shadow-cyan-500/20">
            AB+
          </div>
          {!sidebarCollapsed && (
            <span className="font-syne text-[15px] font-extrabold tracking-tight text-slate-800">
              Lab Workspace
            </span>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-bold transition-all relative ${
                  isActive
                    ? "text-cyan-600 bg-cyan-50/70 shadow-sm shadow-cyan-500/5"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-tab"
                    className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-cyan-500"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={18} className={isActive ? "text-cyan-500" : "text-slate-400"} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User profile footer info */}
        <div className="border-t border-slate-100 p-3">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100/50 mb-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold flex items-center justify-center text-xs">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold text-slate-700 truncate">{userName}</p>
                <p className="text-[9px] text-slate-400 font-semibold truncate leading-tight mt-0.5">{currentRole.replace("_", " ")}</p>
              </div>
            </div>
          ) : null}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex w-full items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-64 h-full bg-white p-5 shadow-2xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-syne text-sm font-extrabold text-white">
                    AB+
                  </div>
                  <span className="font-syne text-[15px] font-extrabold tracking-tight text-slate-800">
                    Lab Workspace
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 mt-5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                        isActive
                          ? "text-cyan-600 bg-cyan-50 shadow-sm border border-cyan-100/50"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={18} className={isActive ? "text-cyan-500" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>AB+ Pathology SaaS</span>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Dashboard Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between px-4 md:px-8 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-sm shadow-slate-100/30">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
            >
              <Menu size={18} />
            </button>
            {currentRole === "COLLECTION_BOY" ? (
              <div>
                <h1 className="font-syne text-[15px] md:text-[16px] font-extrabold text-slate-800 tracking-tight leading-tight">
                  {userName}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                  {getRoleDisplayLabel(currentRole)}
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  Date: {selectedDate}
                </p>
              </div>
            ) : (activeTab === "workflow" || activeTab === "received-samples") ? (
              <div>
                <h1 className="font-syne text-[15px] md:text-[16px] font-extrabold text-slate-800 tracking-tight leading-tight">
                  {userName}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                  {getRoleDisplayLabel(currentRole)}
                </p>
              </div>
            ) : (
              <h1 className="font-syne text-[14px] md:text-[15px] font-extrabold text-slate-800 tracking-tight">
                {getHeaderTitle()}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {/* Logged in User Role Display */}
            <div className="hidden sm:flex items-center gap-1.5 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 shadow-sm" style={{ whiteSpace: "nowrap" }}>
              <span>Logged in as:</span>
              <span className="font-bold text-slate-800">
                {currentRole === "LAB_ADMIN" ? "Doctor / Lab Admin" :
                 currentRole === "CASHIER" ? "Cashier" :
                 currentRole === "TECHNICIAN" ? "Technician" :
                 currentRole === "COLLECTION_BOY" ? "Collection Boy" : currentRole}
              </span>
            </div>


            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
              title="Logout to landing page"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Subviews render panels */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${currentRole}`}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {activeTab === "overview" && allowedTabs.includes("overview") && (
                  currentRole === "COLLECTION_BOY" ? (
                    <CollectionBoyDashboard
                      labId={labId}
                      currentRole={currentRole}
                      userName={userName}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                    />
                  ) : currentRole === "CASHIER" ? (
                    <CashierDashboard
                      labId={labId}
                      currentRole={currentRole}
                      userName={userName}
                    />
                  ) : (
                    <DashboardOverview labId={labId} currentRole={currentRole} labCode={labCode} />
                  )
                )}
                {activeTab === "workflow" && (
                  <PatientWorkflow labId={labId} currentRole={currentRole} userName={userName} initialTab="patients" />
                )}
                {activeTab === "received-samples" && (
                  <PatientWorkflow labId={labId} currentRole={currentRole} userName={userName} initialTab="received" />
                )}
                {activeTab === "reports" && (
                  <ReportsSection labId={labId} currentRole={currentRole} />
                )}
                {activeTab === "informative-reports" && (
                  <InformativeReports labId={labId} currentRole={currentRole} />
                )}
                {activeTab === "commission" && (
                  <CommissionReports labId={labId} currentRole={currentRole} />
                )}
                {activeTab === "tests" && (
                  <TestManagement labId={labId} currentRole={currentRole} />
                )}
                {activeTab === "staff" && (
                  <StaffManagement labId={labId} currentRole={currentRole} />
                )}
                {activeTab === "doctors" && (
                  <ReferredDoctors labId={labId} currentRole={currentRole} />
                )}
                {activeTab === "logs" && (
                  <ActivityLogs labId={labId} />
                )}
                {activeTab === "settings" && (
                  <LabSettings labId={labId} labCode={labCode} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LabDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen flex-col items-center justify-center text-slate-400 bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="mt-3 font-semibold text-xs">Loading laboratory dashboard...</span>
      </div>
    }>
      <LabDashboardContent />
    </Suspense>
  );
}
