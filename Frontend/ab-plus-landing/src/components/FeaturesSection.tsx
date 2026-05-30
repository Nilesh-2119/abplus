"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Users,
  UserPlus,
  LayoutDashboard,
  FileText,
  Download,
  ClipboardList,
  Building2,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Multi-User Workflow",
    description:
      "Role-based access for collection boys, cashiers, technicians, and admins. Everyone sees only what they need.",
    gradient: "from-blue-500/20 to-blue-600/5",
  },
  {
    icon: UserPlus,
    title: "Smart Patient Entry",
    description:
      "Quick patient registration with auto-fill, test selection, and instant billing in under 30 seconds.",
    gradient: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    icon: LayoutDashboard,
    title: "Technician Dashboard",
    description:
      "Clean, focused interface for technicians to enter results, with smart validations and reference ranges.",
    gradient: "from-purple-500/20 to-purple-600/5",
  },
  {
    icon: FileText,
    title: "Smart Report Generation",
    description:
      "Auto-generated professional reports with lab branding, reference ranges, and doctor verification.",
    gradient: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    icon: Download,
    title: "PDF Download & Share",
    description:
      "One-click PDF downloads, WhatsApp sharing, and email delivery. Reports reach patients instantly.",
    gradient: "from-rose-500/20 to-rose-600/5",
  },
  {
    icon: ClipboardList,
    title: "Audit Logs",
    description:
      "Complete audit trail for every action. Track who did what, when, with full accountability.",
    gradient: "from-amber-500/20 to-amber-600/5",
  },
  {
    icon: Building2,
    title: "Multi-Lab Architecture",
    description:
      "Manage multiple lab branches from one dashboard. Centralized control with branch-level independence.",
    gradient: "from-indigo-500/20 to-indigo-600/5",
  },
  {
    icon: ShieldCheck,
    title: "Secure Access",
    description:
      "Enterprise-grade security with encrypted data, role-based permissions, and secure cloud infrastructure.",
    gradient: "from-teal-500/20 to-teal-600/5",
  },
  {
    icon: BarChart3,
    title: "Modern Dashboard",
    description:
      "Real-time analytics showing patient flow, revenue, test trends, and team performance at a glance.",
    gradient: "from-violet-500/20 to-violet-600/5",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="glass-card glass-card-hover p-6 group cursor-default"
    >
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
      >
        <feature.icon size={22} className="text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors duration-300">
        {feature.title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

export default function FeaturesSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[150px]" />
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
              Everything You Need
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Powerful{" "}
            <span className="gradient-text">Features</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-xl mx-auto"
          >
            Built for modern labs that demand speed, accuracy, and simplicity.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
