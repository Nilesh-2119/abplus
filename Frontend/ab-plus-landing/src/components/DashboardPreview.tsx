"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  BarChart3,
  Users,
  FileText,
  CreditCard,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  Microscope,
  Download,
} from "lucide-react";

function AdminDashboard() {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400/80" />
          <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
          <div className="w-2 h-2 rounded-full bg-green-400/80" />
        </div>
        <span className="text-xs text-slate-400 px-2 py-1 bg-white/5 rounded-md">
          Admin Dashboard
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total Patients", value: "2,847", icon: Users, color: "text-blue-400" },
          { label: "Revenue", value: "₹4.2L", icon: TrendingUp, color: "text-emerald-400" },
          { label: "Pending", value: "23", icon: Clock, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
            <s.icon size={14} className={s.color} />
            <div className="text-base font-bold text-white mt-1">{s.value}</div>
            <div className="text-[10px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-300 font-medium">Monthly Revenue</span>
          <BarChart3 size={12} className="text-slate-500" />
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {[30, 45, 55, 40, 70, 60, 80, 65, 90, 75, 85, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-blue-500/50 to-cyan-400/20"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TechnicianPanel() {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400/80" />
          <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
          <div className="w-2 h-2 rounded-full bg-green-400/80" />
        </div>
        <span className="text-xs text-slate-400 px-2 py-1 bg-white/5 rounded-md">
          Technician Panel
        </span>
      </div>

      <div className="space-y-2.5">
        {[
          { name: "Hemoglobin", value: "13.5 g/dL", range: "12-16", status: "normal" },
          { name: "WBC Count", value: "8,200 /μL", range: "4000-11000", status: "normal" },
          { name: "Platelet", value: "1.2 L/μL", range: "1.5-4.5", status: "low" },
          { name: "RBC Count", value: "4.8 M/μL", range: "4.5-5.5", status: "normal" },
        ].map((test) => (
          <div
            key={test.name}
            className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5"
          >
            <div className="flex items-center gap-3">
              <Microscope size={14} className="text-purple-400" />
              <div>
                <div className="text-xs font-medium text-slate-200">{test.name}</div>
                <div className="text-[10px] text-slate-500">Ref: {test.range}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{test.value}</span>
              {test.status === "normal" ? (
                <CheckCircle2 size={14} className="text-emerald-400" />
              ) : (
                <Activity size={14} className="text-amber-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CashierPanel() {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400/80" />
          <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
          <div className="w-2 h-2 rounded-full bg-green-400/80" />
        </div>
        <span className="text-xs text-slate-400 px-2 py-1 bg-white/5 rounded-md">
          Cashier Panel
        </span>
      </div>

      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5 mb-3">
        <div className="text-xs text-slate-400 mb-1">Patient: Rajesh Kumar</div>
        <div className="text-xs text-slate-500 mb-3">ID: #PAT-2847</div>
        <div className="space-y-2">
          {[
            { test: "Complete Blood Count", price: "₹450" },
            { test: "Lipid Profile", price: "₹600" },
            { test: "Thyroid Panel", price: "₹800" },
          ].map((item) => (
            <div key={item.test} className="flex justify-between text-xs">
              <span className="text-slate-300">{item.test}</span>
              <span className="text-white font-medium">{item.price}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-3 pt-3 flex justify-between">
          <span className="text-xs font-medium text-slate-300">Total</span>
          <span className="text-sm font-bold text-cyan-400">₹1,850</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 py-2 text-xs font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg">
          <CreditCard size={12} className="inline mr-1" />
          Pay
        </button>
        <button className="flex-1 py-2 text-xs font-medium bg-white/5 text-slate-300 rounded-lg border border-white/10">
          Print
        </button>
      </div>
    </div>
  );
}

function ReportPanel() {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400/80" />
          <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
          <div className="w-2 h-2 rounded-full bg-green-400/80" />
        </div>
        <span className="text-xs text-slate-400 px-2 py-1 bg-white/5 rounded-md">
          Report Screen
        </span>
      </div>

      <div className="bg-white/[0.03] rounded-xl border border-white/5 p-4">
        {/* Report Header */}
        <div className="text-center mb-3 pb-3 border-b border-white/5">
          <div className="text-sm font-bold text-white">AB+ Diagnostics</div>
          <div className="text-[10px] text-slate-500">Blood Test Report</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mb-3">
          <div>Patient: <span className="text-white">R. Kumar</span></div>
          <div>Age: <span className="text-white">35/M</span></div>
          <div>Date: <span className="text-white">19 May 2026</span></div>
          <div>Ref: <span className="text-white">Dr. Sharma</span></div>
        </div>

        <div className="space-y-1.5 mb-3">
          {[
            { test: "Hemoglobin", val: "13.5", unit: "g/dL", flag: "" },
            { test: "WBC", val: "8,200", unit: "/μL", flag: "" },
            { test: "Platelets", val: "1.2", unit: "L/μL", flag: "↓" },
          ].map((r) => (
            <div
              key={r.test}
              className="flex justify-between text-[10px] py-1 border-b border-white/5"
            >
              <span className="text-slate-300">{r.test}</span>
              <span className="text-white font-medium">
                {r.val} {r.unit}{" "}
                {r.flag && <span className="text-amber-400">{r.flag}</span>}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button className="flex-1 py-1.5 text-[10px] font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg flex items-center justify-center gap-1">
            <Download size={10} />
            PDF
          </button>
          <button className="flex-1 py-1.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-lg">
            <CheckCircle2 size={10} className="inline mr-1" />
            Verified
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPreview() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const panels = [
    { component: <AdminDashboard />, label: "Admin Dashboard" },
    { component: <TechnicianPanel />, label: "Technician Panel" },
    { component: <CashierPanel />, label: "Cashier Panel" },
    { component: <ReportPanel />, label: "Report Screen" },
  ];

  return (
    <section
      id="dashboard"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
          >
            <span className="text-sm text-slate-300 font-medium">
              See It In Action
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Beautiful{" "}
            <span className="gradient-text">Dashboards</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-xl mx-auto"
          >
            Every role gets a purpose-built interface designed for speed and
            clarity.
          </motion.p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {panels.map((panel, i) => (
            <motion.div
              key={panel.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="group"
            >
              {panel.component}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
