"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  FileText,
  Users,
  Activity,
  TrendingUp,
  Clock,
} from "lucide-react";

function FloatingCard({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={`glass-card p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Main Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        className="glass-card p-6 rounded-2xl relative z-10"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-400">
            <Activity size={12} />
            <span>AB+ Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Today's Patients",
              value: "147",
              change: "+12%",
              icon: Users,
              color: "from-blue-500/20 to-blue-600/5",
            },
            {
              label: "Reports Ready",
              value: "89",
              change: "+8%",
              icon: FileText,
              color: "from-cyan-500/20 to-cyan-600/5",
            },
            {
              label: "Revenue",
              value: "₹1.2L",
              change: "+15%",
              icon: TrendingUp,
              color: "from-purple-500/20 to-purple-600/5",
            },
            {
              label: "Avg Time",
              value: "24min",
              change: "-18%",
              icon: Clock,
              color: "from-emerald-500/20 to-emerald-600/5",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 + i * 0.1 }}
              className={`rounded-xl bg-gradient-to-br ${stat.color} border border-white/5 p-3`}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon size={14} className="text-slate-400" />
                <span
                  className={`text-xs font-medium ${
                    stat.change.startsWith("+")
                      ? "text-emerald-400"
                      : "text-cyan-400"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-300">
              Weekly Reports
            </span>
            <div className="flex gap-2">
              <span className="px-2 py-1 text-[10px] bg-blue-500/20 text-blue-400 rounded-md">
                Daily
              </span>
              <span className="px-2 py-1 text-[10px] bg-white/5 text-slate-400 rounded-md">
                Weekly
              </span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-24">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.8, delay: 0.8 + i * 0.05 }}
                className="flex-1 rounded-t-md bg-gradient-to-t from-blue-500/60 to-cyan-400/30"
              />
            ))}
          </div>
        </div>

        {/* Table Preview */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <div className="text-sm font-medium text-slate-300 mb-3">
            Recent Patients
          </div>
          {[
            {
              name: "Rajesh Kumar",
              test: "CBC, Lipid",
              status: "Report Ready",
              statusColor: "text-emerald-400 bg-emerald-400/10",
            },
            {
              name: "Priya Sharma",
              test: "Thyroid Panel",
              status: "Processing",
              statusColor: "text-yellow-400 bg-yellow-400/10",
            },
            {
              name: "Amit Patel",
              test: "HbA1c, KFT",
              status: "Collected",
              statusColor: "text-blue-400 bg-blue-400/10",
            },
          ].map((row, i) => (
            <motion.div
              key={row.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.2 + i * 0.1 }}
              className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] font-medium text-white">
                  {row.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    {row.name}
                  </div>
                  <div className="text-[10px] text-slate-500">{row.test}</div>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-1 rounded-full font-medium ${row.statusColor}`}
              >
                {row.status}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating Cards */}
      <FloatingCard
        className="absolute -top-4 right-0 lg:-right-4 z-20 float-animation"
        delay={1}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <BarChart3 size={14} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">+23%</div>
            <div className="text-[10px] text-slate-400">Efficiency</div>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard
        className="absolute -bottom-4 left-0 lg:-left-4 z-20 float-animation-delayed"
        delay={1.2}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <FileText size={14} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">89 Reports</div>
            <div className="text-[10px] text-slate-400">Generated Today</div>
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center pt-[72px] overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute inset-0 radial-glow" />

      {/* Animated Blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animated-blob" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/8 rounded-full blur-[120px] animated-blob-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pulse-glow" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-slate-300 font-medium">
              Cloud-Based Lab Management
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            <span className="text-white">Manage Your Pathology Lab</span>
            <br />
            <span className="gradient-text">Smarter with AB+</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Patient management, technician workflow, billing, and smart report
            generation — all in one modern platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#contact" className="btn-primary text-base" style={{ padding: '0.875rem 2rem' }}>
              Book a Demo
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
            <a href="#features" className="btn-outline text-base" style={{ padding: '0.875rem 2rem' }}>
              Explore Features
            </a>
          </motion.div>
        </div>

        {/* Dashboard Mockup */}
        <DashboardMockup />
      </div>
    </section>
  );
}
