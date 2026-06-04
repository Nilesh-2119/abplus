"use client";

import { useEffect, useState } from "react";
import { apiService, User } from "@/services/api";
import { useIntervalRefetch } from "@/hooks/useIntervalRefetch";
import {
  Users,
  Plus,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  ShieldCheck,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StaffProps {
  labId: string;
  currentRole: string;
}

type StaffRole = "TECHNICIAN" | "CASHIER" | "COLLECTION_BOY";

export default function StaffManagement({ labId, currentRole }: StaffProps) {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Registration modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState<StaffRole>("TECHNICIAN");
  const [registering, setRegistering] = useState(false);

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmployee, setResetEmployee] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Staff Details & Actions modal state
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Edit staff profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<StaffRole>("TECHNICIAN");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployees = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await apiService.getEmployees(labId);
      setEmployees(data);
      if (!isBackground) setErrorMsg("");
    } catch (e) {
      console.error(e);
      if (!isBackground) setErrorMsg("Failed to load staff list.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [labId]);

  useIntervalRefetch(() => fetchEmployees(true), 5000);

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newPassword) return;

    if (newPhone.length !== 10) {
      setErrorMsg("Phone number must be exactly 10 digits.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setRegistering(true);
    setErrorMsg("");
    try {
      await apiService.createEmployee(labId, {
        name: newName,
        username: newName,
        phone_number: newPhone,
        role: newRole,
        password: newPassword
      });

      // Clear & Close
      setNewName("");
      setNewPhone("");
      setNewPassword("");
      setNewRole("TECHNICIAN");
      setCreateModalOpen(false);
      
      // Reload list
      fetchEmployees();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to register staff account.");
    } finally {
      setRegistering(false);
    }
  };

  const handleToggleStatus = async (employee: User) => {
    const nextStatus = employee.status === "active" ? "inactive" : "active";
    try {
      await apiService.updateEmployee(labId, employee.id, { status: nextStatus });
      fetchEmployees();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to update account status.");
    }
  };

  const handleTriggerPasswordReset = async (employee: User) => {
    setResetEmployee(employee);
    setResetting(true);
    setResetModalOpen(true);
    try {
      const res = await apiService.resetEmployeePassword(employee.id);
      setTempPassword(res.temp_pass);
      
      // Update employee in UI if it's currently selected
      if (selectedEmployee && selectedEmployee.id === employee.id) {
        setSelectedEmployee(prev => prev ? { ...prev, password: res.temp_pass } : null);
      }
      fetchEmployees();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to reset password.");
      setResetModalOpen(false);
    } finally {
      setResetting(false);
    }
  };

  const handleOpenDetails = (employee: User) => {
    setSelectedEmployee(employee);
    setDetailsModalOpen(true);
    setIsPasswordVisible(false);
    setIsEditing(false);
    
    // Prep edit states
    setEditName(employee.name);
    setEditPhone(employee.phone_number || "");
    setEditPassword(employee.password || "password");
    setEditRole(employee.role as StaffRole);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    if (!editName || !editPhone || !editPassword) {
      setErrorMsg("Please provide employee name, phone number, and password.");
      return;
    }
    if (editPhone.length !== 10) {
      setErrorMsg("Phone number must be exactly 10 digits.");
      return;
    }
    if (editPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setUpdating(true);
    setErrorMsg("");
    try {
      const updated = await apiService.updateEmployee(labId, selectedEmployee.id, {
        name: editName,
        username: editName,
        phone_number: editPhone,
        role: editRole,
        password: editPassword
      });

      // Update local list
      await fetchEmployees();

      // Refresh details view
      setSelectedEmployee(updated);
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update staff profile.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    const confirmDelete = window.confirm(`Are you sure you want to permanently delete staff account for ${selectedEmployee.name}?`);
    if (!confirmDelete) return;

    setDeleting(true);
    setErrorMsg("");
    try {
      await apiService.deleteEmployee(labId, selectedEmployee.id);
      
      // Update local list
      await fetchEmployees();

      // Close modal
      setDetailsModalOpen(false);
      setSelectedEmployee(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to delete staff account.");
    } finally {
      setDeleting(false);
    }
  };

  // Lock out staff view if role is not LAB_ADMIN
  if (currentRole !== "LAB_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-72 bg-white border border-slate-200 rounded-2xl p-6 text-center">
        <Lock size={32} className="text-slate-300 stroke-1 mb-2.5" />
        <h3 className="font-syne text-[13px] font-extrabold text-slate-800">Administrative Privileges Required</h3>
        <p className="text-[10px] text-slate-400 font-semibold max-w-sm mt-1">
          Only the Doctor or Lab Administrator has permission to view, register, or manage staff profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header Actions Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 border border-slate-200/80 p-4 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="font-syne text-[14px] font-extrabold text-slate-800">Staff Management</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
            Configure system access for Technicians, Cashiers, and Collection Boys
          </p>
        </div>
        <button
          onClick={() => { setErrorMsg(""); setCreateModalOpen(true); }}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/15 transition-all cursor-pointer"
        >
          <UserPlus size={14} />
          <span>Register New Staff</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Employees Directory Grid ── */}
      {loading ? (
        <div className="flex h-44 items-center justify-center text-slate-400">
          <RefreshCw size={20} className="animate-spin text-cyan-500" />
          <span className="ml-3 font-semibold text-xs">Retrieving staff members...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44 bg-white border border-slate-200/60 rounded-2xl p-6 text-slate-400">
          <Users size={28} className="stroke-1 mb-1.5" />
          <span className="text-[10px] font-bold">No active employees registered yet.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map((emp) => (
            <motion.div
              key={emp.id}
              layout
              onClick={() => handleOpenDetails(emp)}
              className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:border-cyan-500/50 hover:shadow-md transition-all"
            >
              <div>
                {/* Header Role Badging */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                  <span className="text-[9px] font-extrabold bg-cyan-50 text-cyan-600 border border-cyan-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {emp.role.replace("_", " ")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${emp.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {emp.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-black text-slate-800">{emp.name}</h3>
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-1">
                  <Phone size={12} className="text-slate-300" />
                  <span>{emp.phone_number || "No Phone Number"}</span>
                </p>
                <p className="text-[8px] text-slate-400 font-medium mt-2">
                  Username: {emp.username} • ID: {emp.id} • Registered: {new Date(emp.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(emp);
                  }}
                  className={`flex-1 text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all cursor-pointer text-center ${
                    emp.status === "active"
                      ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/60"
                  }`}
                >
                  {emp.status === "active" ? "Suspend Account" : "Activate Account"}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerPasswordReset(emp);
                  }}
                  className="flex items-center justify-center gap-1.5 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-cyan-100 bg-cyan-50/50 text-cyan-600 hover:bg-cyan-100 transition-colors cursor-pointer"
                  title="Generate dynamic temp password"
                >
                  <Lock size={12} />
                  <span>Reset PW</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Modal: Register Employee ── */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setErrorMsg(""); setCreateModalOpen(false); }}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-syne text-[13px] font-extrabold text-slate-800">
                  Register Lab Employee
                </h3>
                <button
                  onClick={() => { setErrorMsg(""); setCreateModalOpen(false); }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <form onSubmit={handleRegisterEmployee} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Full Name (Acts as Login ID)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. lucky_patil (letters, numbers, underscores only)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                  <span className="block text-[8px] text-slate-400 mt-1 font-semibold">No spaces or special characters allowed. This username must be unique within your lab.</span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                  <span className="block text-[8px] text-slate-400 mt-1 font-semibold">Must be exactly 10 digits. Numbers only.</span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                    >
                      {showPassword ? "👁️" : "🙈"}
                    </button>
                  </div>
                  <span className="block text-[8px] text-slate-400 mt-1 font-semibold">Minimum 6 characters. Securely hashed in the backend database.</span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Role Category
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffRole)}
                    className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                  >
                    <option value="TECHNICIAN">Technician (Results logging)</option>
                    <option value="CASHIER">Cashier (Billings & Receipt)</option>
                    <option value="COLLECTION_BOY">Collection Boy (Patient register)</option>
                  </select>
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle size={15} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registering || newName.length === 0 || newPhone.length !== 10 || newPassword.length < 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Provision Staff Profile</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Password Reset Temporary Code ── */}
      <AnimatePresence>
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResetModalOpen(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-10 text-center"
            >
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center mb-3 border border-cyan-100">
                  <Lock size={22} className="stroke-[1.5]" />
                </div>
                <h3 className="font-syne text-[13px] font-extrabold text-slate-800">
                  Temporary Credentials
                </h3>
                <p className="text-[9px] text-slate-400 font-semibold mt-1">
                  A temporary password was generated for {resetEmployee?.name}.
                </p>

                {resetting ? (
                  <div className="h-16 flex items-center justify-center mt-4">
                    <RefreshCw className="animate-spin text-cyan-500" size={18} />
                  </div>
                ) : (
                  <div className="w-full my-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 select-all cursor-pointer group">
                    <span className="block text-lg font-black tracking-widest text-slate-800 font-mono">
                      {tempPassword}
                    </span>
                    <span className="block text-[8px] font-extrabold text-slate-400 mt-1 uppercase tracking-wide group-hover:text-cyan-600 transition-colors">
                      Click to copy passcode
                    </span>
                  </div>
                )}

                <p className="text-[9px] text-rose-500 font-bold max-w-xs mb-4">
                  * Passcode is one-time use only. Provide this credentials to the staff to allow login updates.
                </p>

                <button
                  onClick={() => setResetModalOpen(false)}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Staff Details & Actions ── */}
      <AnimatePresence>
        {detailsModalOpen && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!updating && !deleting) {
                  setDetailsModalOpen(false);
                  setSelectedEmployee(null);
                }
              }}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-syne text-[13px] font-extrabold text-slate-800">
                  {isEditing ? "Edit Staff Account" : "Staff Profile Details"}
                </h3>
                <button
                  onClick={() => {
                    if (!updating && !deleting) {
                      setDetailsModalOpen(false);
                      setSelectedEmployee(null);
                    }
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
                  disabled={updating || deleting}
                >
                  <XCircle size={18} />
                </button>
              </div>

              {!isEditing ? (
                <div className="space-y-4">
                  {/* Profile Header */}
                  <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-base font-black shadow-md shadow-cyan-500/10">
                      {selectedEmployee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">{selectedEmployee.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] font-extrabold bg-cyan-100/60 text-cyan-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {selectedEmployee.role.replace("_", " ")}
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                          selectedEmployee.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                        }`}>
                          {selectedEmployee.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details List */}
                  <div className="space-y-3 px-1 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">User ID</span>
                      <span className="font-semibold text-slate-700">{selectedEmployee.id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Username</span>
                      <span className="font-semibold text-slate-700">{selectedEmployee.username}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Phone Contact</span>
                      <span className="font-semibold text-slate-700">{selectedEmployee.phone_number || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Date Registered</span>
                      <span className="font-semibold text-slate-700">{new Date(selectedEmployee.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Password Set</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700 tracking-wider">
                          {isPasswordVisible ? (selectedEmployee.password || "password") : "••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                          className="text-slate-400 hover:text-cyan-600 cursor-pointer p-1 rounded hover:bg-slate-100 flex items-center justify-center transition-colors"
                          title={isPasswordVisible ? "Hide Password" : "Show Password"}
                        >
                          {isPasswordVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-3.5 pt-3.5 border-t border-slate-100 mt-5">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-extrabold py-2 px-3 rounded-xl border border-cyan-100 bg-cyan-50/50 text-cyan-600 hover:bg-cyan-100 transition-all cursor-pointer"
                    >
                      <Edit size={13} />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={handleDeleteEmployee}
                      disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-extrabold py-2 px-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      <span>{deleting ? "Deleting..." : "Delete Staff"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit Mode Form */
                <form onSubmit={handleUpdateEmployee} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Full Name / Login ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. lucky_patil"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                    <span className="block text-[8px] text-slate-400 mt-1 font-semibold">Letters, numbers, and underscores only.</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="10 digits"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                    <span className="block text-[8px] text-slate-400 mt-1 font-semibold">Must be exactly 10 digits.</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Password
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type={isPasswordVisible ? "text" : "password"}
                        required
                        placeholder="Min 6 characters"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                      >
                        {isPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <span className="block text-[8px] text-slate-400 mt-1 font-semibold">Minimum 6 characters.</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Role Category
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as StaffRole)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    >
                      <option value="TECHNICIAN">Technician (Results logging)</option>
                      <option value="CASHIER">Cashier (Billings & Receipt)</option>
                      <option value="COLLECTION_BOY">Collection Boy (Patient register)</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 rounded-xl border border-slate-200 text-slate-500 py-2.5 text-xs font-bold text-center hover:bg-slate-50 cursor-pointer"
                      disabled={updating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updating || editName.length === 0 || editPhone.length !== 10 || editPassword.length < 6}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? <RefreshCw size={14} className="animate-spin" /> : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
