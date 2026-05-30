"use client";

import { useEffect, useState } from "react";
import { apiService, User } from "@/services/api";
import { Search, ChevronLeft, ChevronRight, RotateCw, UserCheck, ShieldAlert, SlidersHorizontal, Key } from "lucide-react";

export default function UsersManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 5;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getUsers({
        page,
        search,
        role,
        limit,
      });
      setUsers(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch user database.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to reset the password for ${userName}?`)) return;
    
    try {
      const res = await apiService.resetEmployeePassword(userId);
      if (res.success) {
        alert(`Password for ${userName} reset successfully.\n\nNew Temporary Password: ${res.temp_pass}\n\nPlease share this with the user securely.`);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to reset password for ${userName}.`);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, role]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-syne text-xl font-extrabold text-slate-800 tracking-tight md:text-2xl">
          User Directory
        </h2>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Monitor accounts, permissions, and status parameters across onboarded lab branches.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by User Name, Email, or Pathology Lab..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <SlidersHorizontal size={14} className="text-slate-400 hidden sm:block" />
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 cursor-pointer"
          >
            <option value="all">Role: All</option>
            <option value="LAB_ADMIN">Lab Admin</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="CASHIER">Cashier</option>
          </select>
        </div>
      </div>

      {/* Main Database Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <RotateCw className="animate-spin text-sky-500" size={32} />
            <span className="mt-3 font-semibold text-xs">Querying platform users...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center font-medium text-red-500 text-sm">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No matching users found in directory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5">User Details</th>
                  <th className="py-4 px-4">Role</th>
                  <th className="py-4 px-4">Associated Lab</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Created Date</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Name & Email */}
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 text-[13px]">{user.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          @{user.username} {user.phone_number ? `• ${user.phone_number}` : (user.email ? `• ${user.email}` : "")}
                        </span>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wider ${
                          user.role === "LAB_ADMIN"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                            : user.role === "TECHNICIAN"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-sky-50 text-sky-600 border border-sky-100"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Associated Lab */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {user.lab_name}
                    </td>

                    {/* Status indicator */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                          user.status === "active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(user.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    
                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleResetPassword(user.id, user.name)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-700"
                        title="Reset Password"
                      >
                        <Key size={12} />
                        Reset Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-700">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(page * limit, totalCount)}
              </span>{" "}
              of <span className="font-bold text-slate-700">{totalCount}</span> users
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
    </div>
  );
}
