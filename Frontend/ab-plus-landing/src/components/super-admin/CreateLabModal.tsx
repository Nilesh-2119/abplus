"use client";

import React, { useState } from "react";
import { apiService, Lab } from "@/services/api";
import { X, Building2, User, Mail, Phone, MapPin, Key, RotateCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLabModal({ isOpen, onClose, onSuccess }: CreateLabModalProps) {
  // Form fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [createdLab, setCreatedLab] = useState<Lab | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    // Validate inputs
    if (!name.trim()) return setValidationError("Lab Name is required");
    if (!address.trim()) return setValidationError("Address is required");
    if (!phone.trim()) return setValidationError("Phone number is required");
    if (!adminName.trim()) return setValidationError("Admin name is required");
    if (!adminEmail.trim()) return setValidationError("Admin email is required");
    if (!adminPassword.trim() || adminPassword.length < 6) {
      return setValidationError("Password must be at least 6 characters long");
    }

    setLoading(true);
    try {
      const response = await apiService.createLab({
        name,
        address,
        phone,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      });
      setCreatedLab(response);
      onSuccess();
    } catch (err) {
      console.error(err);
      setValidationError("Failed to create lab. Please verify details.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setName("");
    setAddress("");
    setPhone("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setValidationError("");
    setCreatedLab(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xl backdrop-blur-md"
        >
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>

          {!createdLab ? (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h3 className="font-syne text-lg font-bold text-slate-800">
                  Onboard New Tenant Lab
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  Onboarding automatically generates the initial Lab Admin credentials.
                </p>
              </div>

              {validationError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-500 border border-red-100">
                  {validationError}
                </div>
              )}

              {/* Lab Section */}
              <div className="space-y-3.5">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Building2 size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Lab Name (e.g. Apex Diagnostics)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute top-3 left-0 flex items-start pl-3.5 text-slate-400">
                    <MapPin size={16} />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Full Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 resize-none"
                  />
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Phone Number (e.g. +91 98765 43210)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>
              </div>

              {/* Admin Section */}
              <div className="border-t border-slate-100 pt-4 space-y-3.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Initial Lab Admin Details
                </span>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Admin Name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      placeholder="Admin Email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>

                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Key size={16} />
                    </div>
                    <input
                      type="password"
                      placeholder="Password (Min 6)"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-sky-500/20 hover:from-sky-600 hover:to-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Onboard Lab</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Success Display */
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center py-4 space-y-4"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-sm border border-emerald-100">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h4 className="font-syne text-lg font-bold text-slate-800">
                  Lab Successfully Provisioned!
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Tenant workspace and configuration keys initialized.
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400">Assigned ID:</span>
                  <span className="font-bold text-slate-700">{createdLab.id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400">Workspace Name:</span>
                  <span className="font-semibold text-slate-700">{createdLab.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400">Lab Admin Login ID:</span>
                  <span className="font-semibold text-slate-700">{createdLab.admin_username || createdLab.admin_email}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-400">Admin Role:</span>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
                    LAB_ADMIN
                  </span>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={handleClose}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
