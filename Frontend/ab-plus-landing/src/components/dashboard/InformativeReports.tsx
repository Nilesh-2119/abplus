"use client";

import React, { useState, useEffect } from "react";
import { apiService } from "@/services/api";
import {
  FileText,
  Calendar,
  Users,
  Beaker,
  Stethoscope,
  TrendingUp,
  DollarSign,
  Briefcase,
  AlertCircle,
  Play,
  Activity,
  User,
  Clock,
  Building
} from "lucide-react";

interface InformativeReportsProps {
  labId: string;
  currentRole: string;
}

interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  filters: string[];
}

export default function InformativeReports({ labId, currentRole }: InformativeReportsProps) {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [activeReportId, setActiveReportId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filter Data lists
  const [doctors, setDoctors] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [collectionBoys, setCollectionBoys] = useState<any[]>([]);

  // Filter Input States
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [singleDate, setSingleDate] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedAging, setSelectedAging] = useState<string>("Current");
  
  // Entity Selection States
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [selectedCollectionBoyId, setSelectedCollectionBoyId] = useState<string>("");

  // Validation States
  const [validationError, setValidationError] = useState<string>("");

  // 1. Load available reports & filter dropdown items
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        // Fetch reports list from API
        const reportsList = await apiService.getInformativeReportsList();
        setReports(reportsList);
        if (reportsList.length > 0) {
          setActiveReportId(reportsList[0].id);
        }

        // Fetch dropdown options in parallel
        const [doctorsList, testsList, employeesList] = await Promise.all([
          apiService.getReferredDoctors(labId),
          apiService.getTests(labId),
          apiService.getEmployees(labId)
        ]);

        setDoctors(doctorsList);
        setTests(testsList);
        setCollectionBoys(employeesList.filter(e => e.role === "COLLECTION_BOY"));
      } catch (err: any) {
        console.error("Error loading informative reports initial data:", err);
        setErrorMsg("Failed to connect to the reports server.");
        
        // Local fallback definition for absolute reliability
        const fallbackReports = [
          { id: "patients_by_doctor", name: "Patients by Doctor Report", description: "Generate patient reports for selected doctors.", filters: ["date_range", "doctor_ids"] },
          { id: "consolidated_patient", name: "Consolidated Patient Report", description: "Show all patients registered during the selected period.", filters: ["date_range"] },
          { id: "test_wise_patient", name: "Test Wise Patient Report", description: "Find all patients who performed specific tests.", filters: ["date_range", "test_ids"] },
          { id: "doctor_referral_summary", name: "Doctor Referral Summary Report", description: "Doctor performance and referral analysis.", filters: ["date_range", "doctor_id"] },
          { id: "collection_boy_performance", name: "Collection Boy Performance Report", description: "Track collection boy collections, submissions, and cash in hand.", filters: ["date_range", "collection_boy_id"] },
          { id: "pending_payment", name: "Pending Payment Report", description: "Track outstanding patient dues and aging receivables.", filters: ["aging_buckets"] },
          { id: "concession", name: "Concession Report", description: "Track discounts given by doctors or collection boys.", filters: ["date_range", "collection_boy_id", "doctor_id"] },
          { id: "daily_business_summary", name: "Daily Business Summary", description: "Single day operational and financial snapshot.", filters: ["single_date"] },
          { id: "monthly_lab_summary", name: "Monthly Lab Summary Report", description: "Monthly operational and financial summary report.", filters: ["month_year"] }
        ];
        setReports(fallbackReports);
        setActiveReportId("patients_by_doctor");
      } finally {
        setLoading(false);
      }
    }

    // Default dates setup
    const todayStr = new Date().toISOString().split("T")[0];
    const firstDayStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    setFromDate(firstDayStr);
    setToDate(todayStr);
    setSingleDate(todayStr);

    loadInitialData();
  }, [labId]);

  const activeReport = reports.find(r => r.id === activeReportId);

  // Toggle multiselect doctor IDs
  const toggleDoctorSelection = (docId: string) => {
    setSelectedDoctorIds(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Toggle multiselect test IDs
  const toggleTestSelection = (testId: string) => {
    setSelectedTestIds(prev => 
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  // Submit / Generate Action
  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (!activeReport) return;

    const queryParams: any = {};

    // Validate filters based on report metadata
    const filters = activeReport.filters;

    if (filters.includes("date_range")) {
      if (!fromDate || !toDate) {
        setValidationError("Please specify both From Date and To Date.");
        return;
      }
      if (new Date(fromDate) > new Date(toDate)) {
        setValidationError("From Date cannot be greater than To Date.");
        return;
      }
      queryParams.from_date = fromDate;
      queryParams.to_date = toDate;
    }

    if (filters.includes("single_date")) {
      if (!singleDate) {
        setValidationError("Please specify a valid Date.");
        return;
      }
      queryParams.single_date = singleDate;
    }

    if (filters.includes("month_year")) {
      queryParams.month = selectedMonth.toString();
      queryParams.year = selectedYear.toString();
    }

    if (filters.includes("aging_buckets")) {
      queryParams.aging = selectedAging;
      if (selectedAging === "Custom") {
        if (!fromDate || !toDate) {
          setValidationError("Please specify date range for Custom aging.");
          return;
        }
        if (new Date(fromDate) > new Date(toDate)) {
          setValidationError("From Date cannot be greater than To Date.");
          return;
        }
        queryParams.from_date = fromDate;
        queryParams.to_date = toDate;
      }
    }

    if (filters.includes("doctor_ids")) {
      if (selectedDoctorIds.length === 0) {
        setValidationError("Please select at least one doctor.");
        return;
      }
      queryParams.doctor_ids = selectedDoctorIds.join(",");
    }

    if (filters.includes("doctor_id") && selectedDoctorId) {
      queryParams.doctor_id = selectedDoctorId;
    }

    if (filters.includes("test_ids")) {
      if (selectedTestIds.length === 0) {
        setValidationError("Please select at least one test.");
        return;
      }
      queryParams.test_ids = selectedTestIds.join(",");
    }

    if (filters.includes("collection_boy_id") && selectedCollectionBoyId) {
      queryParams.collection_boy_id = selectedCollectionBoyId;
    }

    // Build URL query string and open in new tab
    const searchParams = new URLSearchParams({
      report_id: activeReportId,
      lab_id: labId,
      ...queryParams
    });

    window.open(`/informative-reports/preview?${searchParams.toString()}`, "_blank");
  };

  // Helper icons for report cards
  const getReportIcon = (id: string) => {
    switch (id) {
      case "patients_by_doctor":
        return <Stethoscope className="text-teal-500" size={18} />;
      case "consolidated_patient":
        return <Users className="text-indigo-500" size={18} />;
      case "test_wise_patient":
        return <Beaker className="text-pink-500" size={18} />;
      case "doctor_referral_summary":
        return <TrendingUp className="text-cyan-500" size={18} />;
      case "collection_boy_performance":
        return <Briefcase className="text-amber-500" size={18} />;
      case "pending_payment":
        return <Clock className="text-red-500" size={18} />;
      case "concession":
        return <DollarSign className="text-violet-500" size={18} />;
      case "daily_business_summary":
        return <Activity className="text-emerald-500" size={18} />;
      case "monthly_lab_summary":
        return <FileText className="text-blue-500" size={18} />;
      default:
        return <FileText className="text-slate-500" size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400 bg-white/70 border border-slate-200/80 rounded-2xl shadow-sm">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        <span className="ml-3 font-semibold text-xs text-slate-500">Loading reports list...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left panel: Report selection cards */}
      <div className="lg:col-span-5 space-y-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4.5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3.5">
            Select Report Template
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {reports.map((report) => {
              const isActive = activeReportId === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => {
                    setActiveReportId(report.id);
                    setValidationError("");
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                    isActive
                      ? "border-teal-500 bg-teal-50/40 shadow-sm"
                      : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg border flex-shrink-0 ${
                    isActive ? "bg-teal-50 border-teal-100" : "bg-slate-50 border-slate-100"
                  }`}>
                    {getReportIcon(report.id)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 truncate leading-tight">
                      {report.name}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 leading-normal line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel: Filter Form configuration */}
      <div className="lg:col-span-7">
        {activeReport ? (
          <form
            onSubmit={handleGenerateReport}
            className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6"
          >
            <div>
              <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">
                Parameters Setup
              </span>
              <h2 className="text-sm font-black text-slate-800 mt-1 leading-tight">
                {activeReport.name}
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-1.5 leading-normal">
                {activeReport.description}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">
              {/* DATE RANGE FILTER */}
              {activeReport.filters.includes("date_range") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                      From Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                      To Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SINGLE DATE FILTER */}
              {activeReport.filters.includes("single_date") && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Select Date
                  </label>
                  <div className="relative max-w-xs">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* MONTH YEAR FILTER */}
              {activeReport.filters.includes("month_year") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2000, i, 1).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none bg-white"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const yr = new Date().getFullYear() - 2 + i;
                        return <option key={yr} value={yr}>{yr}</option>;
                      })}
                    </select>
                  </div>
                </div>
              )}

              {/* AGING BUCKETS FILTER */}
              {activeReport.filters.includes("aging_buckets") && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                      Aging Balance Filter
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {["Current", "30 Days", "60 Days", "90 Days", "Custom"].map((bucket) => {
                        const isSelected = selectedAging === bucket;
                        return (
                          <button
                            key={bucket}
                            type="button"
                            onClick={() => setSelectedAging(bucket)}
                            className={`px-3 py-2 text-xs font-bold rounded-lg border cursor-pointer text-center ${
                              isSelected
                                ? "bg-teal-50 border-teal-500 text-teal-600"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-55"
                            }`}
                          >
                            {bucket}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedAging === "Custom" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                          From Date
                        </label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                          To Date
                        </label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SINGLE DOCTOR FILTER */}
              {activeReport.filters.includes("doctor_id") && !activeReport.filters.includes("doctor_ids") && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Select Doctor (Optional)
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none bg-white"
                  >
                    <option value="">All Referred Doctors</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.doctor_name} ({doc.hospital_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* MULTI SELECT DOCTORS FILTER */}
              {activeReport.filters.includes("doctor_ids") && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Select Referred Doctors ({selectedDoctorIds.length} chosen)
                  </label>
                  <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-2 bg-slate-50/50 space-y-1">
                    {doctors.map((doc) => {
                      const isChecked = selectedDoctorIds.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDoctorSelection(doc.id)}
                            className="rounded border-slate-200 text-teal-600 focus:ring-teal-500"
                          />
                          <div className="truncate">
                            <span className="font-extrabold text-slate-800">{doc.doctor_name}</span>
                            <span className="text-[10px] text-slate-400 font-bold block leading-none">{doc.hospital_name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MULTI SELECT TESTS FILTER */}
              {activeReport.filters.includes("test_ids") && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Select Tests ({selectedTestIds.length} chosen)
                  </label>
                  <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-2 bg-slate-50/50 space-y-1">
                    {tests.map((test) => {
                      const isChecked = selectedTestIds.includes(test.id);
                      return (
                        <label
                          key={test.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTestSelection(test.id)}
                            className="rounded border-slate-200 text-teal-600 focus:ring-teal-500"
                          />
                          <div className="truncate">
                            <span className="font-extrabold text-slate-800">{test.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold block leading-none">Code: {test.code} | Price: ₹{test.price}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COLLECTION BOY FILTER */}
              {activeReport.filters.includes("collection_boy_id") && (
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Select Collection Boy (Optional)
                  </label>
                  <select
                    value={selectedCollectionBoyId}
                    onChange={(e) => setSelectedCollectionBoyId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none bg-white"
                  >
                    <option value="">All Collection Boys</option>
                    {collectionBoys.map((boy) => (
                      <option key={boy.id} value={boy.id}>
                        {boy.name} ({boy.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Error Message */}
            {validationError && (
              <div className="flex items-center gap-2 p-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle size={14} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="border-t border-slate-100 pt-5 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-500/10 px-5 py-3 text-xs font-black text-white transition-all cursor-pointer shadow-sm hover:scale-[1.01]"
              >
                <Play size={12} fill="white" />
                <span>Generate Report Preview</span>
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
