"use client";

import { useState } from "react";
import { Save, RefreshCw, Mail, Shield, ShieldCheck, Database, Key } from "lucide-react";

export default function SettingsView() {
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg("");
    setTimeout(() => {
      setSaveLoading(false);
      setSuccessMsg("Settings updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }, 800);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-syne text-xl font-extrabold text-slate-800 tracking-tight md:text-2xl">
          System Settings
        </h2>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Configure platform branding, security rules, SMTP servers, and database backup routines.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-semibold text-emerald-600">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
        {/* Left column: Branding & SMTP */}
        <div className="space-y-5">
          {/* Tenant Subdomains & Branding */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-syne text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Branding & DNS Subdomain
            </h3>

            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tenant Subdomain URL Base
                </label>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <span className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-slate-400">
                    https://
                  </span>
                  <input
                    type="text"
                    defaultValue="*.abplus.in"
                    disabled
                    className="flex-1 px-3 py-2 text-slate-500 font-medium bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Platform Branded Title
                </label>
                <input
                  type="text"
                  defaultValue="AB+ Pathology Management SaaS"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Email Server Configurations */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Mail size={16} className="text-sky-500" />
              <h3 className="font-syne text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                SMTP Server Config (Notification Dispatch)
              </h3>
            </div>

            <div className="grid gap-3.5 grid-cols-2 text-xs font-semibold text-slate-600">
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  SMTP Host Address
                </label>
                <input
                  type="text"
                  defaultValue="smtp.mailgun.org"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  SMTP Port
                </label>
                <input
                  type="number"
                  defaultValue="587"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  SSL/TLS Protocol
                </label>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 outline-none focus:border-sky-500 cursor-pointer">
                  <option>STARTTLS (Recommended)</option>
                  <option>SSL/TLS Direct</option>
                  <option>No Encryption</option>
                </select>
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sender E-mail Address
                </label>
                <input
                  type="email"
                  defaultValue="notifications@abplus.in"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Security & Backups */}
        <div className="space-y-5">
          {/* Security & Access Policies */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Shield size={16} className="text-indigo-500" />
              <h3 className="font-syne text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Security & JWT Expiry Policies
              </h3>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  JWT Access Token Expiry (Minutes)
                </label>
                <input
                  type="number"
                  defaultValue="60"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  JWT Refresh Token Expiry (Days)
                </label>
                <input
                  type="number"
                  defaultValue="7"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1.5">
                <input
                  type="checkbox"
                  id="mfa"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 outline-none cursor-pointer"
                />
                <label htmlFor="mfa" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Enforce MFA for all Super Admin Operators
                </label>
              </div>
            </div>
          </div>

          {/* Backup Routines */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Database size={16} className="text-emerald-500" />
              <h3 className="font-syne text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Database Backup Schedule
              </h3>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Automatic Backup Frequency
                </label>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 outline-none focus:border-sky-500 cursor-pointer">
                  <option>Every 24 hours (Daily at midnight)</option>
                  <option>Every 12 hours</option>
                  <option>Weekly (Sundays)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  PostgreSQL Backup Destination
                </label>
                <input
                  type="text"
                  defaultValue="s3://abplus-saas-backups/postgres-prod/"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Button */}
        <div className="md:col-span-2 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saveLoading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-75 cursor-pointer"
          >
            {saveLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving configurations...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
