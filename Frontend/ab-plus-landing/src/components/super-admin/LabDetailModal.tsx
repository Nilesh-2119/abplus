"use client";

import { useEffect, useState } from "react";
import { apiService, Lab } from "@/services/api";
import { X, Building2, Users, Activity, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LabDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: "active" | "suspended" | null;
}

export default function LabDetailModal({ isOpen, onClose, status }: LabDetailModalProps) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !status) return;

    const fetchLabs = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch only labs matching status, page 1, max 100 entries (lightweight)
        const response = await apiService.getLabs({
          page: 1,
          limit: 100,
          status: status,
        });
        setLabs(response.results);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch lab details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchLabs();
  }, [isOpen, status]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  status === "active"
                    ? "bg-emerald-50 text-emerald-500 shadow-sm shadow-emerald-500/10"
                    : "bg-amber-50 text-amber-500 shadow-sm shadow-amber-500/10"
                }`}
              >
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-syne text-lg font-bold text-slate-800 capitalize">
                  {status === "suspended" ? "Suspended" : status} Labs
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Lightweight summary representation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="mt-4 max-h-[350px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RotateCw className="animate-spin text-sky-500" size={28} />
                <span className="mt-3 text-xs font-medium">Fetching details...</span>
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm font-medium text-red-500">{error}</div>
            ) : labs.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No {status} labs found.
              </div>
            ) : (
              <div className="space-y-3">
                {labs.map((lab) => (
                  <motion.div
                    key={lab.id}
                    initial={{ x: -8, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:border-sky-100 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-700 text-sm">{lab.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        ID: {lab.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Users summary */}
                      <div className="flex items-center gap-1 text-slate-500" title="Total staff">
                        <Users size={14} className="text-sky-500/70" />
                        <span className="text-xs font-semibold">{lab.users_count}</span>
                      </div>

                      {/* Patients summary */}
                      <div className="flex items-center gap-1 text-slate-500" title="Total patient entries">
                        <Activity size={14} className="text-indigo-500/70" />
                        <span className="text-xs font-semibold">{lab.patient_count}</span>
                      </div>

                      {/* Status dot */}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          lab.status === "active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}
                      >
                        {lab.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-5 border-t border-slate-100 pt-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
