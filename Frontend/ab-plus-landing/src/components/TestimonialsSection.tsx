"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Dr. Ramesh Patil",
    role: "Owner, Patil Diagnostics",
    location: "Pune, Maharashtra",
    avatar: "RP",
    rating: 5,
    text: "AB+ has completely transformed how we run our lab. The workflow from collection to report generation is seamless. Our turnaround time has dropped by 40%, and my staff actually enjoys using the software.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    name: "Dr. Meena Gupta",
    role: "Director, Gupta Path Lab",
    location: "Jaipur, Rajasthan",
    avatar: "MG",
    rating: 5,
    text: "We switched from our old desktop software to AB+ six months ago. The cloud access means I can check reports from anywhere. The multi-branch feature is a game changer for our three locations.",
    color: "from-purple-500 to-indigo-500",
  },
  {
    name: "Vikram Desai",
    role: "Lab Manager, City Diagnostics",
    location: "Ahmedabad, Gujarat",
    avatar: "VD",
    rating: 5,
    text: "The technician dashboard is incredibly well designed. Our team was up and running in a single day. The report generation is fast, professional, and our patients love the modern format.",
    color: "from-cyan-500 to-emerald-500",
  },
  {
    name: "Dr. Sunita Reddy",
    role: "Chief Pathologist, RedMed Labs",
    location: "Hyderabad, Telangana",
    avatar: "SR",
    rating: 5,
    text: "I was skeptical about cloud-based lab software, but AB+ proved me wrong. The security is top-notch, the audit logs give me peace of mind, and the support team is phenomenal.",
    color: "from-rose-500 to-purple-500",
  },
  {
    name: "Ajay Verma",
    role: "Owner, Verma Clinical Lab",
    location: "Lucknow, Uttar Pradesh",
    avatar: "AV",
    rating: 5,
    text: "As a small lab, we needed something affordable yet powerful. AB+ fits perfectly. The cashier module has simplified our billing, and automated reports save us hours every day.",
    color: "from-amber-500 to-orange-500",
  },
];

export default function TestimonialsSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [current, setCurrent] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const next = () => {
    setIsAutoPlay(false);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setIsAutoPlay(false);
    setCurrent(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
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
              Trusted by Labs Across India
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            What Lab Owners{" "}
            <span className="gradient-text">Say</span>
          </motion.h2>
        </div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-card p-8 md:p-10 relative">
            {/* Quote Icon */}
            <Quote
              size={40}
              className="text-white/5 absolute top-6 right-8"
            />

            {/* Content */}
            <div className="relative z-10">
              {/* Avatar & Info */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${testimonials[current].color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                >
                  {testimonials[current].avatar}
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">
                    {testimonials[current].name}
                  </div>
                  <div className="text-sm text-slate-400">
                    {testimonials[current].role}
                  </div>
                  <div className="text-xs text-slate-500">
                    {testimonials[current].location}
                  </div>
                </div>
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonials[current].rating }).map(
                  (_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="text-amber-400 fill-amber-400"
                    />
                  )
                )}
              </div>

              {/* Text */}
              <motion.p
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-base md:text-lg text-slate-300 leading-relaxed italic"
              >
                &ldquo;{testimonials[current].text}&rdquo;
              </motion.p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIsAutoPlay(false);
                    setCurrent(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-8 bg-gradient-to-r from-blue-500 to-cyan-400"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
              aria-label="Next testimonial"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
