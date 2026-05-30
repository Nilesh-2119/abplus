"use client";

import { useEffect, useState } from "react";
import { apiService, PathologyTest, TestParameter } from "@/services/api";
import {
  Beaker,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Settings,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TestProps {
  labId: string;
  currentRole: string;
}

export default function TestManagement({ labId, currentRole }: TestProps) {
  const [tests, setTests] = useState<PathologyTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Test details/editing modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<PathologyTest | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editParams, setEditParams] = useState<TestParameter[]>([]);

  // Custom Test Creator state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newPrice, setNewPrice] = useState("");
  const [newTubeType, setNewTubeType] = useState("EDTA");
  const [newTubeColor, setNewTubeColor] = useState("Purple");
  
  // Custom Parameters list for Creator
  const [parameters, setParameters] = useState<Omit<TestParameter, "id">[]>([
    { name: "Parameter 1", unit: "mg/dL", min_val: 70, max_val: 110 }
  ]);

  const [saving, setSaving] = useState(false);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await apiService.getTests(labId);
      setTests(data);
      setErrorMsg("");
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to retrieve pathology catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [labId]);

  const handleToggleTest = async (test: PathologyTest) => {
    // Only Admin can override catalog status
    if (currentRole !== "LAB_ADMIN") {
      setErrorMsg("Permission Denied: Only Admin can toggle catalog items.");
      return;
    }

    try {
      await apiService.toggleTestStatus(labId, test.id, !test.is_enabled);
      fetchTests();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to modify catalog state.");
    }
  };

  const handleOpenEdit = (test: PathologyTest) => {
    setActiveTest(test);
    setEditPrice(test.price.toString());
    setEditParams(test.parameters.map((p) => ({ ...p })));
    setEditModalOpen(true);
  };

  const handleEditParamChange = (idx: number, field: keyof TestParameter, value: any) => {
    const updated = [...editParams];
    updated[idx] = {
      ...updated[idx],
      [field]: field === "min_val" || field === "max_val" ? Number(value) : value
    };
    setEditParams(updated);
  };

  const handleAddEditParamRow = () => {
    setEditParams([
      ...editParams,
      {
        id: `PARAM-NEW-${Math.random().toString(36).substr(2, 9)}`,
        name: `Parameter ${editParams.length + 1}`,
        unit: "mg/dL",
        min_val: 0,
        max_val: 10
      }
    ]);
  };

  const handleRemoveEditParamRow = (idx: number) => {
    if (editParams.length === 1) return;
    setEditParams(editParams.filter((_, i) => i !== idx));
  };

  const handleUpdateTestDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest || !editPrice) return;

    setSaving(true);
    try {
      await apiService.updateTest(labId, activeTest.id, {
        price: Number(editPrice),
        parameters: editParams
      });
      setEditModalOpen(false);
      fetchTests();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to update test details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (currentRole !== "LAB_ADMIN") {
      setErrorMsg("Permission Denied: Only Admin can delete catalog tests.");
      return;
    }

    if (!confirm("Are you sure you want to delete this test from the catalog?")) return;

    try {
      await apiService.deleteTest(labId, testId);
      fetchTests();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to remove test item.");
    }
  };

  const handleAddParamRow = () => {
    setParameters([
      ...parameters,
      { name: `Parameter ${parameters.length + 1}`, unit: "g/dL", min_val: 0, max_val: 10 }
    ]);
  };

  const handleRemoveParamRow = (idx: number) => {
    if (parameters.length === 1) return;
    setParameters(parameters.filter((_, i) => i !== idx));
  };

  const handleParamChange = (idx: number, field: keyof Omit<TestParameter, "id">, value: any) => {
    const updated = [...parameters];
    updated[idx] = {
      ...updated[idx],
      [field]: field === "min_val" || field === "max_val" ? Number(value) : value
    };
    setParameters(updated);
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode || !newPrice) {
      setErrorMsg("Please fill out name, code, and price.");
      return;
    }

    setSaving(true);
    try {
      // Format parameter definitions
      const testParameters: TestParameter[] = parameters.map((p, index) => ({
        id: `PARAM-${Math.floor(100 + Math.random() * 900)}-${index}`,
        name: p.name,
        unit: p.unit,
        min_val: Number(p.min_val),
        max_val: Number(p.max_val)
      }));

      await apiService.createCustomTest(labId, {
        name: newName,
        code: newCode,
        category: newCategory,
        price: Number(newPrice),
        tube_type: newTubeType,
        tube_color: newTubeColor,
        parameters: testParameters
      });

      // Reset
      setNewName("");
      setNewCode("");
      setNewCategory("General");
      setNewPrice("");
      setNewTubeType("EDTA");
      setNewTubeColor("Purple");
      setParameters([{ name: "Parameter 1", unit: "mg/dL", min_val: 70, max_val: 110 }]);
      setCreateModalOpen(false);

      fetchTests();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to create custom test profile.");
    } finally {
      setSaving(false);
    }
  };

  // Get dynamic sorted list of categories
  const categories = [
    "all",
    ...Array.from(new Set(tests.map((t) => t.category))).filter(Boolean).sort()
  ];

  // Filter tests based on category and search query
  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === "all" ||
      test.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const paginatedTests = filteredTests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const getTubeColorClass = (color: string) => {
    switch (color.toLowerCase()) {
      case "purple":
        return "bg-purple-500 border border-purple-600/30";
      case "red":
        return "bg-red-500 border border-red-600/30";
      case "grey":
      case "gray":
        return "bg-gray-400 border border-gray-500/30";
      case "blue":
        return "bg-blue-500 border border-blue-600/30";
      case "green":
        return "bg-green-500 border border-green-600/30";
      case "yellow":
        return "bg-yellow-400 border border-yellow-500/30";
      default:
        return "bg-slate-400 border border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Toolbar Action Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 border border-slate-200/80 p-5 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <h2 className="font-syne text-lg font-extrabold text-slate-800">Diagnostic Test Catalog</h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wide">
            Manage test profiles, pricing adjustments, and parameter range specifications
          </p>
        </div>
        {currentRole === "LAB_ADMIN" && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4.5 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Custom Test</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-2 p-4 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Search and Filters Panel ── */}
      <div className="flex flex-col gap-4 bg-white/70 border border-slate-200/80 p-4 rounded-2xl backdrop-blur-md shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search pathology tests by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold bg-white/50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 text-slate-700 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Dynamic Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer capitalize ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/10"
                  : "bg-white/80 border border-slate-200/60 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {cat === "all" ? "All Pathology Tests" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Test List Table Directory ── */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-400">
          <RefreshCw size={22} className="animate-spin text-cyan-500" />
          <span className="ml-3 font-semibold text-sm">Retrieving pathology test profiles...</span>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/70 border border-slate-200/80 rounded-2xl backdrop-blur-md shadow-sm text-center">
          <AlertCircle size={36} className="text-slate-400 mb-3" />
          <h3 className="text-sm font-black text-slate-700">No Tests Found</h3>
          <p className="text-xs text-slate-400 font-bold mt-1 max-w-sm">
            We couldn't find any pathology tests matching your search query or selected category filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Test Name & Code</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Category</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Vial / Tube</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Price</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTests.map((test) => (
                <tr
                  key={test.id}
                  className={`hover:bg-slate-50/40 transition-colors ${
                    test.is_enabled ? "" : "opacity-60 bg-slate-50/10"
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-500 shadow-sm flex-shrink-0">
                        <Beaker size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-800">{test.name}</span>
                          {test.is_custom && (
                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-400 font-mono mt-0.5 block">
                          {test.code}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                      {test.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full shadow-sm flex-shrink-0 ${getTubeColorClass(test.tube_color)}`}
                      />
                      <span className="text-sm font-bold text-slate-700">{test.tube_type}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-sm font-black text-slate-800">₹{test.price}</span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleTest(test)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        test.is_enabled
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/60"
                          : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {test.is_enabled ? (
                        <>
                          <CheckCircle size={12} />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(test)}
                        className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors cursor-pointer"
                        title={
                          currentRole === "LAB_ADMIN" || currentRole === "TECHNICIAN"
                            ? "Edit test price & parameters"
                            : "View test details & parameters"
                        }
                      >
                        {currentRole === "LAB_ADMIN" || currentRole === "TECHNICIAN" ? (
                          <Edit2 size={13} />
                        ) : (
                          <Eye size={13} />
                        )}
                      </button>
                      {test.is_custom && (
                        <button
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete custom test profile"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Pagination Controls Footer ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/80 bg-slate-50/50">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Showing {filteredTests.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(filteredTests.length, currentPage * itemsPerPage)} of {filteredTests.length} tests
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Numbered Page Selector */}
                {getPageNumbers().map((p, idx) => {
                  if (p === "...") {
                     return (
                       <span key={`dots-${idx}`} className="px-3 py-1.5 text-sm font-bold text-slate-400 select-none">
                         ...
                       </span>
                     );
                  }
                  return (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => setCurrentPage(p as number)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/10"
                          : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Update Test & Parameters ── */}
      <AnimatePresence>
        {editModalOpen && activeTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <h3 className="font-syne text-sm font-extrabold text-slate-800">
                  {currentRole === "LAB_ADMIN" || currentRole === "TECHNICIAN"
                    ? "Edit Pathology Test Settings"
                    : "View Pathology Test Details"}
                </h3>
                <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateTestDetails} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Test Name
                    </label>
                    <p className="text-sm font-bold text-slate-800 mt-1">{activeTest.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Category
                    </label>
                    <p className="text-sm font-bold text-slate-800 mt-1">{activeTest.category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Vial Cap / Tube Type
                    </label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`h-3 w-3 rounded-full ${getTubeColorClass(activeTest.tube_color)}`} />
                      <p className="text-sm font-bold text-slate-800">{activeTest.tube_type} ({activeTest.tube_color} Cap)</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Lab Billing Price (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      placeholder="Pricing"
                      disabled={currentRole !== "LAB_ADMIN" && currentRole !== "TECHNICIAN"}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Edit Parameter reference range override fields */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Reference Parameter Limits ({editParams.length})
                    </label>
                    {(currentRole === "LAB_ADMIN" || currentRole === "TECHNICIAN") && (
                      <button
                        type="button"
                        onClick={handleAddEditParamRow}
                        className="flex items-center gap-1 text-xs font-black text-cyan-600 bg-cyan-50 px-2.5 py-1.5 rounded-lg border border-cyan-100/50 hover:bg-cyan-100 transition-colors cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add Parameter</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {editParams.map((param, index) => {
                      const isEditable = currentRole === "LAB_ADMIN" || currentRole === "TECHNICIAN";
                      if (isEditable) {
                        return (
                          <div
                            key={param.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 relative"
                          >
                            {/* Parameter Name */}
                            <div className="flex-1 w-full">
                              <input
                                type="text"
                                required
                                placeholder="Parameter Name"
                                value={param.name}
                                onChange={(e) => handleEditParamChange(index, "name", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-700 focus:outline-none bg-white"
                              />
                            </div>

                            {/* Parameter Unit */}
                            <div className="w-20">
                              <input
                                type="text"
                                required
                                placeholder="Unit"
                                value={param.unit}
                                onChange={(e) => handleEditParamChange(index, "unit", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-700 focus:outline-none bg-white"
                              />
                            </div>

                            {/* Min/Max Limits */}
                            <div className="flex items-center gap-1.5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-0.5">Min</span>
                                <input
                                  type="number"
                                  required
                                  step="any"
                                  placeholder="Min"
                                  value={param.min_val}
                                  onChange={(e) => handleEditParamChange(index, "min_val", e.target.value)}
                                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none bg-white text-center"
                                />
                              </div>
                              <span className="text-slate-400 font-bold mt-3">-</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-0.5">Max</span>
                                <input
                                  type="number"
                                  required
                                  step="any"
                                  placeholder="Max"
                                  value={param.max_val}
                                  onChange={(e) => handleEditParamChange(index, "max_val", e.target.value)}
                                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none bg-white text-center"
                                />
                              </div>
                            </div>

                            {/* Delete Row Button */}
                            <button
                              type="button"
                              disabled={editParams.length === 1}
                              onClick={() => handleRemoveEditParamRow(index)}
                              className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 transition-colors cursor-pointer mt-3 sm:mt-0"
                              title="Delete Parameter"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={param.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">{param.name}</p>
                              <p className="text-xs text-slate-400 font-bold mt-0.5">Unit: {param.unit}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-0.5">Min Val</span>
                                <span className="w-20 rounded-lg border border-slate-200 bg-white/50 px-2 py-1 text-sm font-bold text-slate-500 text-center block">
                                  {param.min_val}
                                </span>
                              </div>
                              <span className="text-slate-400 font-bold">-</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-0.5">Max Val</span>
                                <span className="w-20 rounded-lg border border-slate-200 bg-white/50 px-2 py-1 text-sm font-bold text-slate-500 text-center block">
                                  {param.max_val}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>

                {(currentRole === "LAB_ADMIN" || currentRole === "TECHNICIAN") && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg transition-all cursor-pointer mt-4"
                  >
                    {saving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <span>Save Catalog Modifications</span>
                    )}
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Custom Test Creator ── */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-10 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <h3 className="font-syne text-sm font-extrabold text-slate-800">
                  Configure Custom Pathology Test
                </h3>
                <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Test Profile Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vitamin D3 (Cholecalciferol)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Code identifier
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VITD"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    >
                      <option value="General">General</option>
                      <option value="Hematology">Hematology</option>
                      <option value="Diabetes">Diabetes</option>
                      <option value="Profiles">Profiles</option>
                      <option value="Hormones">Hormones</option>
                      <option value="Liver">Liver</option>
                      <option value="Kidney">Kidney</option>
                      <option value="Infection">Infection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      placeholder="e.g. 1200"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Vial/Tube Type
                    </label>
                    <select
                      value={newTubeType}
                      onChange={(e) => setNewTubeType(e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    >
                      <option value="EDTA">EDTA (Hematology)</option>
                      <option value="Plain">Plain (Serum)</option>
                      <option value="Fluoride">Fluoride (Glucose)</option>
                      <option value="Citrate">Sodium Citrate</option>
                      <option value="Heparin">Sodium Heparin</option>
                      <option value="SST">Serum Separator Tube</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wide">
                      Tube Cap Color
                    </label>
                    <select
                      value={newTubeColor}
                      onChange={(e) => setNewTubeColor(e.target.value)}
                      className="w-full mt-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
                    >
                      <option value="Purple">Purple Cap</option>
                      <option value="Red">Red Cap</option>
                      <option value="Grey">Grey Cap</option>
                      <option value="Blue">Blue Cap</option>
                      <option value="Green">Green Cap</option>
                      <option value="Yellow">Yellow Cap</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Parameters block creator */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      Reference Parameter Specs
                    </span>
                    <button
                      type="button"
                      onClick={handleAddParamRow}
                      className="flex items-center gap-1 text-xs font-black text-cyan-600 bg-cyan-50 px-2.5 py-1.5 rounded-lg border border-cyan-100/50 hover:bg-cyan-100 transition-colors"
                    >
                      <Plus size={12} />
                      <span>Add Parameter Row</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {parameters.map((param, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 relative"
                      >
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            required
                            placeholder="Parameter Name"
                            value={param.name}
                            onChange={(e) => handleParamChange(index, "name", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-700 focus:outline-none bg-white"
                          />
                        </div>

                        <div className="w-20">
                          <input
                            type="text"
                            required
                            placeholder="Unit (e.g. mg/dL)"
                            value={param.unit}
                            onChange={(e) => handleParamChange(index, "unit", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-bold text-slate-700 focus:outline-none bg-white"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            required
                            step="any"
                            placeholder="Min"
                            value={param.min_val || ""}
                            onChange={(e) => handleParamChange(index, "min_val", e.target.value)}
                            className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-bold text-slate-700 focus:outline-none bg-white text-center"
                          />
                          <span className="text-sm text-slate-400 font-bold">-</span>
                          <input
                            type="number"
                            required
                            step="any"
                            placeholder="Max"
                            value={param.max_val || ""}
                            onChange={(e) => handleParamChange(index, "max_val", e.target.value)}
                            className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-bold text-slate-700 focus:outline-none bg-white text-center"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={parameters.length === 1}
                          onClick={() => handleRemoveParamRow(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-500/10 hover:shadow-lg transition-all cursor-pointer mt-4"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <span>Register Custom Test Catalog</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
