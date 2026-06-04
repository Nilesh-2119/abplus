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
  Calendar,
  Building,
  TrendingUp,
  DollarSign,
  Users
} from "lucide-react";

function InformativeReportPreviewContent() {
  const searchParams = useSearchParams();

  const reportId = searchParams.get("report_id") || "";
  const labId = searchParams.get("lab_id") || "";

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
        // If cookie parse fails, let API auth handle it
      }
    }
  }, []);

  // Collect report query filters
  const getParamsObject = useCallback(() => {
    const params: any = {};
    searchParams.forEach((value, key) => {
      if (key !== "report_id" && key !== "lab_id") {
        params[key] = value;
      }
    });
    return params;
  }, [searchParams]);

  const loadPreview = useCallback(async () => {
    if (!reportId || !labId) {
      setError("Missing required parameters (report_id, lab_id).");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = getParamsObject();
      const result = await apiService.getInformativeReportPreview(labId, reportId, params);
      setData(result);
      setError("");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load report preview.");
    } finally {
      setLoading(false);
    }
  }, [reportId, labId, getParamsObject]);

  useEffect(() => {
    if (authorized) {
      loadPreview();
    }
  }, [loadPreview, authorized]);

  const handleDownload = async (format: "pdf" | "excel") => {
    setDownloading(format);
    try {
      const params = getParamsObject();
      const url = apiService.getInformativeReportExportUrl(labId, reportId, format, params);
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${reportId}_report.${format === "pdf" ? "pdf" : "xlsx"}`;
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
            Only Lab Administrators can access informative reports.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-6 px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-55 text-xs font-black text-slate-600 transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  // Formatting utility
  const formatCellValue = (value: any, format: string) => {
    if (value === null || value === undefined) return "-";
    if (format === "currency" && typeof value === "number") {
      return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return String(value);
  };

  const isKeyValueReport = reportId === "daily_business_summary" || reportId === "monthly_lab_summary";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
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
                {data?.report_name || "Preview Report"}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Informative Reports Center
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

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex h-80 items-center justify-center text-slate-400 bg-white/70 border border-slate-200/80 rounded-2xl shadow-sm">
            <RefreshCw size={22} className="animate-spin text-teal-500" />
            <span className="ml-3 font-semibold text-sm">Generating report preview...</span>
          </div>
        ) : data ? (
          <>
            {/* Header Details */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">{data.lab_name}</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    {data.report_name}
                  </p>
                </div>
                <div className="text-right text-xs font-bold text-slate-500 space-y-1">
                  <p className="flex items-center justify-end gap-1.5">
                    <Calendar size={12} className="text-slate-400" />
                    Period: {searchParams.get("from_date") || "-"} to {searchParams.get("to_date") || "-"}
                  </p>
                  <p>Generated: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Summary metrics row if present */}
            {data.summary && Object.keys(data.summary).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data.summary).map(([key, val]: [string, any]) => {
                  const label = key.replace("total_", "").replace("_", " ").toUpperCase();
                  const isCurrency = key.includes("billing") || key.includes("paid") || key.includes("pending") || key.includes("profit") || key.includes("commission") || key.includes("collected") || key.includes("concessions") || key.includes("outstanding") || key.includes("revenue");
                  return (
                    <div key={key} className="bg-white border border-slate-200/80 p-4.5 rounded-xl flex items-center gap-4 shadow-sm">
                      <div className="h-10 w-10 bg-teal-50 border border-teal-100 rounded-lg text-teal-500 flex items-center justify-center">
                        <FileText size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 tracking-wider block">{label}</span>
                        <span className="text-lg font-black text-slate-800 mt-0.5 block">
                          {isCurrency && typeof val === "number" ? `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : val}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Main Data Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {isKeyValueReport ? (
                /* Snapshot View (Reports 9 & 10) */
                <div className="p-6">
                  <div className="max-w-2xl mx-auto border border-slate-150 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50/70 border-b border-slate-150 p-4">
                      <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                        Operational Snapshot Summary
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-150">
                      {data.records.map((r: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-4 hover:bg-slate-50/20 transition-colors">
                          <span className="text-xs font-black text-slate-500">{r.label}</span>
                          <span className={`text-xs font-black ${
                            r.value.startsWith("₹") && !r.value.includes("-₹") ? "text-teal-600 font-extrabold" : "text-slate-800"
                          }`}>
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard dynamic table rendering */
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      {data.columns.map((col: any) => (
                        <th
                          key={col.key}
                          className={`p-4 text-xs font-black text-slate-500 uppercase tracking-wider ${
                            col.format === "currency" || col.format === "number" ? "text-right" : ""
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.records.length === 0 ? (
                      <tr>
                        <td colSpan={data.columns.length} className="p-8 text-center text-xs font-bold text-slate-400">
                          No records found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      data.records.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                          {data.columns.map((col: any) => {
                            const val = r[col.key];
                            return (
                              <td
                                key={col.key}
                                className={`p-4 text-xs font-bold text-slate-700 ${
                                  col.format === "currency" ? "text-right font-black text-slate-800" :
                                  col.format === "number" ? "text-right" : ""
                                }`}
                              >
                                {formatCellValue(val, col.format)}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}

                    {/* Summary row */}
                    {data.records.length > 0 && (
                      <tr className="bg-slate-50/80 border-t-2 border-slate-350">
                        {data.columns.map((col: any, colIdx: number) => {
                          const cleanedKey = col.key.replace("total_", "");
                          // Match summary metric key
                          let sumVal = null;
                          for (const [sKey, sVal] of Object.entries(data.summary)) {
                            const cleanedSKey = sKey.replace("total_", "");
                            const isMatch = (cleanedSKey === col.key) ||
                                            (cleanedSKey === "billing" && (col.key === "billing_amount" || col.key === "bill_amount" || col.key === "referral_billing")) ||
                                            (cleanedSKey === "concessions" && col.key === "concessions_given") ||
                                            (cleanedSKey === "collected" && col.key === "cash_collected") ||
                                            (cleanedSKey === "outstanding" && col.key === "outstanding_cash") ||
                                            (cleanedSKey === "submitted" && col.key === "submitted_to_cashier") ||
                                            (cleanedSKey === "paid" && col.key === "paid_amount") ||
                                            (cleanedSKey === "pending" && (col.key === "pending_amount" || col.key === "pending_receivables"));
                            if (isMatch) {
                              sumVal = sVal;
                              break;
                            }
                          }

                          return (
                            <td
                              key={col.key}
                              className={`p-4 text-xs font-black ${
                                col.format === "currency" ? "text-right text-emerald-600" :
                                col.format === "number" ? "text-right text-slate-700" : "text-slate-600"
                              }`}
                            >
                              {colIdx === 0 ? "TOTAL" : sumVal !== null ? formatCellValue(sumVal, col.format) : ""}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-xs font-bold text-slate-400 pb-6 pt-2">
              Generated via AB+ Laboratory Platform • {data.lab_name}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function InformativeReportPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <RefreshCw size={22} className="animate-spin text-teal-500" />
          <span className="ml-3 font-semibold text-sm text-slate-400">Loading report...</span>
        </div>
      }
    >
      <InformativeReportPreviewContent />
    </Suspense>
  );
}
