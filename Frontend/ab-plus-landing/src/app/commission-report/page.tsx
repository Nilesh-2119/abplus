"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiService, authFetch, getCookie } from "@/services/api";
import {
  FileText,
  Download,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Building,
  Users,
  Percent,
  Calendar,
  Stethoscope,
  User,
} from "lucide-react";

interface ExportParams {
  type: "consolidated" | "doctor_wise";
  from_date: string;
  to_date: string;
  doctor_id?: string;
  include_patients?: boolean;
}

function CommissionReportContent() {
  const searchParams = useSearchParams();

  const reportType = (searchParams.get("type") || "consolidated") as "consolidated" | "doctor_wise";
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";
  const labId = searchParams.get("lab_id") || "";
  const doctorId = searchParams.get("doctor_id") || "";
  const includePatients = searchParams.get("include_patients") === "true";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  // Auth check
  const [authorized, setAuthorized] = useState(true);
  useEffect(() => {
    const userStr = getCookie("abplus_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role !== "LAB_ADMIN" && user.role !== "SUPER_ADMIN" && !user.is_superuser) {
          setAuthorized(false);
        }
      } catch {
        // If cookie parse fails, let the API handle auth
      }
    }
  }, []);

  const exportParams: ExportParams = {
    type: reportType,
    from_date: fromDate,
    to_date: toDate,
    ...(doctorId ? { doctor_id: doctorId } : {}),
    ...(includePatients ? { include_patients: true } : {}),
  };

  const loadPreview = useCallback(async () => {
    if (!labId || !fromDate || !toDate) {
      setError("Missing required parameters (lab_id, from, to).");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await apiService.getCommissionReportPreview(labId, exportParams);
      setData(result);
      setError("");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load report preview.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId, fromDate, toDate, reportType, doctorId, includePatients]);

  useEffect(() => {
    if (authorized) {
      loadPreview();
    }
  }, [loadPreview, authorized]);

  const handleDownload = async (format: "pdf" | "excel") => {
    setDownloading(format);
    try {
      const url =
        format === "pdf"
          ? apiService.getCommissionExportPDFUrl(labId, exportParams)
          : apiService.getCommissionExportExcelUrl(labId, exportParams);
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `commission_report_${reportType}_${fromDate}_${toDate}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error("Download failed:", e);
      setError(`Failed to download ${format.toUpperCase()} report.`);
    } finally {
      setDownloading(null);
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 max-w-md text-center">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-red-500 inline-flex mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500 font-semibold">
            Only Lab Administrators can access commission reports.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-6 px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-black text-slate-600 transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const reportLabel = reportType === "consolidated" ? "Consolidated Report" : "Doctor Wise Report";
  const isDetailed = data?.report_type === "doctor_wise_detailed";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.close()}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <FileText size={16} className="text-teal-500" />
                Commission Report
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {reportLabel} • {fromDate} to {toDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={loading || !!downloading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {downloading === "pdf" ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>Download PDF</span>
            </button>
            <button
              onClick={() => handleDownload("excel")}
              disabled={loading || !!downloading}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-500/10 px-4 py-2.5 text-xs font-black text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {downloading === "excel" ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="flex items-center justify-between gap-2 p-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex h-80 items-center justify-center text-slate-400 bg-white/70 border border-slate-200/80 rounded-2xl shadow-sm">
            <RefreshCw size={22} className="animate-spin text-teal-500" />
            <span className="ml-3 font-semibold text-sm">Generating report preview...</span>
          </div>
        ) : data ? (
          <>
            {/* Report Metadata Header */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">{data.lab_name || "Lab"}</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    AB+ Diagnostics — {reportLabel}
                  </p>
                </div>
                <div className="text-right text-xs font-bold text-slate-500 space-y-1">
                  <p className="flex items-center justify-end gap-1.5">
                    <Calendar size={12} className="text-slate-400" />
                    Period: {fromDate} to {toDate}
                  </p>
                  <p>Generated: {new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* Doctor info for doctor_wise */}
              {data.doctor && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="p-2 bg-cyan-50 rounded-lg border border-cyan-100 text-cyan-500">
                    <Stethoscope size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{data.doctor.name}</p>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Building size={11} /> {data.doctor.hospital}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.summary.total_doctors !== undefined && (
                <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4 shadow-sm">
                  <div className="h-10 w-10 bg-purple-50 border border-purple-100 rounded-lg text-purple-500 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Doctors</span>
                    <span className="text-xl font-black text-slate-800 mt-0.5 block">{data.summary.total_doctors}</span>
                  </div>
                </div>
              )}
              <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4 shadow-sm">
                <div className="h-10 w-10 bg-cyan-50 border border-cyan-100 rounded-lg text-cyan-500 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Patients</span>
                  <span className="text-xl font-black text-slate-800 mt-0.5 block">{data.summary.total_patients}</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4 shadow-sm">
                <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Billing</span>
                  <span className="text-xl font-black text-slate-800 mt-0.5 block">
                    ₹{(data.summary.total_billing || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4 shadow-sm">
                <div className="h-10 w-10 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-500 flex items-center justify-center">
                  <Percent size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Commission</span>
                  <span className="text-xl font-black text-emerald-600 mt-0.5 block">
                    ₹{(data.summary.total_commission || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Report Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {isDetailed ? (
                /* Patient-level detail table */
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Patient Info</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Test</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Billing (₹)</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Commission (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.records.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 border border-slate-150 text-slate-500">
                              <User size={13} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-800 block">{r.patient_name}</span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono mt-0.5 block">{r.patient_code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-500">{r.registration_date}</td>
                        <td className="p-4 text-xs font-bold text-slate-700">{r.tests_performed}</td>
                        <td className="p-4 text-right text-xs font-bold text-slate-700">₹{r.billing_amount?.toFixed(2)}</td>
                        <td className="p-4 text-right text-xs font-black text-slate-800">₹{r.commission_amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                    {/* Summary Row */}
                    <tr className="bg-slate-50/80 border-t-2 border-slate-300">
                      <td colSpan={3} className="p-4 text-xs font-black text-slate-600 text-right">TOTAL</td>
                      <td className="p-4 text-right text-sm font-black text-slate-800">
                        ₹{(data.summary.total_billing || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-sm font-black text-emerald-600">
                        ₹{(data.summary.total_commission || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                /* Consolidated / Doctor-level summary table */
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Doctor Details</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Patient Count</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Referral Billing</th>
                      <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Total Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.records.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-500 shadow-sm flex-shrink-0">
                              <Stethoscope size={16} />
                            </div>
                            <div>
                              <span className="text-sm font-black text-slate-800 block">{r.doctor_name}</span>
                              <span className="text-xs font-bold text-slate-400 block mt-0.5 flex items-center gap-1">
                                <Building size={11} /> {r.hospital_name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-xs font-black text-slate-700 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                            {r.patient_count}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-bold text-slate-700">₹{r.referral_billing?.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-black text-slate-800">₹{r.total_commission?.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                    {/* Summary Row */}
                    <tr className="bg-slate-50/80 border-t-2 border-slate-300">
                      <td className="p-4 text-xs font-black text-slate-600">TOTAL ({data.records.length} Doctors)</td>
                      <td className="p-4 text-center text-sm font-black text-slate-700">
                        {data.summary.total_patients}
                      </td>
                      <td className="p-4 text-right text-sm font-black text-slate-800">
                        ₹{(data.summary.total_billing || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right text-sm font-black text-emerald-600">
                        ₹{(data.summary.total_commission || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs font-bold text-slate-400 pb-6 pt-2">
              Generated via AB+ Laboratory Platform • {data.lab_name || "Lab"}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function CommissionReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <RefreshCw size={22} className="animate-spin text-teal-500" />
          <span className="ml-3 font-semibold text-sm text-slate-400">Loading report...</span>
        </div>
      }
    >
      <CommissionReportContent />
    </Suspense>
  );
}
