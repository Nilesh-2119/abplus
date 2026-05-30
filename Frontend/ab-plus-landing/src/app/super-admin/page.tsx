"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiService } from "@/services/api";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  X,
  User,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Sub-views imports
import DashboardView from "@/components/super-admin/DashboardView";
import LabsManagementView from "@/components/super-admin/LabsManagementView";
import UsersManagementView from "@/components/super-admin/UsersManagementView";
import ActivityLogsView from "@/components/super-admin/ActivityLogsView";
import SettingsView from "@/components/super-admin/SettingsView";

type ActiveTab = "dashboard" | "labs" | "users" | "logs" | "settings";

function SuperAdminDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Authenticated Super Admin Route Guard
  useEffect(() => {
    apiService.getProfile()
      .then((user) => {
        if (user.role !== "SUPER_ADMIN") {
          router.push("/");
        }
      })
      .catch((err) => {
        console.error("Auth guard error:", err);
        router.push("/");
      });
  }, [router]);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ActiveTab;
    if (
      tabParam &&
      ["dashboard", "labs", "users", "logs", "settings"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    // Update URL query parameter
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.push(`?${params.toString()}`);
  };

  const handleLogout = () => {
    apiService.logout();
    router.push("/");
  };

  // Sidebar navigation elements definitions
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "labs", label: "Labs Directory", icon: Building2 },
    { id: "users", label: "Users Directory", icon: Users },
    { id: "logs", label: "Activity Logs", icon: FileText },
    { id: "settings", label: "System Settings", icon: Settings },
  ] as const;

  // Header Title mapping helper
  const getHeaderTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "SaaS Super Admin Dashboard";
      case "labs":
        return "Lab Tenant Management";
      case "users":
        return "User Administration";
      case "logs":
        return "System Audit Logs";
      case "settings":
        return "Platform Configurations";
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ── Left Sidebar: Desktop ── */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-md transition-all duration-300 shrink-0 ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Branding Title logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 font-syne text-sm font-extrabold text-white shadow-md shadow-sky-500/20">
            A+
          </div>
          {!sidebarCollapsed && (
            <span className="font-syne text-[15px] font-extrabold tracking-tight text-slate-800">
              AB<span className="text-sky-500 font-extrabold">+</span> Super Admin
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
                    ? "text-sky-600 bg-sky-50/70 shadow-sm shadow-sky-500/5"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-sky-500"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={18} className={isActive ? "text-sky-500" : "text-slate-400"} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse Sidebar Button */}
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex w-full items-center justify-center rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* ── Left Sidebar: Mobile Menu Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-64 h-full bg-white p-5 shadow-2xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 font-syne text-sm font-extrabold text-white">
                    A+
                  </div>
                  <span className="font-syne text-[15px] font-extrabold tracking-tight text-slate-800">
                    AB+ Admin
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
                          ? "text-sky-600 bg-sky-50 shadow-sm border border-sky-100/50"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={18} className={isActive ? "text-sky-500" : "text-slate-400"} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>AB+ Version 1.0.0</span>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── Main Viewport Content ── */}
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
            <h1 className="font-syne text-[14px] md:text-[16px] font-extrabold text-slate-800 tracking-tight">
              {getHeaderTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications panel toggle */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-xl border border-slate-200/80 bg-white p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shadow-sm cursor-pointer"
              >
                <Bell size={16} />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                </span>
              </button>

              {/* Notification drop-down drawer list */}
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 text-xs font-semibold text-slate-600"
                    >
                      <h4 className="font-syne font-bold text-slate-800 pb-2 border-b border-slate-100">
                        System Notifications
                      </h4>
                      <div className="mt-2.5 space-y-2.5">
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-slate-50 last:border-0">
                          <span className="text-slate-700">Database backup executed successfully</span>
                          <span className="text-[9px] text-slate-400 font-medium">10 mins ago</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-slate-50 last:border-0">
                          <span className="text-slate-700">Apex Diagnostics patient volume peaked</span>
                          <span className="text-[9px] text-slate-400 font-medium">3 hours ago</span>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
              title="Logout to landing page"
            >
              <LogOut size={16} />
            </button>

            {/* Profile Dropdown panel */}
            <div className="flex items-center gap-3.5 pl-4 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-bold text-slate-800">Super Admin</span>
                <span className="block text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100/50 mt-0.5 uppercase tracking-wider">
                  Operator
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-600 font-syne font-extrabold flex items-center justify-center border border-indigo-200/50 text-[13px] shadow-inner shadow-indigo-200/20">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Panel Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {activeTab === "dashboard" && (
                  <DashboardView
                    onNavigateToLabs={() => handleTabChange("labs")}
                    onNavigateToUsers={() => handleTabChange("users")}
                    onNavigateToLogs={() => handleTabChange("logs")}
                  />
                )}
                {activeTab === "labs" && <LabsManagementView />}
                {activeTab === "users" && <UsersManagementView />}
                {activeTab === "logs" && <ActivityLogsView />}
                {activeTab === "settings" && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen flex-col items-center justify-center text-slate-400 bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        <span className="mt-3 font-semibold text-xs">Initializing dashboard...</span>
      </div>
    }>
      <SuperAdminDashboardContent />
    </Suspense>
  );
}
