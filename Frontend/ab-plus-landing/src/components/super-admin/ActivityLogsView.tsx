"use client";

import { useEffect, useState } from "react";
import { apiService, ActivityLog } from "@/services/api";
import { Clock, ChevronLeft, ChevronRight, RotateCw, RefreshCw } from "lucide-react";

export default function ActivityLogsView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 8;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await apiService.getActivityLogs({ page, limit });
      setLogs(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error(err);
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-800 tracking-tight md:text-2xl">
            System Activity Logs
          </h2>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Complete audit trail detailing Super Admin provisioning actions and operational changes.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Database Logs timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <RotateCw className="animate-spin text-sky-500" size={32} />
            <span className="mt-3 font-semibold text-xs">Querying audit trail database...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center font-medium text-red-500 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No activity logs recorded.</div>
        ) : (
          <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                {/* Timeline node */}
                <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full border border-sky-200 bg-sky-50 ring-4 ring-white">
                  <Clock size={8} className="text-sky-500" />
                </span>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-700">{log.action}</h4>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      Operator: <span className="text-slate-500 font-semibold">{log.user_email}</span>
                      {log.lab_name && (
                        <>
                          {" "}
                          • Target: <span className="text-indigo-500 font-semibold">{log.lab_name}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                    {new Date(log.timestamp).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {!loading && logs.length > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-700">{(page - 1) * limit + 1}</span> to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(page * limit, totalCount)}
              </span>{" "}
              of <span className="font-bold text-slate-700">{totalCount}</span> log events
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
