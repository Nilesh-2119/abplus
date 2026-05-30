"use client";

import { useEffect, useState } from "react";
import { apiService, LabSettings as SettingsType } from "@/services/api";
import {
  Settings,
  Upload,
  RefreshCw,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  X
} from "lucide-react";
import { motion } from "framer-motion";

interface SettingsProps {
  labId: string;
  labCode?: string;
}

export default function LabSettings({ labId, labCode }: SettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Settings form state
  const [labName, setLabName] = useState("");
  const [labAddress, setLabAddress] = useState("");
  const [labPhone, setLabPhone] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [letterheadBase64, setLetterheadBase64] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await apiService.getLabSettings(labId);
      setLabName(settings.name);
      setLabAddress(settings.address);
      setLabPhone(settings.phone);
      setLogoBase64(settings.logo_base64 || "");
      setLetterheadBase64(settings.letterhead_base64 || "");
      setErrorMsg("");
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to retrieve laboratory settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [labId]);

  // Read file and convert to base64 hook
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("File is too large. Choose a logo under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoBase64(reader.result);
        setErrorMsg("");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to parse logo file buffer.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64("");
  };

  // Letterhead Upload logic
  const handleLetterheadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("File is too large. Choose a letterhead under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLetterheadBase64(reader.result);
        setErrorMsg("");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to parse letterhead file buffer.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLetterhead = () => {
    setLetterheadBase64("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName || !labAddress || !labPhone) {
      setErrorMsg("Please complete all configurations.");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await apiService.updateLabSettings(labId, {
        name: labName,
        address: labAddress,
        phone: labPhone,
        logo_base64: logoBase64,
        letterhead_base64: letterheadBase64
      });
      setSuccessMsg("Branding and letterhead configurations updated successfully.");
      
      // Clear success notification after 3.5s
      setTimeout(() => {
        setSuccessMsg("");
      }, 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to commit settings data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center text-slate-400">
        <RefreshCw size={20} className="animate-spin text-cyan-500" />
        <span className="ml-3 font-semibold text-xs">Retrieving configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ── Header Actions Bar ── */}
      <div className="flex flex-col gap-3 bg-white/70 border border-slate-200/80 p-5 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="font-syne text-[14px] font-extrabold text-slate-800">Letterhead & Lab Settings</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
            Configure contact info, coordinates, and upload logos for report A4 print branding
          </p>
        </div>
        {labCode && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs">
            <span className="font-bold text-slate-500">Staff Login Lab Code:</span>
            <span className="font-mono font-black text-cyan-600 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-100 uppercase tracking-wider text-[11px] shadow-sm select-all">
              {labCode}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">(Share this code with your staff members so they can log in)</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl">
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Settings Form ── */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Logo upload row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-5 border-b border-slate-100">
          <div className="relative">
            {logoBase64 ? (
              <div className="h-20 w-32 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-2 relative group overflow-hidden">
                <img src={logoBase64} alt="Branding Logo" className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold cursor-pointer"
                >
                  Remove Logo
                </button>
              </div>
            ) : (
              <div className="h-20 w-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <Building2 size={24} className="stroke-1" />
                <span className="text-[8px] font-extrabold mt-1.5 uppercase tracking-wide text-slate-400">NO LOGO ATTACHED</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">Lab Letterhead Logo</h4>
            <p className="text-[9px] text-slate-400 font-semibold max-w-sm">
              Upload a logo in JPG or PNG format. Recommend transparent background (under 2MB).
            </p>
            <div className="pt-2 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-cyan-600 bg-cyan-50 border border-cyan-100/50 px-3 py-1.5 rounded-lg hover:bg-cyan-100 transition-colors cursor-pointer">
                <Upload size={12} />
                <span>Upload Logo File</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Letterhead upload row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-5 border-b border-slate-100">
          <div className="relative">
            {letterheadBase64 ? (
              <div className="h-24 w-32 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-1 relative group overflow-hidden shadow-inner">
                <img src={letterheadBase64} alt="Letterhead Paper" className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={handleRemoveLetterhead}
                  className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold cursor-pointer"
                >
                  Remove Letterhead
                </button>
              </div>
            ) : (
              <div className="h-24 w-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                <Building2 size={24} className="stroke-1" />
                <span className="text-[8px] font-extrabold mt-1.5 uppercase tracking-wide text-slate-400 text-center px-1">NO LETTERHEAD ATTACHED</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">Lab Letterhead Background Image (A4 size)</h4>
            <p className="text-[9px] text-slate-400 font-semibold max-w-sm">
              Upload a background image representing your physical letterhead. This will be used as the background when rendering and printing individual tests.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-cyan-600 bg-cyan-50 border border-cyan-100/50 px-3 py-1.5 rounded-lg hover:bg-cyan-100 transition-colors cursor-pointer">
                <Upload size={12} />
                <span>Upload Letterhead Image</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleLetterheadUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Input Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
              Official Laboratory Name
            </label>
            <div className="relative mt-1.5">
              <Building2 size={14} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Apex Diagnostics & Research Centre"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                Billing Hotline Phone
              </label>
              <div className="relative mt-1.5">
                <Phone size={14} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={labPhone}
                  onChange={(e) => setLabPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                Location Address
              </label>
              <div className="relative mt-1.5">
                <MapPin size={14} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 710, Deccan Gymkhana, Pune"
                  value={labAddress}
                  onChange={(e) => setLabAddress(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg transition-all cursor-pointer mt-4"
        >
          {saving ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <span>Save Settings & Apply letterhead</span>
          )}
        </button>
      </form>
    </div>
  );
}
