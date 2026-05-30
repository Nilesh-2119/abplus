"use client";

import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Zap, Users, ShieldCheck, Clock } from "lucide-react";

function AnimatedCounter({ value, suffix = "", duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, value, { duration });
      const unsub = rounded.on("change", (v) => setDisplayValue(v));
      return () => {
        controls.stop();
        unsub();
      };
    }
  }, [isInView, value, duration, motionValue, rounded]);

  return (
    <span ref={ref} className="tabular-nums">
      {displayValue}
      {suffix}
    </span>
  );
}

const stats = [
  {
    icon: Zap,
    value: 60,
    suffix: "%",
    label: "Faster Workflow",
    description: "Compared to manual processes",
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-400",
    glowColor: "rgba(34, 211, 238, 0.15)",
  },
  {
    icon: Clock,
    value: 75,
    suffix: "%",
    label: "Reduced Manual Work",
    description: "Through smart automation",
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-400",
    glowColor: "rgba(59, 130, 246, 0.15)",
  },
  {
    icon: Users,
    value: 50,
    suffix: "+",
    label: "Multi-User Support",
    description: "Concurrent active users",
    color: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-purple-400",
    glowColor: "rgba(139, 92, 246, 0.15)",
  },
  {
    icon: ShieldCheck,
    value: 99,
    suffix: ".9%",
    label: "Secure Cloud Uptime",
    description: "Enterprise-grade reliability",
    color: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-400",
    glowColor: "rgba(52, 211, 153, 0.15)",
  },
];

export default function StatsSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 radial-glow-bottom" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass-card glass-card-hover p-6 text-center relative overflow-hidden group"
            >
              {/* Glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${stat.glowColor}, transparent 70%)`,
                }}
              />

              <div className="relative z-10">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} border border-white/10 flex items-center justify-center mx-auto mb-4`}
                >
                  <stat.icon size={24} className={stat.iconColor} />
                </div>

                <div className="text-3xl lg:text-4xl font-bold text-white mb-1">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-base font-semibold text-white mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-slate-400">{stat.description}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
