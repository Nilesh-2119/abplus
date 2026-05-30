"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UserCheck, CreditCard, Microscope, FileText } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    title: "Collection Boy",
    description:
      "Collects patient samples with digital tracking. Each sample is tagged and logged instantly in the system.",
    color: "from-blue-500 to-blue-600",
    glowColor: "rgba(59, 130, 246, 0.3)",
    bgColor: "from-blue-500/15 to-blue-600/5",
  },
  {
    icon: CreditCard,
    title: "Cashier",
    description:
      "Processes billing, generates invoices, and manages payments. Full financial tracking with audit logs.",
    color: "from-cyan-400 to-cyan-500",
    glowColor: "rgba(34, 211, 238, 0.3)",
    bgColor: "from-cyan-500/15 to-cyan-600/5",
  },
  {
    icon: Microscope,
    title: "Technician",
    description:
      "Runs tests and enters results through a streamlined dashboard. Smart validation ensures accuracy.",
    color: "from-purple-500 to-purple-600",
    glowColor: "rgba(139, 92, 246, 0.3)",
    bgColor: "from-purple-500/15 to-purple-600/5",
  },
  {
    icon: FileText,
    title: "Report Generation",
    description:
      "Auto-generates professional PDF reports. Doctors can review, approve, and share with patients instantly.",
    color: "from-emerald-400 to-emerald-500",
    glowColor: "rgba(52, 211, 153, 0.3)",
    bgColor: "from-emerald-500/15 to-emerald-600/5",
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15 }}
      className="relative flex flex-col items-center"
    >
      {/* Connector Line */}
      {index < steps.length - 1 && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: index * 0.15 + 0.3 }}
          className="hidden lg:block absolute top-12 left-[60%] w-full h-[2px] origin-left"
          style={{
            background: `linear-gradient(90deg, ${step.glowColor}, transparent)`,
          }}
        />
      )}

      {/* Step Number */}
      <motion.div
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{
          duration: 0.5,
          delay: index * 0.15 + 0.1,
          type: "spring",
        }}
        className="relative mb-6"
      >
        <div
          className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${step.bgColor} border border-white/10 flex items-center justify-center relative z-10`}
        >
          <step.icon size={32} className="text-white" />
        </div>
        <div
          className="absolute -inset-2 rounded-2xl opacity-40 blur-xl"
          style={{ background: step.glowColor }}
        />
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white z-20">
          {index + 1}
        </div>
      </motion.div>

      {/* Arrow for mobile */}
      {index < steps.length - 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: index * 0.15 + 0.4 }}
          className="lg:hidden my-2"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-slate-500"
          >
            <path
              d="M12 5v14m0 0l-5-5m5 5l5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}

      {/* Content */}
      <div className="text-center max-w-[220px]">
        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function WorkflowSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="workflow"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 radial-glow-bottom" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
          >
            <span className="text-sm text-slate-300 font-medium">
              Streamlined Process
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Simple, Powerful{" "}
            <span className="gradient-text">Workflow</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-400 max-w-xl mx-auto"
          >
            From sample collection to report delivery — every step is tracked,
            automated, and optimized.
          </motion.p>
        </div>

        {/* Workflow Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
