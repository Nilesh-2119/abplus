"use client";

import { useEffect, useRef, useState } from "react";
import { apiService, PatientEntry, LabSettings } from "@/services/api";
import { useIntervalRefetch } from "@/hooks/useIntervalRefetch";
import {
  Printer,
  Search,
  RefreshCw,
  FileText,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReportsProps {
  labId: string;
  currentRole: string;
}

export default function ReportsSection({ labId, currentRole }: ReportsProps) {
  const [patients, setPatients] = useState<PatientEntry[]>([]);
  const [labSettings, setLabSettings] = useState<LabSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePatient, setActivePatient] = useState<PatientEntry | null>(null);

  // Print/Letterhead overlay adjustment states
  const [useLetterhead, setUseLetterhead] = useState(true);
  const [topPadding, setTopPadding] = useState(45); // default top offset in mm
  const [bottomPadding, setBottomPadding] = useState(30); // default bottom offset in mm

  // Page state — each "page" is either the header/patient-info or one test panel
  const [currentPage, setCurrentPage] = useState(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await apiService.getPatients(labId, currentRole, searchQuery, "COMPLETED");
      const deliveredData = await apiService.getPatients(labId, currentRole, searchQuery, "DELIVERED");
      const combined = [...data, ...deliveredData].sort((a, b) => b.id.localeCompare(a.id));
      setPatients(combined);
      const settings = await apiService.getLabSettings(labId);
      setLabSettings(settings);
      if (!isBackground) setErrorMsg("");
    } catch (e) {
      console.error(e);
      if (!isBackground) setErrorMsg("Failed to retrieve reports database.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [labId, searchQuery]);

  useIntervalRefetch(() => fetchData(true), 5000);

  // Keep activePatient in sync after refresh
  useEffect(() => {
    if (activePatient) {
      const updated = patients.find(p => p.id === activePatient.id);
      if (updated) {
        setActivePatient(updated);
      } else {
        setActivePatient(null);
      }
    }
  }, [patients]);

  // Reset to page 0 whenever patient changes
  const prevPatientIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activePatient) {
      if (prevPatientIdRef.current !== activePatient.id) {
        setCurrentPage(0);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        prevPatientIdRef.current = activePatient.id;
      }
    } else {
      prevPatientIdRef.current = null;
    }
  }, [activePatient]);

  const handlePrint = () => {
    if (!activePatient) return;
    window.print();
  };

  const getParamFlag = (value: any, min: number, max: number): "LOW" | "HIGH" | "NORMAL" | "" => {
    if (value === undefined || value === null || value === "") return "";
    const num = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(num)) return "";
    if (num < min) return "LOW";
    if (num > max) return "HIGH";
    return "NORMAL";
  };

  // Build "pages": pages 0..N-1 = one test each, last page = footer
  const buildPages = (patient: PatientEntry) => {
    type Page =
      | { type: "cover" }
      | { type: "test"; testIndex: number }
      | { type: "footer" };
    const pages: Page[] = [];
    patient.tests.forEach((_, idx) => pages.push({ type: "test", testIndex: idx }));
    pages.push({ type: "footer" });
    return pages;
  };

  const pages = activePatient ? buildPages(activePatient) : [];
  const totalPages = pages.length;

  const goToPage = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, totalPages - 1));
    setCurrentPage(clamped);
    pageRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Intersection observer to track current visible page
  useEffect(() => {
    if (!scrollContainerRef.current || totalPages === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-page-idx"));
            if (!isNaN(idx)) setCurrentPage(idx);
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "0px",
        threshold: 0.55,
      }
    );
    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, [activePatient, totalPages]);

  const renderPatientHeader = (patient: PatientEntry) => {
    return (
      <div className="border-t border-b border-slate-800 py-1.5 my-2.5 grid grid-cols-12 gap-y-1 text-[11px] font-bold text-slate-800 leading-normal">
        <div className="col-span-8 flex">
          <span className="w-16 shrink-0 text-slate-500">PAT ID</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="font-mono font-black text-slate-900">{patient.id}</span>
        </div>
        <div className="col-span-4 flex">
          <span className="w-12 shrink-0 text-slate-500">AGE</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="text-slate-900">{patient.age} Years</span>
        </div>

        <div className="col-span-8 flex">
          <span className="w-16 shrink-0 text-slate-500">NAME</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="text-slate-900 uppercase font-black">{patient.name}</span>
        </div>
        <div className="col-span-4 flex">
          <span className="w-12 shrink-0 text-slate-500">SEX</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="text-slate-900">{patient.gender}</span>
        </div>

        <div className="col-span-8 flex">
          <span className="w-16 shrink-0 text-slate-500">REF BY</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="text-slate-900 truncate pr-2">{patient.referred_doctor_name || "Self Ref"}</span>
        </div>
        <div className="col-span-4 flex">
          <span className="w-12 shrink-0 text-slate-500">DATE</span>
          <span className="mr-2 text-slate-400">:</span>
          <span className="text-slate-900">{patient.created_at}</span>
        </div>
      </div>
    );
  };

  // ── Render a single "page card" ──
  const renderPageContent = (pageIdx: number) => {
    if (!activePatient) return null;
    const page = pages[pageIdx];

    if (page.type === "cover") {
      return (
        <div className="space-y-5">
          {/* Lab Letterhead */}
          {(!useLetterhead || !labSettings?.letterhead_base64) ? (
            <div className="flex justify-between items-start pb-5 border-b-2 border-slate-800 gap-4">
              <div className="space-y-1">
                {labSettings?.logo_base64 ? (
                  <img src={labSettings.logo_base64} alt="Lab Logo" className="h-10 w-auto object-contain mb-2" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-syne text-[15px] font-black text-white shadow mb-2">
                    AB+
                  </div>
                )}
                <h2 className="text-[18px] font-black text-slate-900 font-syne uppercase tracking-wide">
                  {labSettings?.name || "AB+ Pathology Laboratory"}
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-sm">
                  {labSettings?.address || "710, Deccan Gymkhana, Pune, Maharashtra 411004"}
                </p>
                <p className="text-[11px] text-slate-400 font-bold">
                  Phone: {labSettings?.phone || "+91 98765 43210"}
                </p>
              </div>
              <div className="text-right space-y-1 shrink-0">
                <span className="text-[12px] font-extrabold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100 uppercase tracking-wider font-mono block">
                  Pathology Diagnostics
                </span>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Accreditation: ISO 9001:2015</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Diagnostic Report</span>
              <span>Confidential</span>
            </div>
          )}

          {/* Patient Info Header */}
          {renderPatientHeader(activePatient)}

          {/* Tests overview */}
          <div>
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">
              Tests Ordered ({activePatient.tests.length})
            </h3>
            <div className="space-y-1.5">
              {activePatient.tests.map((test, idx) => (
                <button
                  key={test.id}
                  onClick={() => goToPage(idx + 1)}
                  className="w-full flex items-center justify-between p-2.5 bg-white border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/30 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-lg bg-slate-100 group-hover:bg-cyan-100 flex items-center justify-center text-[11px] font-black text-slate-500 group-hover:text-cyan-600 transition-colors shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[12px] font-bold text-slate-700 group-hover:text-slate-900">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">{test.parameters.length} params</span>
                    <ChevronRight size={11} className="text-slate-300 group-hover:text-cyan-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (page.type === "test") {
      const test = activePatient.tests[page.testIndex];
      return (
        <div className="space-y-4">
          {renderPatientHeader(activePatient)}

          {/* Test Panel Header */}
          <div className="text-center pb-2">
            <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">{test.name}</h3>
          </div>

          {/* Results Table */}
          <table className="w-full text-left border-collapse text-[11px] font-semibold">
            <thead>
              <tr className="text-slate-800 font-bold uppercase">
                <th className="py-2.5 px-3 w-[40%] text-left">
                  <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">TESTS</span>
                </th>
                <th className="py-2.5 px-3 w-[25%] text-left">
                  <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">RESULTS</span>
                </th>
                <th className="py-2.5 px-3 w-[15%] text-left">
                  <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">UNIT</span>
                </th>
                <th className="py-2.5 px-3 w-[20%] text-left">
                  <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">REFERENCE RANGE</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-transparent">
              {test.parameters.map((param, pIdx) => {
                const val = activePatient.results[param.id];
                const flag = getParamFlag(val, param.min_val, param.max_val);
                const isLow = flag === "LOW";
                const isHigh = flag === "HIGH";
                const isAbnormal = isLow || isHigh;
                const isHeader = (!param.unit && !param.min_val && !param.max_val) && (val === undefined || val === null || val === "");

                if (isHeader) {
                  return (
                    <tr key={param.id} className="text-slate-800">
                      <td colSpan={4} className="py-2.5 px-3">
                        <span className="font-bold text-[12px] uppercase underline decoration-2 underline-offset-4 tracking-wide text-slate-900">
                          {param.name}
                        </span>
                      </td>
                    </tr>
                  );
                }

                const hasRange = param.min_val !== undefined && param.max_val !== undefined && (param.min_val !== 0 || param.max_val !== 0);
                const rangeStr = hasRange ? `${param.min_val} – ${param.max_val}` : "";

                return (
                  <tr key={param.id} className="text-slate-800 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-700">{param.name}</td>
                    <td className="py-2 px-3 text-left">
                      <span className={isAbnormal ? "text-rose-600 font-black text-[11px]" : "text-slate-900 font-bold text-[11px]"}>
                        : {val !== undefined ? val : "—"}
                        {isLow && <span className="text-[9px] font-black ml-1">↓</span>}
                        {isHigh && <span className="text-[9px] font-black ml-1">↑</span>}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-left text-slate-600">{param.unit || ""}</td>
                    <td className="py-2 px-3 text-left text-slate-500 font-mono">
                      {rangeStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Abnormal note if any */}
          {test.parameters.some((p) => {
            const v = activePatient.results[p.id];
            return getParamFlag(v, p.min_val, p.max_val) !== "NORMAL" && getParamFlag(v, p.min_val, p.max_val) !== "";
          }) && (
            <div className="flex items-start gap-2 p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl">
              <AlertCircle size={12} className="text-rose-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-rose-600 font-semibold">
                One or more values are outside the reference range. Please consult your physician.
              </p>
            </div>
          )}
        </div>
      );
    }

    if (page.type === "footer") {
      return (
        <div className="space-y-6">
          {renderPatientHeader(activePatient)}
          {/* Summary */}
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">Summary</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-lg font-black text-slate-800">{activePatient.tests.length}</span>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Tests Ordered</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <span className="text-lg font-black text-emerald-600">
                  {activePatient.tests.reduce((s, t) => s + t.parameters.filter((p) => {
                    const v = activePatient.results[p.id];
                    return getParamFlag(v, p.min_val, p.max_val) === "NORMAL";
                  }).length, 0)}
                </span>
                <p className="text-[10px] font-bold text-emerald-500 mt-0.5">Normal Values</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                <span className="text-lg font-black text-rose-600">
                  {activePatient.tests.reduce((s, t) => s + t.parameters.filter((p) => {
                    const v = activePatient.results[p.id];
                    const f = getParamFlag(v, p.min_val, p.max_val);
                    return f === "LOW" || f === "HIGH";
                  }).length, 0)}
                </span>
                <p className="text-[10px] font-bold text-rose-400 mt-0.5">Abnormal Values</p>
              </div>
            </div>
          </div>

          {/* Doctor sign-off */}
          <div className="flex justify-between items-end gap-6">
            <div className="text-[10px] font-bold text-slate-400 space-y-1">
              <span className="block font-mono font-black text-slate-800 text-[11px]">BARCODE STAMP</span>
              <span className="block">Diagnostic System Validation</span>
              <span className="block font-mono text-slate-300">{activePatient.id}</span>
            </div>
            <div className="text-right space-y-1.5">
              <div className="h-10 w-32 bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center rounded-lg text-[9px] text-slate-300 font-extrabold uppercase italic select-none ml-auto">
                Signature
              </div>
              <span className="block text-[11px] text-slate-800 font-black">Dr. Rajesh Sharma, MD</span>
              <span className="block text-[9px] text-slate-400 font-semibold">Pathologist & Lab Director</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-semibold">
              This report is generated electronically and is valid without signature when digitally authenticated.
            </p>
            <p className="text-[10px] text-slate-300 font-semibold mt-0.5">
              {labSettings?.name || "AB+ Pathology"} • {labSettings?.address || "Pune, Maharashtra"}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #abplus-print-template, #abplus-print-template * {
            visibility: visible;
          }
          #abplus-print-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
          }
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            position: relative;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-page-content {
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
          }
        }
        @media screen {
          .preview-page-card {
            zoom: 0.9;
          }
        }
      `}</style>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl mb-3 shrink-0">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ height: "calc(100vh - 130px)", minHeight: "600px" }}>

        {/* LEFT: Patient List & Controls */}
        <div className="lg:col-span-4 flex flex-col gap-3 h-full overflow-hidden animate-fade-in">
          {/* 1. Search Patient */}
          <div className="relative shrink-0">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-sm"
            />
          </div>

          {/* 2. Print Report Layout Button */}
          <button
            onClick={handlePrint}
            disabled={!activePatient}
            className="w-full flex items-center justify-center gap-2 shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Printer size={13} />
            <span>Print Blood Report</span>
          </button>

          {/* 3. Pathology Reports List Card */}
          <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-cyan-500" />
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Blood Reports List</h3>
              </div>
              <button
                onClick={() => fetchData()}
                className="p-1 border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors bg-white"
                title="Refresh List"
              >
                <RefreshCw size={11} className={loading ? "animate-spin text-cyan-500" : ""} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex h-36 items-center justify-center text-slate-400">
                  <RefreshCw size={16} className="animate-spin text-cyan-500" />
                  <span className="ml-2 font-semibold text-xs">Loading...</span>
                </div>
              ) : patients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                  <FileText size={28} className="stroke-1 mb-2" />
                  <span className="text-[10px] font-bold">No verified blood reports found.</span>
                </div>
              ) : (
                patients.map((pat) => {
                  const isActive = activePatient?.id === pat.id;
                  return (
                    <button
                      key={pat.id}
                      onClick={() => setActivePatient(pat)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-cyan-50 border-cyan-400 shadow-sm shadow-cyan-100"
                          : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className={`block text-xs font-bold truncate ${isActive ? "text-cyan-700" : "text-slate-800"}`}>
                          {pat.name}
                        </span>
                        <span className="block text-[8px] font-mono font-black text-slate-400 uppercase tracking-wide">
                          {pat.id} • {pat.age}y • {pat.gender}
                        </span>
                        <span className="text-[8px] text-slate-400 font-semibold">
                          {pat.tests.length} test{pat.tests.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded-lg uppercase tracking-wider ${
                          pat.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-cyan-50 text-cyan-600 border border-cyan-100"
                        }`}>
                          {pat.status}
                        </span>
                        {isActive ? (
                          <CheckCircle2 size={13} className="text-cyan-500" />
                        ) : (
                          <Eye size={12} className="text-slate-300" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Page-Scroll Report Preview */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
          {activePatient ? (
            <>
              {/* Scrollable Pages Container */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto space-y-6 pr-1"
                style={{ scrollBehavior: "smooth" }}
              >
                {/* Hidden print template — all pages */}
                <div id="abplus-print-template" className="hidden print:block w-[210mm] mx-auto p-0 bg-white">
                  {pages.map((page, idx) => (
                    <div
                      key={idx}
                      className="print-page relative bg-white overflow-hidden"
                      style={{
                        width: "210mm",
                        height: "297mm",
                        pageBreakAfter: "always",
                        backgroundImage: useLetterhead && labSettings?.letterhead_base64 ? `url(${labSettings.letterhead_base64})` : "none",
                        backgroundSize: "100% 100%",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        paddingTop: useLetterhead && labSettings?.letterhead_base64 ? `${topPadding}mm` : "20mm",
                        paddingBottom: useLetterhead && labSettings?.letterhead_base64 ? `${bottomPadding}mm` : "20mm",
                        paddingLeft: "20mm",
                        paddingRight: "20mm",
                        boxSizing: "border-box",
                      }}
                    >
                      <div className="print-page-content h-full flex flex-col justify-between">
                        {/* Page Content */}
                        <div className="flex-1">
                          {/* If cover page and text header is needed */}
                          {page.type === "cover" && (
                            <div className="space-y-6">
                              {(!useLetterhead || !labSettings?.letterhead_base64) && (
                                <div className="flex justify-between items-start pb-4 border-b border-slate-300 gap-4 mb-4">
                                  <div className="space-y-1">
                                    {labSettings?.logo_base64 ? (
                                      <img src={labSettings.logo_base64} alt="Lab Logo" className="h-8 w-auto object-contain mb-1" />
                                    ) : (
                                      <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-cyan-400 to-blue-600 font-syne text-[13px] font-black text-white shadow mb-1">
                                        AB+
                                      </div>
                                    )}
                                    <h2 className="text-[16px] font-black text-slate-900 font-syne uppercase tracking-wide">
                                      {labSettings?.name || "AB+ Pathology Laboratory"}
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed max-w-sm">
                                      {labSettings?.address}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold">
                                      Phone: {labSettings?.phone}
                                    </p>
                                  </div>
                                  <div className="text-right space-y-0.5">
                                    <span className="text-[11px] font-extrabold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border uppercase tracking-wider font-mono">
                                      Pathology Diagnostics
                                    </span>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">Accreditation: ISO 9001:2015</p>
                                  </div>
                                </div>
                              )}

                              {useLetterhead && labSettings?.letterhead_base64 && (
                                <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100 mb-4">
                                  Diagnostic Report
                                </div>
                              )}

                              {/* Patient Info Header */}
                              {renderPatientHeader(activePatient)}

                              {/* Tests list */}
                              <div>
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2.5">
                                  Tests Ordered & Diagnostic Status
                                </h3>
                                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                                  {activePatient.tests.map((test, testIdx) => (
                                    <div key={test.id} className="flex items-center justify-between p-3 bg-white text-[11px] font-semibold">
                                      <div className="flex items-center gap-2">
                                        <span className="h-5 w-5 rounded bg-slate-100 flex items-center justify-center font-black text-slate-500">
                                          {testIdx + 1}
                                        </span>
                                        <span className="font-bold text-slate-700">{test.name}</span>
                                      </div>
                                      <span className="text-slate-400">{test.parameters.length} parameters analyzed</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {page.type === "test" && (() => {
                            const test = activePatient.tests[page.testIndex];
                            return (
                              <div className="space-y-4">
                                {renderPatientHeader(activePatient)}

                                {/* Test Panel Header */}
                                <div className="text-center pb-2">
                                  <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">{test.name}</h3>
                                </div>

                                <table className="w-full text-left border-collapse text-[11px] font-semibold">
                                  <thead>
                                    <tr className="text-slate-800 font-bold uppercase">
                                      <th className="py-2 px-3 w-[40%] text-left">
                                        <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">TESTS</span>
                                      </th>
                                      <th className="py-2 px-3 w-[25%] text-left">
                                        <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">RESULTS</span>
                                      </th>
                                      <th className="py-2 px-3 w-[15%] text-left">
                                        <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">UNIT</span>
                                      </th>
                                      <th className="py-2 px-3 w-[20%] text-left">
                                        <span className="border-b border-slate-900 pb-0.5 font-bold uppercase tracking-wider text-slate-800">REFERENCE RANGE</span>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-transparent">
                                    {test.parameters.map((param, pIdx) => {
                                      const val = activePatient.results[param.id];
                                      const flag = getParamFlag(val, param.min_val, param.max_val);
                                      const isLow = flag === "LOW";
                                      const isHigh = flag === "HIGH";
                                      const isAbnormal = isLow || isHigh;
                                      const isHeader = (!param.unit && !param.min_val && !param.max_val) && (val === undefined || val === null || val === "");

                                      if (isHeader) {
                                        return (
                                          <tr key={param.id} className="text-slate-800">
                                            <td colSpan={4} className="py-2.5 px-3">
                                              <span className="font-bold text-[12px] uppercase underline decoration-2 underline-offset-4 tracking-wide text-slate-900">
                                                {param.name}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      }

                                      const hasRange = param.min_val !== undefined && param.max_val !== undefined && (param.min_val !== 0 || param.max_val !== 0);
                                      const rangeStr = hasRange ? `${param.min_val} – ${param.max_val}` : "";

                                      return (
                                        <tr key={param.id} className="text-slate-800">
                                          <td className="py-2 px-3 font-semibold text-slate-700">{param.name}</td>
                                          <td className="py-2 px-3 text-left">
                                            <span className={isAbnormal ? "text-rose-600 font-black text-[11px]" : "text-slate-900 font-bold text-[11px]"}>
                                              : {val !== undefined ? val : "—"}
                                              {isLow && <span className="text-[9px] font-black ml-1">↓</span>}
                                              {isHigh && <span className="text-[9px] font-black ml-1">↑</span>}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-left text-slate-600">{param.unit || ""}</td>
                                          <td className="py-2 px-3 text-left text-slate-500 font-mono">
                                            {rangeStr}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}

                          {page.type === "footer" && (
                            <div className="space-y-6">
                              {renderPatientHeader(activePatient)}
                              <div className="pb-4 border-b border-slate-200">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">Diagnostic Summary</h3>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                                    <span className="text-lg font-black text-slate-800">{activePatient.tests.length}</span>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">Tests Ordered</p>
                                  </div>
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                                    <span className="text-lg font-black text-emerald-600">
                                      {activePatient.tests.reduce((s, t) => s + t.parameters.filter((p) => {
                                        const v = activePatient.results[p.id];
                                        return getParamFlag(v, p.min_val, p.max_val) === "NORMAL";
                                      }).length, 0)}
                                    </span>
                                    <p className="text-[10px] font-bold text-emerald-500 mt-0.5">Normal Values</p>
                                  </div>
                                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                                    <span className="text-lg font-black text-rose-600">
                                      {activePatient.tests.reduce((s, t) => s + t.parameters.filter((p) => {
                                        const v = activePatient.results[p.id];
                                        const f = getParamFlag(v, p.min_val, p.max_val);
                                        return f === "LOW" || f === "HIGH";
                                      }).length, 0)}
                                    </span>
                                    <p className="text-[10px] font-bold text-rose-400 mt-0.5">Abnormal Values</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-between items-end gap-6 pt-4">
                                <div className="text-[10px] font-bold text-slate-400 space-y-1">
                                  <span className="block font-mono font-black text-slate-800 text-[11px]">BARCODE STAMP</span>
                                  <span className="block">Diagnostic System Validation</span>
                                  <span className="block font-mono text-slate-300">{activePatient.id}</span>
                                </div>
                                <div className="text-right space-y-1">
                                  <div className="h-10 w-32 bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center rounded-lg text-[9px] text-slate-300 font-extrabold uppercase italic ml-auto select-none">
                                    Signature
                                  </div>
                                  <span className="block text-[11px] text-slate-800 font-black">Dr. Rajesh Sharma, MD</span>
                                  <span className="block text-[9px] text-slate-400 font-semibold">Pathologist & Lab Director</span>
                                </div>
                              </div>

                              <div className="pt-6 border-t border-slate-100 text-center space-y-1">
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  This report is generated electronically and is valid without signature when digitally authenticated.
                                </p>
                                <p className="text-[9px] text-slate-300">
                                  {labSettings?.name} • {labSettings?.address}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Page Footer */}
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2 shrink-0">
                          <span>{activePatient.name} ({activePatient.id})</span>
                          <span>Page {idx + 1} of {totalPages}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visible paged content */}
                {pages.map((_, pageIdx) => (
                  <motion.div
                    key={pageIdx}
                    ref={(el) => { pageRefs.current[pageIdx] = el; }}
                    data-page-idx={pageIdx}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pageIdx * 0.04, duration: 0.35 }}
                    className={`preview-page-card relative bg-white rounded-2xl shadow-md border transition-all duration-300 overflow-hidden flex flex-col shrink-0 w-[210mm] max-w-full aspect-[210/297] mx-auto ${
                      pageIdx === currentPage
                        ? "border-cyan-300 shadow-cyan-100/50 shadow-lg ring-1 ring-cyan-200/50"
                        : "border-slate-200/80"
                    }`}
                    style={{
                      backgroundImage: useLetterhead && labSettings?.letterhead_base64 ? `url(${labSettings.letterhead_base64})` : "none",
                      backgroundSize: "100% 100%",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundColor: "white",
                    }}
                  >
                    {/* Page top edge highlight */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-all ${
                      pageIdx === currentPage ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-slate-100"
                    }`} />

                    {/* Page number badge */}
                    <div className="absolute top-3 right-4 flex items-center gap-1.5 z-10">
                      <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border font-mono tracking-wider ${
                        pageIdx === currentPage
                          ? "text-cyan-600 bg-cyan-50 border-cyan-200 shadow-sm"
                          : "text-slate-400 bg-slate-50 border-slate-200"
                      }`}>
                        {pageIdx + 1} / {totalPages}
                      </span>
                    </div>

                    {/* Page content wrapper with dynamic margins */}
                    <div
                      className="p-6 flex-1 flex flex-col justify-between overflow-hidden"
                      style={{
                        paddingTop: useLetterhead && labSettings?.letterhead_base64 ? `${topPadding}mm` : "2rem",
                        paddingBottom: useLetterhead && labSettings?.letterhead_base64 ? `${bottomPadding}mm` : "2rem",
                        paddingLeft: useLetterhead && labSettings?.letterhead_base64 ? "20mm" : "1.5rem",
                        paddingRight: useLetterhead && labSettings?.letterhead_base64 ? "20mm" : "1.5rem",
                        boxSizing: "border-box",
                      }}
                    >
                      <div className="flex-1 flex flex-col justify-between h-full">
                        <div className="flex-1">
                          {renderPageContent(pageIdx)}
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2 shrink-0 mt-4">
                          <span>{activePatient.name} ({activePatient.id})</span>
                          <span>Page {pageIdx + 1} of {totalPages}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom shadow for paper depth effect */}
                    <div className="absolute bottom-0 left-4 right-4 h-1 bg-gradient-to-b from-transparent to-slate-100/30 rounded-b-xl" />
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center text-slate-400 p-8">
              <div className="h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen size={28} className="stroke-1 text-slate-300" />
              </div>
              <h3 className="font-syne text-[13px] font-extrabold text-slate-700 mb-1">No Blood Report Selected</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs">
                Select a completed blood report from the list to preview it page by page.
              </p>
              <div className="flex items-center gap-2 mt-4 text-[9px] text-slate-400 font-semibold">
                <ChevronLeft size={11} />
                <span>Pick a patient from the left panel</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
