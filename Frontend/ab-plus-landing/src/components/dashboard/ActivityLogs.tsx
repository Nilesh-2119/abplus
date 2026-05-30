"use client";

import { useEffect, useState } from "react";
import { apiService, ActivityLog } from "@/services/api";
import {
  History,
  RefreshCw,
  AlertCircle,
  Clock,
  User,
  Activity
} from "lucide-react";

interface ActivityLogsProps {
  labId: string;
}

export default function ActivityLogs({ labId }: ActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getLabActivityLogs(labId);
      setLogs(data);
      setErrorMsg("");
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to retrieve workspace audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [labId]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-white/70 border border-slate-200/80 p-4 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="font-syne text-[14px] font-extrabold text-slate-800">Workspace Activity Logs</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
            Chronological audit feed of diagnostic operations and system modifications
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors bg-white shadow-sm"
          title="Reload audit records"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Audit Timeline list ── */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
        {loading ? (
          <div className="flex h-36 items-center justify-center text-slate-400">
            <RefreshCw size={18} className="animate-spin text-cyan-500" />
            <span className="ml-3 font-semibold text-xs">Retrieving audit feed...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
            <History size={32} className="stroke-1 mb-2" />
            <span className="text-[10px] font-bold">No registered events recorded yet.</span>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6 py-2">
            {logs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-cyan-500 shadow-sm shadow-cyan-500/20 group-hover:scale-110 transition-transform" />
                
                <div className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-800">
                      {log.action}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                    <User size={11} className="text-slate-300" />
                    <span>Operator: {log.user_email}</span>
                    {log.lab_name && (
                      <span className="text-[8px] font-extrabold bg-slate-50 border px-1.5 py-0.5 rounded text-slate-400">
                        {log.lab_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
