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
  UserRound,
  Trash2,
  Eye,
  X
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

  // New Actions State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<ReferredDoctor | null>(null);
  const [doctorStats, setDoctorStats] = useState<{
    total_patients: number;
    total_revenue: number;
    first_referral_date: string | null;
    last_referral_date: string | null;
    patients_this_month: number;
    patients_this_year: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

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

  const handleDeleteDoctor = async () => {
    if (!selectedDoctor) return;
    setSubmitting(true);
    try {
      await apiService.deleteReferredDoctor(labId, selectedDoctor.id);
      setDeleteConfirmOpen(false);
      fetchDoctors();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to delete doctor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetails = async (doc: ReferredDoctor) => {
    setSelectedDoctor(doc);
    setDoctorStats(null);
    setLoadingStats(true);
    setDetailModalOpen(true);
    try {
      const statsData = await apiService.getReferredDoctorStats(labId, doc.id);
      setDoctorStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
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
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                          <div
                            onClick={() => handleOpenDetails(doc)}
                            className="text-xs font-bold text-slate-800 hover:underline hover:text-cyan-600 cursor-pointer transition-colors"
                          >
                            {doc.doctor_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Building size={12} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">{doc.hospital_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                          doc.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100/80 shadow-sm"
                            : "bg-slate-100 text-slate-500 border-slate-200 shadow-sm"
                        }`}
                      >
                        <span
                          className={`mr-1 h-1.5 w-1.5 rounded-full ${
                            doc.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        {doc.status === "Active" ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(doc)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-600 transition-colors cursor-pointer"
                          title="Edit Info"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(doc)}
                          className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                            doc.status === "Active"
                              ? "text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                              : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          }`}
                          title={doc.status === "Active" ? "Disable Doctor" : "Enable Doctor"}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setDeleteConfirmOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Doctor"
                        >
                          <Trash2 size={14} />
                        </button>
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

      {/* ── Delete Confirmation Dialog Modal ── */}
      <AnimatePresence>
        {deleteConfirmOpen && selectedDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-5 overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-syne text-sm font-bold text-slate-800">
                    Delete Referred Doctor
                  </h3>
                  <p className="text-[11px] font-medium text-red-500">
                    This action is permanent!
                  </p>
                </div>
              </div>

              <div className="mt-3.5 text-xs text-slate-500 leading-relaxed font-medium">
                Are you sure you want to delete <span className="font-bold text-slate-700">"{selectedDoctor.doctor_name}"</span>? 
                This doctor will be soft-deleted and hidden from all dropdown search selectors, but historical patient registrations and bills referencing them will remain fully intact.
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDoctor}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2 text-xs font-semibold text-white focus:scale-[0.98] cursor-pointer"
                >
                  {submitting && <RefreshCw className="animate-spin h-3.5 w-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Doctor Details Dialog Modal ── */}
      <AnimatePresence>
        {detailModalOpen && selectedDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-syne text-[13px] font-extrabold text-slate-800 flex items-center gap-2">
                    <Stethoscope size={15} className="text-cyan-500" />
                    <span>Doctor Profile Card</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Referral analytics & contact file
                  </p>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs font-semibold text-slate-600">
                {/* ID & Name & Status */}
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-[14px]">
                      {selectedDoctor.doctor_name}
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                      ID: {selectedDoctor.id}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                      selectedDoctor.status === "Active"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {selectedDoctor.status === "Active" ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Details Section */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-start gap-2.5">
                    <Building size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{selectedDoctor.hospital_name || "Hospital not configured"}</span>
                  </div>
                  {selectedDoctor.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{selectedDoctor.phone}</span>
                    </div>
                  )}
                  {selectedDoctor.address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedDoctor.address}</span>
                    </div>
                  )}
                </div>

                {/* Statistics Grid */}
                <div className="border-t border-slate-100 pt-3.5 space-y-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Referral Analytics
                  </span>

                  {loadingStats ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                      <RefreshCw size={14} className="animate-spin text-cyan-500" />
                      <span className="text-[10px]">Loading analytics...</span>
                    </div>
                  ) : doctorStats ? (
                    <div className="space-y-3">
                      {/* Metric blocks */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Total Patients</span>
                          <span className="text-[16px] font-extrabold text-slate-800">
                            {doctorStats.total_patients}
                          </span>
                        </div>
                        <div className="bg-cyan-50/40 rounded-xl p-3 border border-cyan-100/50 flex flex-col gap-0.5">
                          <span className="text-[9px] text-cyan-600/90 font-bold uppercase">Revenue Generated</span>
                          <span className="text-[16px] font-extrabold text-cyan-600">
                            ₹{doctorStats.total_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* First and Last referral dates */}
                      <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">First Referral</span>
                          <span className="text-xs text-slate-700 font-bold mt-1 block">
                            {doctorStats.first_referral_date
                              ? new Date(doctorStats.first_referral_date).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase block">Last Referral</span>
                          <span className="text-xs text-slate-700 font-bold mt-1 block">
                            {doctorStats.last_referral_date
                              ? new Date(doctorStats.last_referral_date).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Patient Stats Month / Year / Total */}
                      <div className="border-t border-slate-100 pt-3">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block mb-2">Patients Registered</span>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 font-bold block">This Month</span>
                            <span className="text-xs font-bold text-slate-800 block mt-0.5">{doctorStats.patients_this_month}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 font-bold block">This Year</span>
                            <span className="text-xs font-bold text-slate-800 block mt-0.5">{doctorStats.patients_this_year}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="text-[9px] text-slate-400 font-bold block">Total</span>
                            <span className="text-xs font-bold text-slate-800 block mt-0.5">{doctorStats.total_patients}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs font-medium text-slate-400">
                      Failed to fetch referral analytics.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleOpenEditModal(selectedDoctor);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer text-center"
                >
                  Edit Doctor
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
