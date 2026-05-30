"use client";

import { useEffect, useState } from "react";
import { apiService, Lab } from "@/services/api";
import CreateLabModal from "./CreateLabModal";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Edit2,
  AlertOctagon,
  Unlock,
  RotateCw,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LabsManagementView() {
  // Query state
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 5;

  // Modal and Action state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [viewDetailOpen, setViewDetailOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch labs from service
  const fetchLabs = async () => {
    setLoading(true);
    try {
      const response = await apiService.getLabs({
        page,
        search,
        status,
        limit,
      });
      setLabs(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error(err);
      setError("Failed to load labs database. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [page, search, status]);

  // Handle pagination pages bounds
  const totalPages = Math.ceil(totalCount / limit);

  // Handlers for edit
  const openEditModal = (lab: Lab) => {
    setSelectedLab(lab);
    setEditName(lab.name);
    setEditAddress(lab.address);
    setEditPhone(lab.phone);
    setEditAdminName(lab.admin_name);
    setEditAdminEmail(lab.admin_email);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLab) return;
    setActionLoading(true);
    try {
      await apiService.updateLab(selectedLab.id, {
        name: editName,
        address: editAddress,
        phone: editPhone,
        admin_name: editAdminName,
        admin_email: editAdminEmail,
      });
      setEditModalOpen(false);
      fetchLabs();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle lab status
  const handleStatusToggle = async () => {
    if (!selectedLab) return;
    setActionLoading(true);
    try {
      const targetStatus = selectedLab.status === "active" ? "suspended" : "active";
      await apiService.patchLabStatus(selectedLab.id, targetStatus);
      setSuspendConfirmOpen(false);
      fetchLabs();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Quick Stats summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-800 tracking-tight md:text-2xl">
            Lab Management
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Onboard new clinics, edit parameters, and toggle operational status.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-sky-500/20 hover:from-sky-600 hover:to-indigo-700 transition-all active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Onboard New Lab</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by Lab Name, ID, or Admin credentials..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset page on filter changes
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <SlidersHorizontal size={14} className="text-slate-400 hidden sm:block" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Main Database Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <RotateCw className="animate-spin text-sky-500" size={32} />
            <span className="mt-3 font-semibold text-xs">Querying lab databases...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center font-medium text-red-500 text-sm">{error}</div>
        ) : labs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No matching tenant labs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5">Lab Details</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-center">Users</th>
                  <th className="py-4 px-4 text-center">Patients</th>
                  <th className="py-4 px-4">Created Date</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {labs.map((lab) => (
                  <tr key={lab.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Lab Name & ID */}
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 text-[13px]">
                          {lab.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          ID: {lab.id}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize border ${
                          lab.status === "active"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100/80 shadow-sm shadow-emerald-500/5"
                            : "bg-amber-50 text-amber-600 border-amber-100/80 shadow-sm shadow-amber-500/5"
                        }`}
                      >
                        <span
                          className={`mr-1 h-1.5 w-1.5 rounded-full ${
                            lab.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        {lab.status}
                      </span>
                    </td>

                    {/* Users Count */}
                    <td className="py-3.5 px-4 text-center text-slate-600 font-semibold text-sm">
                      {lab.users_count}
                    </td>

                    {/* Patient Count */}
                    <td className="py-3.5 px-4 text-center text-slate-600 font-semibold text-sm">
                      {lab.patient_count.toLocaleString()}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(lab.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions Dropdown */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedLab(lab);
                            setViewDetailOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-500 transition-colors"
                          title="View Info"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEditModal(lab)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 transition-colors"
                          title="Edit Info"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLab(lab);
                            setSuspendConfirmOpen(true);
                          }}
                          className={`rounded-lg p-1.5 transition-colors ${
                            lab.status === "active"
                              ? "text-slate-400 hover:bg-red-50 hover:text-red-500"
                              : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-500"
                          }`}
                          title={lab.status === "active" ? "Suspend Lab" : "Activate Lab"}
                        >
                          {lab.status === "active" ? (
                            <AlertOctagon size={15} />
                          ) : (
                            <Unlock size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && labs.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-700">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(page * limit, totalCount)}
              </span>{" "}
              of <span className="font-bold text-slate-700">{totalCount}</span> entries
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3">
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboard form Modal */}
      <CreateLabModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setPage(1);
          fetchLabs();
        }}
      />

      {/* View Detail Modal */}
      <AnimatePresence>
        {viewDetailOpen && selectedLab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewDetailOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <h3 className="font-syne text-md font-bold text-slate-800">
                  Lab Identity Card
                </h3>
                <button
                  onClick={() => setViewDetailOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs font-semibold text-slate-600">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-[14px]">
                    {selectedLab.name}
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Assigned lab ID: {selectedLab.id}
                  </span>
                </div>

                <div className="space-y-2.5 border-t border-slate-100 pt-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{selectedLab.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-slate-400 shrink-0" />
                    <span>{selectedLab.phone}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar size={15} className="text-slate-400 shrink-0" />
                    <span>Onboarded: {new Date(selectedLab.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Primary Administrator
                  </span>
                  <div className="flex items-center gap-2.5">
                    <Eye size={15} className="text-slate-400 shrink-0" />
                    <span>{selectedLab.admin_name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail size={15} className="text-slate-400 shrink-0" />
                    <span className="text-sky-600 underline font-normal">{selectedLab.admin_email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewDetailOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModalOpen && selectedLab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-syne text-md font-bold text-slate-800">
                  Update Lab Details
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Lab Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Admin Profile
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">Name</label>
                      <input
                        type="text"
                        value={editAdminName}
                        onChange={(e) => setEditAdminName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">Email</label>
                      <input
                        type="email"
                        value={editAdminEmail}
                        onChange={(e) => setEditAdminEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:from-sky-600 focus:scale-[0.98]"
                  >
                    {actionLoading && <RotateCw className="animate-spin h-3.5 w-3.5" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suspend/Activate Confirmation Modal */}
      <AnimatePresence>
        {suspendConfirmOpen && selectedLab && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuspendConfirmOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    selectedLab.status === "active"
                      ? "bg-red-50 text-red-500"
                      : "bg-emerald-50 text-emerald-500"
                  }`}
                >
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h3 className="font-syne text-sm font-bold text-slate-800">
                    Confirm {selectedLab.status === "active" ? "Suspension" : "Activation"}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    This modification impacts tenant login capabilities.
                  </p>
                </div>
              </div>

              <div className="mt-3.5 text-xs text-slate-500 leading-relaxed font-medium">
                Are you sure you want to change the status of{" "}
                <span className="font-bold text-slate-700">"{selectedLab.name}"</span> to{" "}
                <span className="font-bold text-slate-700">
                  {selectedLab.status === "active" ? "Suspended" : "Active"}
                </span>
                ? Under suspended status, all connected staff and diagnostics functions will be
                temporarily locked out.
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setSuspendConfirmOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusToggle}
                  disabled={actionLoading}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white focus:scale-[0.98] ${
                    selectedLab.status === "active"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
                >
                  {actionLoading && <RotateCw className="animate-spin h-3.5 w-3.5" />}
                  <span>
                    Confirm {selectedLab.status === "active" ? "Suspension" : "Activation"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
