"use client";

import { useEffect, useState } from "react";
import { apiService, ReferredDoctor } from "@/services/api";
import {
  Stethoscope,
  Plus,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  Search,
  MapPin,
  Edit,
  Power,
  Calendar,
  Building,
  UserRound
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReferredDoctorsProps {
  labId: string;
  currentRole: string;
}

export default function ReferredDoctors({ labId, currentRole }: ReferredDoctorsProps) {
  const [doctors, setDoctors] = useState<ReferredDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create/Edit Modals State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<ReferredDoctor | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [submitting, setSubmitting] = useState(false);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const data = await apiService.getReferredDoctors(labId, searchQuery, statusFilter);
      setDoctors(data);
      setErrorMsg("");
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to retrieve referred doctors list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [labId, searchQuery, statusFilter]);

  const handleOpenCreateModal = () => {
    setEditingDoctor(null);
    setDoctorName("Dr. ");
    setHospitalName("");
    setPhone("");
    setAddress("");
    setStatus("Active");
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleOpenEditModal = (doc: ReferredDoctor) => {
    setEditingDoctor(doc);
    setDoctorName(doc.doctor_name.startsWith("Dr. ") ? doc.doctor_name : "Dr. " + doc.doctor_name.replace(/^Dr\.\s*/i, ""));
    setHospitalName(doc.hospital_name);
    setPhone(doc.phone);
    setAddress(doc.address);
    setStatus(doc.status);
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleDoctorNameChange = (val: string) => {
    if (!val.startsWith("Dr. ")) {
      if (val.length < 4) {
        setDoctorName("Dr. ");
      } else {
        setDoctorName("Dr. " + val.replace(/^Dr\.\s*/i, ""));
      }
    } else {
      setDoctorName(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName || !hospitalName) {
      setErrorMsg("Doctor Name and Hospital Name are required.");
      return;
    }
    if (doctorName === "Dr. " || doctorName.trim() === "Dr.") {
      setErrorMsg("Please enter a valid Doctor Name.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      if (editingDoctor) {
        // Edit flow
        await apiService.updateReferredDoctor(labId, editingDoctor.id, {
          doctor_name: doctorName,
          hospital_name: hospitalName,
          phone: "",
          address: "",
          status
        });
      } else {
        // Create flow
        await apiService.createReferredDoctor(labId, {
          doctor_name: doctorName,
          hospital_name: hospitalName,
          phone: "",
          address: "",
          status
        });
      }
      setModalOpen(false);
      fetchDoctors();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to save referred doctor details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (doc: ReferredDoctor) => {
    try {
      await apiService.toggleReferredDoctorStatus(labId, doc.id);
      fetchDoctors();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to update status.");
    }
  };

  // Lock out view if role is not LAB_ADMIN or Doctor (the specs say "Doctor / Lab Admin role")
  if (currentRole !== "LAB_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-72 bg-white border border-slate-200 rounded-2xl p-6 text-center">
        <Lock size={32} className="text-slate-300 stroke-1 mb-2.5" />
        <h3 className="font-syne text-[13px] font-extrabold text-slate-800">Administrative Privileges Required</h3>
        <p className="text-[10px] text-slate-400 font-semibold max-w-sm mt-1">
          Only Doctor or Lab Administrator has access permissions to manage referring doctors registry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 border border-slate-200/80 p-4 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="font-syne text-[14px] font-extrabold text-slate-800">Referred Doctors</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
            Maintain a catalog of referring doctors and clinics for patient registry mapping
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/15 transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Referring Doctor</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Filters & Search Bar ── */}
      <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ID, Name, Hospital, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/80 transition-all"
          />
        </div>
      </div>

      {/* ── Doctors Registry Directory ── */}
      {loading ? (
        <div className="flex h-44 items-center justify-center text-slate-400">
          <RefreshCw size={20} className="animate-spin text-cyan-500" />
          <span className="ml-3 font-semibold text-xs">Retrieving referring doctors...</span>
        </div>
      ) : doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44 bg-white border border-slate-200/60 rounded-2xl p-6 text-slate-400">
          <Stethoscope size={28} className="stroke-1 mb-1.5" />
          <span className="text-[10px] font-bold">No referring doctors found.</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100">
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Doctor ID</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Doctor Details</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Hospital / Clinic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-extrabold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">
                        {doc.id}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <UserRound size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{doc.doctor_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Building size={12} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">{doc.hospital_name}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create/Edit Dialog Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="border-b border-slate-100 p-4 bg-slate-50/50">
                <h3 className="font-syne text-[13px] font-extrabold text-slate-800 flex items-center gap-2">
                  <Stethoscope size={15} className="text-cyan-500" />
                  <span>{editingDoctor ? "Edit Referring Doctor Details" : "Register Referring Doctor"}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  {editingDoctor ? `Modifying profile for ${editingDoctor.id}` : "Configure new referral doctor details"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {errorMsg && (
                  <div className="flex items-center gap-2 p-2.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Doctor Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Doctor Name *</label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. Dr. Jane Doe"
                    value={doctorName}
                    onChange={(e) => handleDoctorNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/80 transition-all"
                  />
                </div>

                {/* Hospital/Clinic Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Hospital / Clinic Name *</label>
                  <input
                    type="text"
                    required
                    disabled={submitting}
                    placeholder="e.g. City General Hospital"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/80 transition-all"
                  />
                </div>

                {/* Status Toggle */}
                {editingDoctor && (
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-700">Account Status</span>
                      <span className="text-[9px] text-slate-400 font-semibold">Active doctors can be mapped to referrals</span>
                    </div>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {submitting && <RefreshCw size={12} className="animate-spin" />}
                    <span>{editingDoctor ? "Save Changes" : "Register Doctor"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
