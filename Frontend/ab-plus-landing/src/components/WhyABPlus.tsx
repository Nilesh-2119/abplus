"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Zap,
  Layers,
  Paintbrush,
  Clock,
  Cloud,
  Globe,
} from "lucide-react";

const reasons = [
  {
    icon: Zap,
    title: "Simpler Workflow",
    description:
      "No more confusion between roles. Each team member has a clear, focused interface for their specific tasks.",
    color: "text-cyan-400",
    bgColor: "from-cyan-500/15 to-cyan-600/5",
  },
  {
    icon: Layers,
    title: "Reduced Confusion",
    description:
      "Structured process flow ensures nothing falls through the cracks. Every sample and report is tracked end-to-end.",
    color: "text-blue-400",
    bgColor: "from-blue-500/15 to-blue-600/5",
  },
  {
    icon: Paintbrush,
    title: "Modern UI",
    description:
      "Clean, intuitive interfaces that your staff will actually enjoy using. No training manuals needed.",
    color: "text-purple-400",
    bgColor: "from-purple-500/15 to-purple-600/5",
  },
  {
    icon: Clock,
    title: "Faster Reports",
    description:
      "Auto-generated reports with smart templates. Results go from technician to PDF in seconds, not hours.",
    color: "text-emerald-400",
    bgColor: "from-emerald-500/15 to-emerald-600/5",
  },
  {
    icon: Cloud,
    title: "Cloud-Based System",
    description:
      "Access your lab data from anywhere. No server maintenance, no backups to worry about. Always up to date.",
    color: "text-sky-400",
    bgColor: "from-sky-500/15 to-sky-600/5",
  },
  {
    icon: Globe,
    title: "Built for Indian Labs",
    description:
      "Designed specifically for Indian pathology labs — with INR billing, local test formats, and regional compliance.",
    color: "text-amber-400",
    bgColor: "from-amber-500/15 to-amber-600/5",
  },
];

export default function WhyABPlus() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="why-abplus"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      <div className="absolute inset-0 radial-glow" />

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
              The AB+ Advantage
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Why Choose{" "}
            <span className="gradient-text">AB+</span>?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-xl mx-auto"
          >
            Purpose-built for pathology labs that want to move fast and stay
            organized.
          </motion.p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="glass-card glass-card-hover p-6 group"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${reason.bgColor} border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <reason.icon size={22} className={reason.color} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {reason.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {reason.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
