/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-vars */
// AB+ Pathology Lab Management SaaS API Service
// This service simulates DRF backend responses with mock database state in localStorage.
// Switch IS_MOCK to false and configure API_URL to hook up to a real Django backend.


export const IS_MOCK = false;

// Robustly formatting the API URL to ensure it has the correct prefix and no trailing slash
const getSanitizedApiUrl = (): string => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  url = url.trim().replace(/\/+$/, ""); // Trim whitespace and trailing slashes
  if (!url.endsWith("/api")) {
    url = url + "/api";
  }
  return url;
};

export const API_URL = getSanitizedApiUrl();

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function setCookie(name: string, value: string, days?: number): void {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure";
}

export function eraseCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = name + "=; Max-Age=-99999999; path=/; SameSite=Lax; Secure";
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = getCookie("abplus_access_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    const refresh = getCookie("abplus_refresh_token");
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API_URL}/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setCookie("abplus_access_token", refreshData.access, 1);
          headers.set("Authorization", `Bearer ${refreshData.access}`);
          return fetch(url, { ...options, headers });
        } else {
          eraseCookie("abplus_access_token");
          eraseCookie("abplus_refresh_token");
        }
      } catch (e) {
        console.error("Failed to refresh token:", e);
      }
    }
  }
  return response;
}

export interface Lab {
  id: string;
  name: string;
  status: "active" | "suspended";
  address: string;
  phone: string;
  created_at: string;
  admin_name: string;
  admin_email: string;
  admin_username?: string;
  users_count: number;
  patient_count: number;
  lab_code?: string;
}

export interface DashboardStats {
  total_labs: number;
  active_labs: number;
  inactive_labs: number; // Suspended
  total_users: number;
  total_patient_entries: number;
  labs_trend: string;
  users_trend: string;
  patients_trend: string;
}

export interface LabDashboardStats {
  today_patients: number;
  pending_reports: number;
  completed_reports: number;
  total_revenue: number;
  pending_balance: number;
  daily_expenses: number;
  net_revenue: number;
  cashier_mode?: boolean;
  net_cash_received?: number;
  samples_received?: number;
  pending_boys_count?: number;
  total_pending_receivables?: number;
  overdue_balances?: number;
  partially_paid_patients?: number;
  lab_cash_collection_pending?: number;
  cashier_pending?: number;
  total_submitted_today?: number;
  cash_in_vault?: number;
  cash_submitted_today?: number;
  previous_cash_pending?: number;
  cash_not_submitted_to_admin?: number;
  // New Lab Admin vault metrics
  cash_available_in_vault?: number;
  received_from_cashier_today?: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user_email: string;
  lab_name?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone_number?: string;
  role: "SUPER_ADMIN" | "LAB_ADMIN" | "TECHNICIAN" | "CASHIER" | "COLLECTION_BOY";
  lab_name: string;
  labId?: string;
  lab_id?: string;
  lab_code?: string;
  status: "active" | "inactive";
  created_at: string;
  password?: string;
  requires_password_change?: boolean;
}

export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  min_val: number;
  max_val: number;
}

export interface PathologyTest {
  id: string;
  labId?: string;
  masterTestId?: string;
  name: string;
  category: string;
  code: string;
  price: number;
  tube_type: string;
  tube_color: string;
  is_enabled: boolean;
  parameters: TestParameter[];
  is_custom?: boolean;
  commission_percentage?: number;
}

export interface MasterTestParameter {
  id: string;
  name: string;
  unit: string;
  min_val: number;
  max_val: number;
}

export interface MasterTest {
  id: string;
  name: string;
  category: string;
  code: string;
  default_price: number;
  tube_type: string;
  tube_color: string;
  is_active: boolean;
  parameters: MasterTestParameter[];
  commission_percentage?: number;
}

export interface PaymentTransaction {
  id: string;
  amount_received: number;
  concession_amount: number;
  payment_date: string;
  received_by_user?: string | null;
  received_by_name?: string;
  payment_mode: "CASH" | "CARD" | "UPI" | "CREDIT";
  notes?: string;
}

export interface DoctorCommissionEntry {
  id: string;
  labId: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  doctorId: string;
  doctorName?: string;
  hospitalName?: string;
  testId: string;
  testName: string;
  testPrice: number;
  commission_percentage: number;
  commission_amount: number;
  entry_date: string;
  is_paid: boolean;
  created_at: string;
}

export interface PatientEntry {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  status: "CREATED" | "COLLECTED" | "LAB_RECEIVED" | "COMPLETED" | "DELIVERED";
  payment_status?: "FULLY_PAID" | "PARTIAL_PENDING" | "FULL_CONCESSION" | "CREDIT_PENDING";
  pending_balance?: number;
  tests: PathologyTest[];
  results: Record<string, number>; // parameter.id -> entered value
  collected_by?: string;
  referred_doctor_id?: string;
  referred_doctor_name?: string;
  total_bill: number;
  paid_amount: number;
  concession?: number;
  created_at: string; // YYYY-MM-DD
  labId?: string;
  transactions?: PaymentTransaction[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  created_by?: string;
  labId?: string;
  submitted_to_lab_admin?: "Y" | "N";
}

export interface DailyCloseout {
  id?: string;
  lab_id?: string;
  cashier_id?: string;
  cashier_name?: string;
  date: string;
  total_settlements: number;
  total_expenses: number;
  net_revenue: number;
  notes: string;
  submitted_at?: string;
}

export interface CashierLabSettlement {
  id?: string;
  lab_id?: string;
  cashier_user_id?: string;
  cashier_name?: string;
  settlement_amount: number;
  expenses_amount: number;
  remarks?: string;
  submitted_at?: string;
}

export interface ReferredDoctor {
  id: string;
  doctor_name: string;
  hospital_name: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive";
  created_at: string;
  labId?: string;
}

export interface LabSettings {
  name: string;
  address: string;
  phone: string;
  logo_base64?: string;
  letterhead_base64?: string;
}

// Helper to simulate network latency
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Retrieve mock data from localStorage
const getMockState = (): {
  labs: Lab[];
  logs: ActivityLog[];
  users: User[];
  tests: PathologyTest[];
  masterTests: MasterTest[];
  patients: PatientEntry[];
  expenses: Expense[];
  referredDoctors: ReferredDoctor[];
  settings: Record<string, LabSettings>;
  commissionEntries: DoctorCommissionEntry[];
} => {
  if (typeof window === "undefined") {
    return { labs: [], logs: [], users: [], tests: [], masterTests: [], patients: [], expenses: [], referredDoctors: [], settings: {}, commissionEntries: [] };
  }

  let labsRaw = localStorage.getItem("abplus_mock_labs");
  let logsRaw = localStorage.getItem("abplus_mock_logs");
  let usersRaw = localStorage.getItem("abplus_mock_users");
  let testsRaw = localStorage.getItem("abplus_mock_tests");
  let masterTestsRaw = localStorage.getItem("abplus_mock_master_tests");
  let patientsRaw = localStorage.getItem("abplus_mock_patients");
  let expensesRaw = localStorage.getItem("abplus_mock_expenses");
  let referredDoctorsRaw = localStorage.getItem("abplus_mock_referred_doctors");
  let settingsRaw = localStorage.getItem("abplus_mock_settings");
  let commissionEntriesRaw = localStorage.getItem("abplus_mock_commission_entries");

  // Clear outdated mock state if seeded test catalog size is less than 50
  if (masterTestsRaw) {
    try {
      const parsed = JSON.parse(masterTestsRaw);
      if (Array.isArray(parsed) && parsed.length < 50) {
        localStorage.removeItem("abplus_mock_master_tests");
        localStorage.removeItem("abplus_mock_tests");
        localStorage.removeItem("abplus_mock_patients");
        masterTestsRaw = null;
        testsRaw = null;
        patientsRaw = null;
      }
    } catch (e) {
      // ignore
    }
  }

  // Clear legacy mock dummy patients and expenses to allow real flow testing
  if (typeof window !== "undefined" && !localStorage.getItem("abplus_mock_db_clean_v7")) {
    localStorage.removeItem("abplus_mock_patients");
    localStorage.removeItem("abplus_mock_expenses");
    localStorage.removeItem("abplus_mock_logs");
    localStorage.removeItem("abplus_mock_labs");
    localStorage.removeItem("abplus_mock_users");
    localStorage.removeItem("abplus_mock_tests");
    localStorage.removeItem("abplus_mock_master_tests");
    localStorage.removeItem("abplus_mock_settings");
    localStorage.setItem("abplus_mock_db_clean_v7", "true");
    patientsRaw = null;
    expensesRaw = null;
    logsRaw = null;
    labsRaw = null;
    usersRaw = null;
    testsRaw = null;
    masterTestsRaw = null;
    referredDoctorsRaw = null;
    settingsRaw = null;
  }

  // Initial Seed for Labs, Users, Logs
  const initialLabs: Lab[] = [];

  const initialUsers: User[] = [
    {
      id: "USR-SA",
      name: "AB+ Super Admin",
      username: "superadmin",
      email: "superadmin@abplus.in",
      role: "SUPER_ADMIN",
      lab_name: "System",
      status: "active",
      created_at: "2026-01-15T10:30:00Z",
    }
  ];

  const initialLogs: ActivityLog[] = [
    {
      id: "LOG-01",
      action: "System Initialized - Ready for Tenant Onboarding",
      timestamp: "2026-01-15T10:30:00Z",
      user_email: "superadmin@abplus.in",
      lab_name: "System",
    }
  ];

  // Initial Master Test Library Presets
  const initialMasterTests: MasterTest[] = [
      {
          id: "MTEST-CBC",
          name: "Complete Hemogram / CBC",
          category: "Hematology",
          code: "CBC",
          default_price: 350.0,
          tube_type: "EDTA",
          tube_color: "Purple",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-HEMO",
                  name: "Hemoglobin",
                  unit: "g/dL",
                  min_val: 12.0,
                  max_val: 17.0
              },
              {
                  id: "MPARAM-WBC",
                  name: "WBC Count",
                  unit: "cells/mcL",
                  min_val: 4000.0,
                  max_val: 11000.0
              },
              {
                  id: "MPARAM-PLATE",
                  name: "Platelet Count",
                  unit: "lakhs/mcL",
                  min_val: 1.5,
                  max_val: 4.5
              },
              {
                  id: "MPARAM-RBCCOU",
                  name: "RBC Count",
                  unit: "million/mcL",
                  min_val: 4.5,
                  max_val: 5.9
              },
              {
                  id: "MPARAM-PCVHEM",
                  name: "PCV (Hematocrit)",
                  unit: "%",
                  min_val: 36.0,
                  max_val: 50.0
              },
              {
                  id: "MPARAM-MCV",
                  name: "MCV",
                  unit: "fL",
                  min_val: 80.0,
                  max_val: 100.0
              },
              {
                  id: "MPARAM-MCH",
                  name: "MCH",
                  unit: "pg",
                  min_val: 27.0,
                  max_val: 32.0
              },
              {
                  id: "MPARAM-MCHC",
                  name: "MCHC",
                  unit: "g/dL",
                  min_val: 32.0,
                  max_val: 36.0
              }
          ]
      },
      {
          id: "MTEST-PSMP",
          name: "PS for MP",
          category: "Hematology",
          code: "PSMP",
          default_price: 150.0,
          tube_type: "Slide",
          tube_color: "Purple",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-MALARI",
                  name: "Malaria Parasite",
                  unit: "Presence",
                  min_val: 0.0,
                  max_val: 0.0
              }
          ]
      },
      {
          id: "MTEST-WIDAL",
          name: "Widal Test",
          category: "Hematology",
          code: "WIDAL",
          default_price: 250.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-SALMON",
                  name: "Salmonella Typhi O",
                  unit: "Titre",
                  min_val: 0.0,
                  max_val: 80.0
              },
              {
                  id: "MPARAM-SALMON",
                  name: "Salmonella Typhi H",
                  unit: "Titre",
                  min_val: 0.0,
                  max_val: 80.0
              },
              {
                  id: "MPARAM-SALMON",
                  name: "Salmonella Typhi AH",
                  unit: "Titre",
                  min_val: 0.0,
                  max_val: 80.0
              },
              {
                  id: "MPARAM-SALMON",
                  name: "Salmonella Typhi BH",
                  unit: "Titre",
                  min_val: 0.0,
                  max_val: 80.0
              }
          ]
      },
      {
          id: "MTEST-BG",
          name: "Blood Group",
          category: "Hematology",
          code: "BG",
          default_price: 150.0,
          tube_type: "EDTA",
          tube_color: "Purple",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-ABOGRO",
                  name: "ABO Grouping",
                  unit: "Text",
                  min_val: 0.0,
                  max_val: 0.0
              },
              {
                  id: "MPARAM-RHFACT",
                  name: "Rh Factor",
                  unit: "Text",
                  min_val: 0.0,
                  max_val: 0.0
              }
          ]
      },
      {
          id: "MTEST-BTCT",
          name: "BT CT",
          category: "Hematology",
          code: "BTCT",
          default_price: 120.0,
          tube_type: "Capillary",
          tube_color: "N/A",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-BLEEDI",
                  name: "Bleeding Time",
                  unit: "mins",
                  min_val: 1.0,
                  max_val: 5.0
              },
              {
                  id: "MPARAM-CLOTTI",
                  name: "Clotting Time",
                  unit: "mins",
                  min_val: 3.0,
                  max_val: 9.0
              }
          ]
      },
      {
          id: "MTEST-PTINR",
          name: "PT INR / APTT",
          category: "Hematology",
          code: "PTINR",
          default_price: 450.0,
          tube_type: "Citrate",
          tube_color: "Blue",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-PROTHR",
                  name: "Prothrombin Time",
                  unit: "secs",
                  min_val: 11.0,
                  max_val: 15.0
              },
              {
                  id: "MPARAM-INR",
                  name: "INR",
                  unit: "Ratio",
                  min_val: 0.8,
                  max_val: 1.2
              },
              {
                  id: "MPARAM-APTT",
                  name: "APTT",
                  unit: "secs",
                  min_val: 25.0,
                  max_val: 35.0
              }
          ]
      },
      {
          id: "MTEST-ESR",
          name: "ESR",
          category: "Hematology",
          code: "ESR",
          default_price: 120.0,
          tube_type: "Citrate",
          tube_color: "Black",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-ESR",
                  name: "ESR",
                  unit: "mm/1st hr",
                  min_val: 0.0,
                  max_val: 15.0
              }
          ]
      },
      {
          id: "MTEST-MALAG",
          name: "Rapid Malaria Ag",
          category: "Hematology",
          code: "MALAG",
          default_price: 280.0,
          tube_type: "EDTA",
          tube_color: "Purple",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-P.FALC",
                  name: "P. falciparum Ag",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.9
              },
              {
                  id: "MPARAM-P.VIVA",
                  name: "P. vivax Ag",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.9
              }
          ]
      },
      {
          id: "MTEST-DENGUE",
          name: "Dengue NS1 / IgG / IgM",
          category: "Hematology",
          code: "DENGUE",
          default_price: 650.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-DENGUE",
                  name: "Dengue NS1 Ag",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.9
              },
              {
                  id: "MPARAM-DENGUE",
                  name: "Dengue IgG Ab",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.9
              },
              {
                  id: "MPARAM-DENGUE",
                  name: "Dengue IgM Ab",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.9
              }
          ]
      },
      {
          id: "MTEST-BSLR",
          name: "BSL (R)",
          category: "Diabetes",
          code: "BSLR",
          default_price: 80.0,
          tube_type: "Fluoride",
          tube_color: "Grey",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-RBG",
                  name: "Random Blood Glucose",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 140.0
              }
          ]
      },
      {
          id: "MTEST-BSLFPP",
          name: "Blood Sugar F/PP",
          category: "Diabetes",
          code: "BSL-FPP",
          default_price: 150.0,
          tube_type: "Fluoride",
          tube_color: "Grey",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-FASTING",
                  name: "Fasting Sugar",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 100.0
              },
              {
                  id: "MPARAM-POSTPR",
                  name: "Post-Prandial Sugar",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 140.0
              }
          ]
      },
      {
          id: "MTEST-HBA1C",
          name: "HbA1c",
          category: "Diabetes",
          code: "HBA1C",
          default_price: 300.0,
          tube_type: "EDTA",
          tube_color: "Purple",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-HBA1C",
                  name: "HbA1c (Glycated Hb)",
                  unit: "%",
                  min_val: 4.0,
                  max_val: 5.6
              },
              {
                  id: "MPARAM-GLUC",
                  name: "Avg Glucose",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 114.0
              }
          ]
      },
      {
          id: "MTEST-GTT",
          name: "GTT",
          category: "Diabetes",
          code: "GTT",
          default_price: 250.0,
          tube_type: "Fluoride",
          tube_color: "Grey",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-FASTIN",
                  name: "Fasting Glucose",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 100.0
              },
              {
                  id: "MPARAM-1HRGLU",
                  name: "1Hr Glucose",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 180.0
              },
              {
                  id: "MPARAM-2HRGLU",
                  name: "2Hr Glucose",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 140.0
              }
          ]
      },
      {
          id: "MTEST-BILIRUBIN",
          name: "Bilirubin",
          category: "Liver / Biochemistry",
          code: "BILI",
          default_price: 200.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-TOTALB",
                  name: "Total Bilirubin",
                  unit: "mg/dL",
                  min_val: 0.1,
                  max_val: 1.2
              },
              {
                  id: "MPARAM-DIRECT",
                  name: "Direct Bilirubin",
                  unit: "mg/dL",
                  min_val: 0.0,
                  max_val: 0.3
              },
              {
                  id: "MPARAM-INDIRE",
                  name: "Indirect Bilirubin",
                  unit: "mg/dL",
                  min_val: 0.1,
                  max_val: 1.0
              }
          ]
      },
      {
          id: "MTEST-UREA",
          name: "Urea",
          category: "Liver / Biochemistry",
          code: "UREA",
          default_price: 120.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-BLOODU",
                  name: "Blood Urea",
                  unit: "mg/dL",
                  min_val: 15.0,
                  max_val: 45.0
              }
          ]
      },
      {
          id: "MTEST-CREATININE",
          name: "Creatinine",
          category: "Liver / Biochemistry",
          code: "CREAT",
          default_price: 150.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-SERUMC",
                  name: "Serum Creatinine",
                  unit: "mg/dL",
                  min_val: 0.6,
                  max_val: 1.2
              }
          ]
      },
      {
          id: "MTEST-URICACID",
          name: "Uric Acid",
          category: "Liver / Biochemistry",
          code: "URIC",
          default_price: 150.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-URICAC",
                  name: "Uric Acid",
                  unit: "mg/dL",
                  min_val: 3.5,
                  max_val: 7.2
              }
          ]
      },
      {
          id: "MTEST-SGOT",
          name: "SGOT",
          category: "Liver / Biochemistry",
          code: "SGOT",
          default_price: 150.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-SGOTAS",
                  name: "SGOT / AST",
                  unit: "U/L",
                  min_val: 8.0,
                  max_val: 48.0
              }
          ]
      },
      {
          id: "MTEST-SGPT",
          name: "SGPT",
          category: "Liver / Biochemistry",
          code: "SGPT",
          default_price: 150.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-SGPTAL",
                  name: "SGPT / ALT",
                  unit: "U/L",
                  min_val: 7.0,
                  max_val: 56.0
              }
          ]
      },
      {
          id: "MTEST-ELECTROLYTES",
          name: "Sr. Electrolytes",
          category: "Liver / Biochemistry",
          code: "ELECT",
          default_price: 350.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-SODIUM",
                  name: "Sodium",
                  unit: "mmol/L",
                  min_val: 135.0,
                  max_val: 145.0
              },
              {
                  id: "MPARAM-POTASS",
                  name: "Potassium",
                  unit: "mmol/L",
                  min_val: 3.5,
                  max_val: 5.2
              },
              {
                  id: "MPARAM-CHLORI",
                  name: "Chloride",
                  unit: "mmol/L",
                  min_val: 96.0,
                  max_val: 106.0
              }
          ]
      },
      {
          id: "MTEST-AMYLASE",
          name: "Sr. Amylase",
          category: "Liver / Biochemistry",
          code: "AMY",
          default_price: 350.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-SERUMA",
                  name: "Serum Amylase",
                  unit: "U/L",
                  min_val: 25.0,
                  max_val: 125.0
              }
          ]
      },
      {
          id: "MTEST-LIPASE",
          name: "Sr. Lipase",
          category: "Liver / Biochemistry",
          code: "LIP",
          default_price: 400.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-SERUML",
                  name: "Serum Lipase",
                  unit: "U/L",
                  min_val: 10.0,
                  max_val: 140.0
              }
          ]
      },
      {
          id: "MTEST-PROTEINS",
          name: "Sr. Proteins",
          category: "Liver / Biochemistry",
          code: "PROT",
          default_price: 200.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-TOTALP",
                  name: "Total Protein",
                  unit: "g/dL",
                  min_val: 6.0,
                  max_val: 8.3
              },
              {
                  id: "MPARAM-ALBUMI",
                  name: "Albumin",
                  unit: "g/dL",
                  min_val: 3.5,
                  max_val: 5.0
              },
              {
                  id: "MPARAM-GLOBUL",
                  name: "Globulin",
                  unit: "g/dL",
                  min_val: 2.0,
                  max_val: 3.5
              }
          ]
      },
      {
          id: "MTEST-ALBUMIN",
          name: "Albumin",
          category: "Liver / Biochemistry",
          code: "ALB",
          default_price: 120.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-ALBUMI",
                  name: "Albumin",
                  unit: "g/dL",
                  min_val: 3.5,
                  max_val: 5.0
              }
          ]
      },
      {
          id: "MTEST-AGRATIO",
          name: "A/G Ratio",
          category: "Liver / Biochemistry",
          code: "AGR",
          default_price: 150.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-ALBUMI",
                  name: "Albumin Globulin Ratio",
                  unit: "Ratio",
                  min_val: 1.1,
                  max_val: 2.2
              }
          ]
      },
      {
          id: "MTEST-ALP",
          name: "Alkaline Phosphatase",
          category: "Liver / Biochemistry",
          code: "ALP",
          default_price: 180.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-ALP",
                  name: "ALP",
                  unit: "U/L",
                  min_val: 44.0,
                  max_val: 147.0
              }
          ]
      },
      {
          id: "MTEST-CALCIUM",
          name: "Calcium",
          category: "Liver / Biochemistry",
          code: "CA",
          default_price: 150.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-TOTALC",
                  name: "Total Calcium",
                  unit: "mg/dL",
                  min_val: 8.5,
                  max_val: 10.2
              }
          ]
      },
      {
          id: "MTEST-TSH",
          name: "TSH",
          category: "Hormones / Thyroid",
          code: "TSH",
          default_price: 250.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-TSH",
                  name: "TSH",
                  unit: "uIU/mL",
                  min_val: 0.4,
                  max_val: 4.5
              }
          ]
      },
      {
          id: "MTEST-AMH",
          name: "AMH",
          category: "Hormones / Thyroid",
          code: "AMH",
          default_price: 1800.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-AMH",
                  name: "AMH",
                  unit: "ng/mL",
                  min_val: 0.7,
                  max_val: 7.0
              }
          ]
      },
      {
          id: "MTEST-E2",
          name: "E2",
          category: "Hormones / Thyroid",
          code: "E2",
          default_price: 650.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-ESTRAD",
                  name: "Estradiol",
                  unit: "pg/mL",
                  min_val: 15.0,
                  max_val: 350.0
              }
          ]
      },
      {
          id: "MTEST-PROLACTIN",
          name: "Prolactine",
          category: "Hormones / Thyroid",
          code: "PRL",
          default_price: 450.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-PROLAC",
                  name: "Prolactin",
                  unit: "ng/mL",
                  min_val: 4.0,
                  max_val: 23.0
              }
          ]
      },
      {
          id: "MTEST-FSH",
          name: "FSH",
          category: "Hormones / Thyroid",
          code: "FSH",
          default_price: 450.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-FSH",
                  name: "FSH",
                  unit: "mIU/mL",
                  min_val: 1.5,
                  max_val: 12.4
              }
          ]
      },
      {
          id: "MTEST-LH",
          name: "LH",
          category: "Hormones / Thyroid",
          code: "LH",
          default_price: 450.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-LH",
                  name: "LH",
                  unit: "mIU/mL",
                  min_val: 1.7,
                  max_val: 8.6
              }
          ]
      },
      {
          id: "MTEST-HIV",
          name: "HIV",
          category: "Infection / Immunology",
          code: "HIV",
          default_price: 300.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-HIVI&I",
                  name: "HIV I & II Antibody",
                  unit: "Ratio",
                  min_val: 0.0,
                  max_val: 0.9
              }
          ]
      },
      {
          id: "MTEST-HBSAG",
          name: "HBSAg",
          category: "Infection / Immunology",
          code: "HBSAG",
          default_price: 250.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-HBSAGA",
                  name: "HBsAg Antigen",
                  unit: "Ratio",
                  min_val: 0.0,
                  max_val: 0.9
              }
          ]
      },
      {
          id: "MTEST-RA",
          name: "RA",
          category: "Infection / Immunology",
          code: "RA",
          default_price: 250.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-RHEUMA",
                  name: "Rheumatoid Factor",
                  unit: "IU/mL",
                  min_val: 0.0,
                  max_val: 14.0
              }
          ]
      },
      {
          id: "MTEST-ASO",
          name: "ASO",
          category: "Infection / Immunology",
          code: "ASO",
          default_price: 300.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-ASOTIT",
                  name: "ASO Titre",
                  unit: "IU/mL",
                  min_val: 0.0,
                  max_val: 200.0
              }
          ]
      },
      {
          id: "MTEST-CRP",
          name: "CRP",
          category: "Infection / Immunology",
          code: "CRP",
          default_price: 300.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-CREACT",
                  name: "C-Reactive Protein",
                  unit: "mg/L",
                  min_val: 0.0,
                  max_val: 6.0
              }
          ]
      },
      {
          id: "MTEST-URINE",
          name: "Urine Examination",
          category: "Urine / Stool / Fluid",
          code: "URINE",
          default_price: 150.0,
          tube_type: "Urine Container",
          tube_color: "Yellow",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-URINEP",
                  name: "Urine pH",
                  unit: "pH",
                  min_val: 4.5,
                  max_val: 8.0
              },
              {
                  id: "MPARAM-SPECGR",
                  name: "Spec Gravity",
                  unit: "gravity",
                  min_val: 1.005,
                  max_val: 1.03
              },
              {
                  id: "MPARAM-URINES",
                  name: "Urine Sugar",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.0
              },
              {
                  id: "MPARAM-URINEA",
                  name: "Urine Albumin",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.0
              },
              {
                  id: "MPARAM-PUSCEL",
                  name: "Pus Cells",
                  unit: "/HPF",
                  min_val: 0.0,
                  max_val: 5.0
              },
              {
                  id: "MPARAM-EPITHE",
                  name: "Epithelial Cells",
                  unit: "/HPF",
                  min_val: 0.0,
                  max_val: 5.0
              }
          ]
      },
      {
          id: "MTEST-STOOL",
          name: "Stool Examination",
          category: "Urine / Stool / Fluid",
          code: "STOOL",
          default_price: 150.0,
          tube_type: "Stool Container",
          tube_color: "Blue",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-STOOLC",
                  name: "Stool Consistency",
                  unit: "Text",
                  min_val: 0.0,
                  max_val: 0.0
              },
              {
                  id: "MPARAM-STOOLC",
                  name: "Stool Colour",
                  unit: "Text",
                  min_val: 0.0,
                  max_val: 0.0
              },
              {
                  id: "MPARAM-OVACYS",
                  name: "Ova/Cysts",
                  unit: "Presence",
                  min_val: 0.0,
                  max_val: 0.0
              }
          ]
      },
      {
          id: "MTEST-FLUID",
          name: "Fluid Examination",
          category: "Urine / Stool / Fluid",
          code: "FLUID",
          default_price: 500.0,
          tube_type: "Sterile Container",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-FLUIDP",
                  name: "Fluid Protein",
                  unit: "g/dL",
                  min_val: 1.0,
                  max_val: 3.0
              },
              {
                  id: "MPARAM-FLUIDG",
                  name: "Fluid Glucose",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 110.0
              },
              {
                  id: "MPARAM-TOTALC",
                  name: "Total Cells",
                  unit: "cells/cu.mm",
                  min_val: 0.0,
                  max_val: 100.0
              }
          ]
      },
      {
          id: "MTEST-CSF",
          name: "CSF",
          category: "Urine / Stool / Fluid",
          code: "CSF",
          default_price: 800.0,
          tube_type: "Sterile Container",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-CSFPRO",
                  name: "CSF Protein",
                  unit: "mg/dL",
                  min_val: 15.0,
                  max_val: 45.0
              },
              {
                  id: "MPARAM-CSFGLU",
                  name: "CSF Glucose",
                  unit: "mg/dL",
                  min_val: 50.0,
                  max_val: 80.0
              },
              {
                  id: "MPARAM-CSFCHL",
                  name: "CSF Chloride",
                  unit: "mmol/L",
                  min_val: 118.0,
                  max_val: 132.0
              }
          ]
      },
      {
          id: "MTEST-UPT",
          name: "Urine Pregnancy Test",
          category: "Urine / Stool / Fluid",
          code: "UPT",
          default_price: 120.0,
          tube_type: "Urine Container",
          tube_color: "Yellow",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-HCGPRE",
                  name: "hCG Pregnancy",
                  unit: "Presence",
                  min_val: 0.0,
                  max_val: 0.0
              }
          ]
      },
      {
          id: "MTEST-LFT",
          name: "Liver Function Test (LFT)",
          category: "Profiles",
          code: "LFT",
          default_price: 900.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-BILIT",
                  name: "Total Bilirubin",
                  unit: "mg/dL",
                  min_val: 0.1,
                  max_val: 1.2
              },
              {
                  id: "MPARAM-DIRECT",
                  name: "Direct Bilirubin",
                  unit: "mg/dL",
                  min_val: 0.0,
                  max_val: 0.3
              },
              {
                  id: "MPARAM-INDIRE",
                  name: "Indirect Bilirubin",
                  unit: "mg/dL",
                  min_val: 0.1,
                  max_val: 1.0
              },
              {
                  id: "MPARAM-SGOT",
                  name: "SGOT / AST",
                  unit: "U/L",
                  min_val: 8.0,
                  max_val: 48.0
              },
              {
                  id: "MPARAM-SGPT",
                  name: "SGPT / ALT",
                  unit: "U/L",
                  min_val: 7.0,
                  max_val: 56.0
              },
              {
                  id: "MPARAM-ALKALI",
                  name: "Alkaline Phosphatase",
                  unit: "U/L",
                  min_val: 44.0,
                  max_val: 147.0
              },
              {
                  id: "MPARAM-TOTALP",
                  name: "Total Protein",
                  unit: "g/dL",
                  min_val: 6.0,
                  max_val: 8.3
              },
              {
                  id: "MPARAM-ALBUMI",
                  name: "Albumin",
                  unit: "g/dL",
                  min_val: 3.5,
                  max_val: 5.0
              },
              {
                  id: "MPARAM-ALBUMI",
                  name: "Albumin Globulin Ratio",
                  unit: "Ratio",
                  min_val: 1.1,
                  max_val: 2.2
              }
          ]
      },
      {
          id: "MTEST-LIPID",
          name: "Lipid Profile",
          category: "Profiles",
          code: "LIPID",
          default_price: 800.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-CHOL",
                  name: "Total Cholesterol",
                  unit: "mg/dL",
                  min_val: 120.0,
                  max_val: 200.0
              },
              {
                  id: "MPARAM-TRIG",
                  name: "Triglycerides",
                  unit: "mg/dL",
                  min_val: 50.0,
                  max_val: 150.0
              },
              {
                  id: "MPARAM-HDL",
                  name: "HDL Cholesterol",
                  unit: "mg/dL",
                  min_val: 40.0,
                  max_val: 60.0
              },
              {
                  id: "MPARAM-LDL",
                  name: "LDL Cholesterol",
                  unit: "mg/dL",
                  min_val: 50.0,
                  max_val: 130.0
              },
              {
                  id: "MPARAM-VLDLCH",
                  name: "VLDL Cholesterol",
                  unit: "mg/dL",
                  min_val: 10.0,
                  max_val: 30.0
              }
          ]
      },
      {
          id: "MTEST-KFT",
          name: "KFT",
          category: "Profiles",
          code: "KFT",
          default_price: 700.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-UREA",
                  name: "Blood Urea",
                  unit: "mg/dL",
                  min_val: 15.0,
                  max_val: 45.0
              },
              {
                  id: "MPARAM-CREAT",
                  name: "Serum Creatinine",
                  unit: "mg/dL",
                  min_val: 0.6,
                  max_val: 1.2
              },
              {
                  id: "MPARAM-URIC",
                  name: "Uric Acid",
                  unit: "mg/dL",
                  min_val: 3.5,
                  max_val: 7.2
              },
              {
                  id: "MPARAM-TOTALC",
                  name: "Total Calcium",
                  unit: "mg/dL",
                  min_val: 8.5,
                  max_val: 10.2
              }
          ]
      },
      {
          id: "MTEST-RENAL",
          name: "Renal Profile",
          category: "Profiles",
          code: "RENAL",
          default_price: 750.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-BLOODU",
                  name: "Blood Urea",
                  unit: "mg/dL",
                  min_val: 15.0,
                  max_val: 45.0
              },
              {
                  id: "MPARAM-SERUMC",
                  name: "Serum Creatinine",
                  unit: "mg/dL",
                  min_val: 0.6,
                  max_val: 1.2
              },
              {
                  id: "MPARAM-SODIUM",
                  name: "Sodium",
                  unit: "mmol/L",
                  min_val: 135.0,
                  max_val: 145.0
              },
              {
                  id: "MPARAM-POTASS",
                  name: "Potassium",
                  unit: "mmol/L",
                  min_val: 3.5,
                  max_val: 5.2
              },
              {
                  id: "MPARAM-CHLORI",
                  name: "Chloride",
                  unit: "mmol/L",
                  min_val: 96.0,
                  max_val: 106.0
              }
          ]
      },
      {
          id: "MTEST-PREOP",
          name: "Pre-Operative Profile",
          category: "Profiles",
          code: "PREOP",
          default_price: 1500.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-HEMOGL",
                  name: "Hemoglobin",
                  unit: "g/dL",
                  min_val: 12.0,
                  max_val: 17.0
              },
              {
                  id: "MPARAM-BLEEDI",
                  name: "Bleeding Time",
                  unit: "mins",
                  min_val: 1.0,
                  max_val: 5.0
              },
              {
                  id: "MPARAM-CLOTTI",
                  name: "Clotting Time",
                  unit: "mins",
                  min_val: 3.0,
                  max_val: 9.0
              },
              {
                  id: "MPARAM-RANDOM",
                  name: "Random Blood Glucose",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 140.0
              },
              {
                  id: "MPARAM-HIVI&I",
                  name: "HIV I & II Antibody",
                  unit: "Ratio",
                  min_val: 0.0,
                  max_val: 0.9
              },
              {
                  id: "MPARAM-HBSAGA",
                  name: "HBsAg Antigen",
                  unit: "Ratio",
                  min_val: 0.0,
                  max_val: 0.9
              }
          ]
      },
      {
          id: "MTEST-COAG",
          name: "Coagulation Profile",
          category: "Profiles",
          code: "COAG",
          default_price: 600.0,
          tube_type: "Citrate",
          tube_color: "Blue",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-PROTHR",
                  name: "Prothrombin Time",
                  unit: "secs",
                  min_val: 11.0,
                  max_val: 15.0
              },
              {
                  id: "MPARAM-INR",
                  name: "INR",
                  unit: "Ratio",
                  min_val: 0.8,
                  max_val: 1.2
              },
              {
                  id: "MPARAM-PLATEL",
                  name: "Platelet Count",
                  unit: "lakhs/mcL",
                  min_val: 1.5,
                  max_val: 4.5
              },
              {
                  id: "MPARAM-APTT",
                  name: "APTT",
                  unit: "secs",
                  min_val: 25.0,
                  max_val: 35.0
              }
          ]
      },
      {
          id: "MTEST-THYROID",
          name: "Thyroid Profile",
          category: "Profiles",
          code: "THYROID",
          default_price: 600.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-T3",
                  name: "Triiodothyronine (T3)",
                  unit: "ng/dL",
                  min_val: 80.0,
                  max_val: 200.0
              },
              {
                  id: "MPARAM-T4",
                  name: "Thyroxine (T4)",
                  unit: "mcg/dL",
                  min_val: 4.5,
                  max_val: 12.0
              },
              {
                  id: "MPARAM-TSH",
                  name: "TSH",
                  unit: "uIU/mL",
                  min_val: 0.4,
                  max_val: 4.5
              }
          ]
      },
      {
          id: "MTEST-ANC",
          name: "ANC Profile",
          category: "Profiles",
          code: "ANC",
          default_price: 1200.0,
          tube_type: "Serum",
          tube_color: "Red",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-HEMOGL",
                  name: "Hemoglobin",
                  unit: "g/dL",
                  min_val: 12.0,
                  max_val: 17.0
              },
              {
                  id: "MPARAM-ABOGRO",
                  name: "ABO Grouping",
                  unit: "Text",
                  min_val: 0.0,
                  max_val: 0.0
              },
              {
                  id: "MPARAM-FASTIN",
                  name: "Fasting Sugar",
                  unit: "mg/dL",
                  min_val: 70.0,
                  max_val: 100.0
              },
              {
                  id: "MPARAM-HIVI&I",
                  name: "HIV I & II Antibody",
                  unit: "Ratio",
                  min_val: 0.0,
                  max_val: 0.9
              },
              {
                  id: "MPARAM-HBSAGA",
                  name: "HBsAg Antigen",
                  unit: "Ratio",
                  min_val: 0.0,
                  max_val: 0.9
              },
              {
                  id: "MPARAM-URINEA",
                  name: "Urine Albumin",
                  unit: "Index",
                  min_val: 0.0,
                  max_val: 0.0
              }
          ]
      },
      {
          id: "MTEST-FNAC",
          name: "FNAC",
          category: "Pathology / Cytology",
          code: "FNAC",
          default_price: 750.0,
          tube_type: "Aspirate",
          tube_color: "N/A",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-FNACRE",
                  name: "FNAC Result",
                  unit: "Text",
                  min_val: 0.0,
                  max_val: 0.0
              }
          ]
      },
      {
          id: "MTEST-PAP",
          name: "PAP Smear",
          category: "Pathology / Cytology",
          code: "PAP",
          default_price: 600.0,
          tube_type: "Smear",
          tube_color: "N/A",
          is_active: true,
          parameters: [
              {
                  id: "MPARAM-EPITHE",
                  name: "Epithelial Cells smear",
                  unit: "Text",
                  min_val: 0.0,
                  max_val: 0.0
              }
          ]
      }
  ];

  // Initial Seed for lab-specific Pathology Tests copies
  const initialTests: PathologyTest[] = initialMasterTests.map((m) => ({
    id: `TEST-${m.id.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}-LAB-7801`,
    labId: "LAB-7801",
    masterTestId: m.id,
    name: m.name,
    category: m.category,
    code: m.code,
    price: m.default_price,
    tube_type: m.tube_type,
    tube_color: m.tube_color,
    is_enabled: true,
    is_custom: false,
    parameters: m.parameters.map((p) => ({
      id: p.id.replace("MPARAM-", "PARAM-"),
      name: p.name,
      unit: p.unit,
      min_val: p.min_val,
      max_val: p.max_val
    }))
  }));

  const findTestByCode = (code: string) => {
    const found = initialTests.find((t) => t.code === code);
    if (!found) throw new Error(`Test with code ${code} not found during seeding`);
    return found;
  };

  // Current Date String for patients/expenses logs
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Initial Patient workflow nodes (empty for testing)
  const initialPatients: PatientEntry[] = [];

  // Initial expenses logs (empty for testing)
  const initialExpenses: Expense[] = [];

  const initialSettings: Record<string, LabSettings> = {};

  // Safe checks and seeding
  if (!labsRaw) {
    localStorage.setItem("abplus_mock_labs", JSON.stringify(initialLabs));
    labsRaw = JSON.stringify(initialLabs);
  }
  if (!usersRaw) {
    localStorage.setItem("abplus_mock_users", JSON.stringify(initialUsers));
    usersRaw = JSON.stringify(initialUsers);
  }
  if (!logsRaw) {
    localStorage.setItem("abplus_mock_logs", JSON.stringify(initialLogs));
    logsRaw = JSON.stringify(initialLogs);
  }
  if (!testsRaw) {
    localStorage.setItem("abplus_mock_tests", JSON.stringify(initialTests));
    testsRaw = JSON.stringify(initialTests);
  }
  if (!masterTestsRaw) {
    localStorage.setItem("abplus_mock_master_tests", JSON.stringify(initialMasterTests));
    masterTestsRaw = JSON.stringify(initialMasterTests);
  }
  if (!patientsRaw) {
    localStorage.setItem("abplus_mock_patients", JSON.stringify(initialPatients));
    patientsRaw = JSON.stringify(initialPatients);
  }
  if (!expensesRaw) {
    localStorage.setItem("abplus_mock_expenses", JSON.stringify(initialExpenses));
    expensesRaw = JSON.stringify(initialExpenses);
  }
  if (!settingsRaw) {
    localStorage.setItem("abplus_mock_settings", JSON.stringify(initialSettings));
    settingsRaw = JSON.stringify(initialSettings);
  }

  const labs = JSON.parse(labsRaw);
  const logs = JSON.parse(logsRaw || "[]");
  const users = JSON.parse(usersRaw || "[]");
  const tests = JSON.parse(testsRaw || "[]");
  const masterTests = JSON.parse(masterTestsRaw || "[]");
  const patients = JSON.parse(patientsRaw || "[]");
  const expenses = JSON.parse(expensesRaw || "[]");
  const referredDoctors = JSON.parse(referredDoctorsRaw || "[]");
  const settings = JSON.parse(settingsRaw || "{}");
  
  let commissionEntries: DoctorCommissionEntry[] = [];
  try {
    commissionEntries = JSON.parse(commissionEntriesRaw || "[]");
  } catch (e) {
    commissionEntries = [];
  }

  // Auto-seed mock commission snapshots for existing patients if empty
  if (commissionEntries.length === 0 && patients.length > 0) {
    patients.forEach((patient: PatientEntry) => {
      if (patient.referred_doctor_id) {
        const doctor = referredDoctors.find((d: ReferredDoctor) => d.id === patient.referred_doctor_id);
        const doctorName = doctor ? doctor.doctor_name : (patient.referred_doctor_name || "Direct Referral");
        const hospitalName = doctor ? doctor.hospital_name : "Direct Referral";
        
        const patientTests = patient.tests || [];
        patientTests.forEach((t: any) => {
          const testId = typeof t === "string" ? t : t.id;
          const test = typeof t === "object" ? t : tests.find((x: any) => x.id === testId);
          if (test) {
            const commission_percentage = test.commission_percentage !== undefined ? test.commission_percentage : 50;
            const testPrice = test.price || 0;
            const commission_amount = (testPrice * commission_percentage) / 100;
            
            commissionEntries.push({
              id: `COM-${Math.floor(100000 + Math.random() * 900000)}`,
              labId: patient.labId || "LAB-01",
              patientId: patient.id,
              patientName: patient.name,
              patientCode: patient.id,
              doctorId: patient.referred_doctor_id!,
              doctorName,
              hospitalName,
              testId: test.id,
              testName: test.name,
              testPrice,
              commission_percentage,
              commission_amount,
              entry_date: patient.created_at || new Date().toISOString().split("T")[0],
              is_paid: false,
              created_at: new Date().toISOString()
            });
          }
        });
      }
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("abplus_mock_commission_entries", JSON.stringify(commissionEntries));
    }
  }

  return {
    labs,
    logs,
    users,
    tests,
    masterTests,
    patients,
    expenses,
    referredDoctors,
    settings,
    commissionEntries,
  };
};

const saveMockState = (state: {
  labs: Lab[];
  logs: ActivityLog[];
  users: User[];
  tests: PathologyTest[];
  masterTests: MasterTest[];
  patients: PatientEntry[];
  expenses: Expense[];
  referredDoctors: ReferredDoctor[];
  settings: Record<string, LabSettings>;
  commissionEntries: DoctorCommissionEntry[];
}) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("abplus_mock_labs", JSON.stringify(state.labs));
    localStorage.setItem("abplus_mock_logs", JSON.stringify(state.logs));
    localStorage.setItem("abplus_mock_users", JSON.stringify(state.users));
    localStorage.setItem("abplus_mock_tests", JSON.stringify(state.tests));
    localStorage.setItem("abplus_mock_master_tests", JSON.stringify(state.masterTests));
    localStorage.setItem("abplus_mock_patients", JSON.stringify(state.patients));
    localStorage.setItem("abplus_mock_expenses", JSON.stringify(state.expenses));
    localStorage.setItem("abplus_mock_referred_doctors", JSON.stringify(state.referredDoctors));
    localStorage.setItem("abplus_mock_settings", JSON.stringify(state.settings));
    localStorage.setItem("abplus_mock_commission_entries", JSON.stringify(state.commissionEntries));
  }
};

function recalculateMockCommissionEntries(state: any, patient: PatientEntry) {
  if (!state.commissionEntries) {
    state.commissionEntries = [];
  }

  // 1. If patient has no referred doctor, remove all their entries.
  if (!patient.referred_doctor_id) {
    state.commissionEntries = state.commissionEntries.filter(
      (e: any) => e.patientId !== patient.id
    );
    return;
  }

  const patientTests = patient.tests || [];
  const testIds = patientTests.map((t: any) => typeof t === "string" ? t : t.id);

  // 2. Remove entries for tests that are no longer active
  state.commissionEntries = state.commissionEntries.filter((e: any) => {
    if (e.patientId !== patient.id) return true;
    return testIds.includes(e.testId);
  });

  // 3. Create or update entries for active tests
  const doctor = state.referredDoctors.find((d: any) => d.id === patient.referred_doctor_id);
  const doctorName = doctor ? doctor.doctor_name : (patient.referred_doctor_name || "Direct Referral");
  const hospitalName = doctor ? doctor.hospital_name : "Direct Referral";

  testIds.forEach((testId: string) => {
    // Tests might be full test objects or string IDs in frontend
    const fullTest = typeof patientTests[0] === "object" ? patientTests.find((t: any) => t.id === testId) : null;
    const test = fullTest || state.tests.find((t: any) => t.id === testId);
    if (!test) return;

    const existing = state.commissionEntries.find(
      (e: any) => e.patientId === patient.id && e.testId === testId
    );

    const commission_percentage = test.commission_percentage !== undefined ? test.commission_percentage : 50;
    const testPrice = test.price || 0;
    const commission_amount = (testPrice * commission_percentage) / 100;

    if (existing) {
      existing.doctorId = patient.referred_doctor_id!;
      existing.doctorName = doctorName;
      existing.hospitalName = hospitalName;
    } else {
      state.commissionEntries.push({
        id: `COM-${Math.floor(100000 + Math.random() * 900000)}`,
        labId: patient.labId || "LAB-01",
        patientId: patient.id,
        patientName: patient.name,
        patientCode: patient.id,
        doctorId: patient.referred_doctor_id!,
        doctorName,
        hospitalName,
        testId: test.id,
        testName: test.name,
        testPrice,
        commission_percentage,
        commission_amount,
        entry_date: patient.created_at || new Date().toISOString().split("T")[0],
        is_paid: false,
        created_at: new Date().toISOString()
      });
    }
  });
}

function parsePathologyTest(t: any): PathologyTest {
  return {
    ...t,
    price: Number(t.price),
    parameters: (t.parameters || []).map((p: any) => ({
      ...p,
      min_val: Number(p.min_val),
      max_val: Number(p.max_val)
    }))
  };
}

function parsePatientEntry(p: any): PatientEntry {
  return {
    ...p,
    age: Number(p.age),
    total_bill: Number(p.total_bill),
    paid_amount: Number(p.paid_amount),
    concession: p.concession !== undefined && p.concession !== null ? Number(p.concession) : 0,
    pending_balance: p.pending_balance !== undefined && p.pending_balance !== null ? Number(p.pending_balance) : 0,
    tests: (p.tests || []).map((t: any) => parsePathologyTest(t)),
    transactions: p.transactions || []
  };
}

function parseExpense(e: any): Expense {
  return {
    ...e,
    amount: Number(e.amount)
  };
}

// Core API client methods
export const apiService = {
  // POST /login
  async login(loginData: { email?: string; username?: string; password?: string; lab_code?: string }): Promise<{ success: boolean; user: User }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Authentication failed.");
      }
      const data = await res.json();
      setCookie("abplus_access_token", data.access, 1);
      setCookie("abplus_refresh_token", data.refresh, 7);
      return data;
    }
    await delay(400);
    const state = getMockState();
    const identifier = loginData.email || loginData.username;
    const password = loginData.password;
    
    const matches = state.users.filter((u: any) => u.email === identifier || u.username === identifier);
    const matchingUser = matches.find((u: any) => {
      const storedPassword = u.password || "password";
      return password === storedPassword;
    });

    if (!matchingUser) {
      throw new Error("Invalid email/username or password.");
    }

    if (matchingUser.status !== "active") {
      throw new Error("This account has been suspended.");
    }

    return {
      success: true,
      user: matchingUser
    };
  },

  // Logout utility
  logout(): void {
    eraseCookie("abplus_access_token");
    eraseCookie("abplus_refresh_token");
  },

  // GET /me/ profile loader
  async getProfile(): Promise<User> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/me/`);
      if (!res.ok) {
        throw new Error("Failed to load user profile.");
      }
      return res.json();
    }
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") : null;
    const state = getMockState();
    const user = state.users.find(u => u.email === loggedInEmail || u.username === loggedInEmail);
    if (!user) throw new Error("Not logged in");
    return user;
  },

  // POST /me/change-password/
  async changePassword(new_password: string): Promise<{ success: boolean }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/me/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to change password.");
      }
      return res.json();
    }
    await delay(400);
    return { success: true };
  },

  // GET /dashboard/stats (Super Admin View)
  async getDashboardStats(): Promise<DashboardStats> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/dashboard/stats/`);
      return res.json();
    }
    await delay(300);
    const { labs, users } = getMockState();

    const total_labs = labs.length;
    const active_labs = labs.filter((l) => l.status === "active").length;
    const inactive_labs = total_labs - active_labs;
    const total_users = users.length;
    const total_patient_entries = labs.reduce((sum, l) => sum + l.patient_count, 0);

    return {
      total_labs,
      active_labs,
      inactive_labs,
      total_users,
      total_patient_entries,
      labs_trend: "+2 this month",
      users_trend: "+4 this week",
      patients_trend: "+142 today",
    };
  },

  // GET /labs
  async getLabs(params: {
    page: number;
    search?: string;
    status?: string;
    limit?: number;
  }): Promise<{ results: Lab[]; count: number }> {
    if (!IS_MOCK) {
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: (params.limit || 5).toString(),
        ...(params.search && { search: params.search }),
        ...(params.status && params.status !== "all" && { status: params.status }),
      });
      const res = await authFetch(`${API_URL}/labs/?${query}`);
      const json = await res.json();
      return Array.isArray(json) ? { results: json, count: json.length } : json;
    }
    await delay(400);
    const { labs } = getMockState();

    let filtered = [...labs];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.admin_name.toLowerCase().includes(q) ||
          l.admin_email.toLowerCase().includes(q)
      );
    }

    if (params.status && params.status !== "all") {
      filtered = filtered.filter((l) => l.status === params.status);
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const limit = params.limit || 5;
    const offset = (params.page - 1) * limit;
    const results = filtered.slice(offset, offset + limit);

    return {
      results,
      count: filtered.length,
    };
  },

  // GET /labs/:id/summary (Lightweight Summary Fetch)
  async getLabSummary(id: string): Promise<{ name: string; users_count: number; patient_count: number; status: string }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/labs/${id}/summary/`);
      return res.json();
    }
    await delay(200);
    const { labs } = getMockState();
    const lab = labs.find((l) => l.id === id);
    if (!lab) throw new Error("Lab not found");
    return {
      name: lab.name,
      users_count: lab.users_count,
      patient_count: lab.patient_count,
      status: lab.status,
    };
  },

  // POST /labs
  async createLab(labData: Omit<Lab, "id" | "created_at" | "users_count" | "patient_count" | "status"> & { admin_password?: string }): Promise<Lab> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/labs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labData),
      });
      return res.json();
    }
    await delay(600);
    const state = getMockState();

    const newLabId = `LAB-${Math.floor(1000 + Math.random() * 9000)}`;
    const adminUsername = labData.admin_name.toLowerCase().replace(/[^a-z0-9_]/g, "").replace(/\s+/g, "_");
    
    const newLab: Lab = {
      id: newLabId,
      name: labData.name,
      address: labData.address,
      phone: labData.phone,
      admin_name: labData.admin_name,
      admin_email: labData.admin_email,
      admin_username: adminUsername,
      status: "active",
      created_at: new Date().toISOString(),
      users_count: 1,
      patient_count: 0,
    };

    const newUser: User & { password?: string } = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: labData.admin_name,
      username: adminUsername,
      email: labData.admin_email,
      role: "LAB_ADMIN",
      lab_name: labData.name,
      labId: newLabId,
      status: "active",
      created_at: new Date().toISOString(),
      password: labData.admin_password || "password"
    };

    const newLog: ActivityLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      action: `Super Admin Onboarded ${labData.name}`,
      timestamp: new Date().toISOString(),
      user_email: "superadmin@abplus.in",
      lab_name: labData.name,
    };

    state.labs.push(newLab);
    state.users.push(newUser);
    state.logs.push(newLog);

    // Auto-clone active master tests to the new lab catalog
    const copied: PathologyTest[] = state.masterTests.filter(m => m.is_active).map(m => ({
      id: `LTEST-${m.id.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}-${newLabId}`,
      labId: newLabId,
      masterTestId: m.id,
      name: m.name,
      category: m.category,
      code: m.code,
      price: m.default_price,
      tube_type: m.tube_type,
      tube_color: m.tube_color,
      is_enabled: true,
      is_custom: false,
      parameters: m.parameters.map(p => ({
        id: `LPARAM-${p.id.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}-${newLabId}`,
        name: p.name,
        unit: p.unit,
        min_val: p.min_val,
        max_val: p.max_val
      }))
    }));
    state.tests.push(...copied);

    saveMockState(state);

    return newLab;
  },

  // PATCH /labs/:id/status
  async patchLabStatus(id: string, status: "active" | "suspended"): Promise<Lab> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/labs/${id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    const labIdx = state.labs.findIndex((l) => l.id === id);

    if (labIdx === -1) throw new Error("Lab not found");
    state.labs[labIdx].status = status;

    const adminEmail = state.labs[labIdx].admin_email;
    const userIdx = state.users.findIndex((u) => u.email === adminEmail);
    if (userIdx !== -1) {
      state.users[userIdx].status = status === "active" ? "active" : "inactive";
    }

    const newLog: ActivityLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      action: `Super Admin ${status === "active" ? "Activated" : "Suspended"} ${state.labs[labIdx].name}`,
      timestamp: new Date().toISOString(),
      user_email: "superadmin@abplus.in",
      lab_name: state.labs[labIdx].name,
    };
    state.logs.push(newLog);

    saveMockState(state);
    return state.labs[labIdx];
  },

  // PATCH /labs/:id
  async updateLab(id: string, labData: Partial<Lab>): Promise<Lab> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/labs/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: labData.name,
          address: labData.address,
          phone: labData.phone,
          admin_name: labData.admin_name,
          admin_email: labData.admin_email,
          lab_code: labData.lab_code
        }),
      });
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    const labIdx = state.labs.findIndex((l) => l.id === id);
    if (labIdx === -1) throw new Error("Lab not found");
    
    state.labs[labIdx] = {
      ...state.labs[labIdx],
      ...labData,
    };
    saveMockState(state);
    return state.labs[labIdx];
  },

  // DELETE /labs/:id
  async deleteLab(id: string): Promise<boolean> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/labs/${id}/`, {
        method: "DELETE",
      });
      return res.ok;
    }
    await delay(300);
    const state = getMockState();
    const labIdx = state.labs.findIndex((l) => l.id === id);
    if (labIdx === -1) return false;
    
    const lab = state.labs[labIdx];
    
    // Remove the lab
    state.labs.splice(labIdx, 1);
    
    // Also remove users and tests associated with this lab
    state.users = state.users.filter((u) => u.labId !== id && u.lab_id !== id);
    state.tests = state.tests.filter((t) => t.labId !== id);
    state.patients = state.patients.filter((p) => p.labId !== id);
    state.expenses = state.expenses.filter((e) => e.labId !== id);
    
    // Log the delete action
    const newLog: ActivityLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      action: `Super Admin deleted lab ${lab.name}`,
      timestamp: new Date().toISOString(),
      user_email: "superadmin@abplus.in",
      lab_name: lab.name,
    };
    state.logs.push(newLog);
    
    saveMockState(state);
    return true;
  },


  // GET /dashboard/logs
  async getActivityLogs(params: { page: number; limit?: number }): Promise<{ results: ActivityLog[]; count: number }> {
    if (!IS_MOCK) {
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: (params.limit || 8).toString(),
      });
      const res = await authFetch(`${API_URL}/dashboard/logs/?${query}`);
      const json = await res.json();
      return Array.isArray(json) ? { results: json, count: json.length } : json;
    }
    await delay(200);
    const { logs } = getMockState();
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const limit = params.limit || 8;
    const offset = (params.page - 1) * limit;
    return {
      results: sortedLogs.slice(offset, offset + limit),
      count: logs.length,
    };
  },

  // GET /users (Super Admin platform monitoring)
  async getUsers(params: {
    page: number;
    search?: string;
    role?: string;
    limit?: number;
  }): Promise<{ results: User[]; count: number }> {
    if (!IS_MOCK) {
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: (params.limit || 6).toString(),
        ...(params.search && { search: params.search }),
        ...(params.role && params.role !== "all" && { role: params.role }),
      });
      const res = await authFetch(`${API_URL}/users/?${query}`);
      const json = await res.json();
      return Array.isArray(json) ? { results: json, count: json.length } : json;
    }
    await delay(300);
    const { users } = getMockState();

    let filtered = [...users];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          u.lab_name.toLowerCase().includes(q)
      );
    }

    if (params.role && params.role !== "all") {
      filtered = filtered.filter((u) => u.role === params.role);
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const limit = params.limit || 6;
    const offset = (params.page - 1) * limit;
    return {
      results: filtered.slice(offset, offset + limit),
      count: filtered.length,
    };
  },

  // ==========================================
  // LAB ADMIN & WORKFLOW DASHBOARD APIS (MOCK)
  // ==========================================

  // GET /dashboard/stats (Tenant Specific)
  async getLabDashboardStats(labId: string, date: string): Promise<LabDashboardStats> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/dashboard/stats/?lab_id=${labId}&date=${date}`);
      const data = await res.json();
      if (data.cashier_mode) {
        return {
          today_patients: 0,
          pending_reports: 0,
          completed_reports: 0,
          total_revenue: 0,
          pending_balance: 0,
          daily_expenses: 0,
          net_revenue: 0,
          cashier_mode: true,
          net_cash_received: Number(data.net_cash_received),
          samples_received: Number(data.samples_received),
          pending_boys_count: Number(data.pending_boys_count),
          cashier_pending: Number(data.cashier_pending),
          total_submitted_today: Number(data.total_submitted_today),
          cash_in_vault: Number(data.cash_in_vault),
          cash_submitted_today: Number(data.cash_submitted_today),
          previous_cash_pending: Number(data.previous_cash_pending),
          cash_not_submitted_to_admin: Number(data.cash_not_submitted_to_admin)
        };
      }
      return {
        ...data,
        today_patients: Number(data.today_patients),
        pending_reports: Number(data.pending_reports),
        completed_reports: Number(data.completed_reports),
        total_revenue: Number(data.total_revenue),
        pending_balance: Number(data.pending_balance),
        daily_expenses: Number(data.daily_expenses),
        net_revenue: Number(data.net_revenue),
        lab_cash_collection_pending: data.lab_cash_collection_pending !== undefined ? Number(data.lab_cash_collection_pending) : undefined,
        cash_available_in_vault: data.cash_available_in_vault !== undefined ? Number(data.cash_available_in_vault) : undefined,
        received_from_cashier_today: data.received_from_cashier_today !== undefined ? Number(data.received_from_cashier_today) : undefined,
      };
    }
    await delay(300);
    const loggedInRole = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_role") || "CASHIER" : "CASHIER";
    if (loggedInRole === "CASHIER") {
      let net_cash_received = 0;
      let settled_boy_ids: string[] = [];
      const state = getMockState();
      const boys = state.users.filter(u => u.role === "COLLECTION_BOY" && u.status === "active");
      
      if (typeof window !== "undefined") {
        for (const boy of boys) {
          const boyName = boy.username;
          const cached = localStorage.getItem(`abplus_mock_settlements_${labId}_${date}_${boyName}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            net_cash_received += parsed.net_cash_expected || parsed.amount_received || 0;
            settled_boy_ids.push(boy.id);
          }
        }
      }

      const samples_received = state.patients.filter(p => 
        p.labId === labId && 
        p.created_at === date && 
        ["LAB_RECEIVED", "COMPLETED", "DELIVERED"].includes(p.status)
      ).length;

      const pending_boys_count = boys.filter(b => !settled_boy_ids.includes(b.id)).length;

      // Get mock cashier lab settlements
      let cashier_lab_settlements: CashierLabSettlement[] = [];
      if (typeof window !== "undefined") {
        const settlementsRaw = localStorage.getItem("abplus_mock_cashier_lab_settlements");
        if (settlementsRaw) {
          try {
            cashier_lab_settlements = JSON.parse(settlementsRaw);
          } catch {}
        }
      }

      // Filter settlements for today
      const todaySettlements = cashier_lab_settlements.filter(s => 
        s.lab_id === labId && 
        s.submitted_at?.split("T")[0] === date
      );
      const total_submitted_today = todaySettlements.reduce((sum, s) => sum + s.settlement_amount, 0);

      // Direct desk cash collections for today
      const directDeskCash = state.patients.filter(p => 
        p.labId === labId && 
        p.created_at === date && 
        !p.collected_by
      ).reduce((sum, p) => sum + p.paid_amount, 0);

      // Daily expenses for today
      const dailyExpenses = state.expenses.filter((e) => e.labId === labId && e.date === date);
      const daily_expenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

      const gross_cash = directDeskCash + net_cash_received;
      const cashier_pending = Math.max(0, gross_cash - daily_expenses - total_submitted_today);

      return {
        today_patients: 0,
        pending_reports: 0,
        completed_reports: 0,
        total_revenue: 0,
        pending_balance: 0,
        daily_expenses: 0,
        net_revenue: 0,
        cashier_mode: true,
        net_cash_received,
        samples_received,
        pending_boys_count,
        cashier_pending,
        total_submitted_today,
        cash_in_vault: cashier_pending,
        cash_submitted_today: total_submitted_today,
        previous_cash_pending: 0,
        cash_not_submitted_to_admin: cashier_pending
      };
    }

    const { patients, expenses } = getMockState();

    // Filter patients created on this date
    const dailyPatients = patients.filter((p) => p.labId === labId && p.created_at === date);
    const today_patients = dailyPatients.length;
    const pending_reports = dailyPatients.filter((p) => !["COMPLETED", "DELIVERED"].includes(p.status)).length;
    const completed_reports = dailyPatients.filter((p) => p.status === "COMPLETED" || p.status === "DELIVERED").length;

    // Revenue tracking
    const total_revenue = dailyPatients.reduce((sum, p) => sum + p.paid_amount, 0);

    // Pending balance (Total unpaid patient receivables till selected date)
    const patientsTillDate = patients.filter((p) => p.labId === labId && p.created_at <= date);
    const pending_balance = patientsTillDate.reduce((sum, p) => sum + Math.max(0, p.total_bill - p.paid_amount - (p.concession || 0)), 0);

    // Expenses
    const dailyExpenses = expenses.filter((e) => e.labId === labId && e.date === date);
    const daily_expenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

    const net_revenue = total_revenue - daily_expenses;

    // Calculate Lab Cash Collection Pending for mock mode
    const state = getMockState();
    const closeoutKey = `abplus_mock_closeout_${labId}_${date}`;
    const closeoutExists = typeof window !== "undefined" ? localStorage.getItem(closeoutKey) !== null : false;
    let cashier_pending = 0;
    if (!closeoutExists) {
      // Direct desk cash collections
      const directCashierReceived = dailyPatients
        .filter(p => !p.collected_by)
        .reduce((sum, p) => sum + p.paid_amount, 0);

      // Settlements received from boys
      let settlementsReceived = 0;
      if (typeof window !== "undefined") {
        const boys = state.users.filter(u => u.labId === labId && u.role === "COLLECTION_BOY" && u.status === "active");
        for (const boy of boys) {
          const cached = localStorage.getItem(`abplus_mock_settlements_${labId}_${date}_${boy.username}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              settlementsReceived += parsed.amount_received || 0;
            } catch {}
          }
        }
      }

      cashier_pending = Math.max(0, directCashierReceived + settlementsReceived - daily_expenses);
    }

    let bcb_pending = 0;
    const boys = state.users.filter(u => u.labId === labId && u.role === "COLLECTION_BOY" && u.status === "active");
    for (const boy of boys) {
      const boyPatients = state.patients.filter(p => 
        p.labId === labId && 
        p.created_at === date && 
        (p.collected_by || "").toLowerCase() === boy.username.toLowerCase()
      );
      const boyExpenses = state.expenses.filter(e => 
        e.labId === labId && 
        e.date === date && 
        (e.created_by || "").toLowerCase() === boy.username.toLowerCase()
      );
      const total_collected = boyPatients.reduce((sum, p) => sum + p.paid_amount, 0);
      const total_expenses = boyExpenses.reduce((sum, e) => sum + e.amount, 0);
      const net_cash = total_collected - total_expenses;

      let settled_amount = 0;
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(`abplus_mock_settlements_${labId}_${date}_${boy.username}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            settled_amount = parsed.amount_received || 0;
          } catch {}
        }
      }
      bcb_pending += Math.max(0, net_cash - settled_amount);
    }
    const lab_cash_collection_pending = bcb_pending + cashier_pending;

    return {
      today_patients,
      pending_reports,
      completed_reports,
      total_revenue,
      pending_balance,
      daily_expenses,
      net_revenue,
      lab_cash_collection_pending
    };
  },

  // GET /employees
  async getEmployees(labId: string): Promise<User[]> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/employees/?lab_id=${labId}`);
      const data = await res.json();
      // Handle DRF paginated response {count, results:[...]} or plain array
      return Array.isArray(data) ? data : (data.results || []);
    }
    await delay(250);
    const { users } = getMockState();
    // Return users belonging to the specific lab, excluding Super Admin
    return users.filter((u) => u.role !== "SUPER_ADMIN");
  },

  // POST /employees
  async createEmployee(labId: string, employeeData: {
    name: string;
    username: string;
    phone_number: string;
    role: "TECHNICIAN" | "CASHIER" | "COLLECTION_BOY";
    password?: string;
  }): Promise<User> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/employees/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...employeeData, lab_id: labId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || Object.values(errorData).flat().join(", ") || "Failed to register staff account.");
      }
      return res.json();
    }
    await delay(400);
    const state = getMockState();

    const lab = state.labs.find((l) => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";

    const newEmp: User & { password?: string } = {
      id: `USR-${Math.floor(200 + Math.random() * 800)}`,
      name: employeeData.name,
      username: employeeData.username,
      phone_number: employeeData.phone_number,
      role: employeeData.role,
      lab_name: labName,
      labId: labId,
      status: "active",
      created_at: new Date().toISOString(),
      password: employeeData.password || "password"
    };

    state.users.push(newEmp as any);

    // Update users_count for the lab
    const labIdx = state.labs.findIndex((l) => l.id === labId);
    if (labIdx !== -1) {
      state.labs[labIdx].users_count = (state.labs[labIdx].users_count || 0) + 1;
    }

    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    // Audit Log
    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Created staff member ${newEmp.name} as ${newEmp.role} (Username: ${newEmp.username})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return newEmp as User;
  },

  // PATCH /employees/:id
  async updateEmployee(labId: string, employeeId: string, employeeData: Partial<User>): Promise<User> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/employees/${employeeId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...employeeData, lab_id: labId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || Object.values(errorData).flat().join(", ") || "Failed to update staff account.");
      }
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    const idx = state.users.findIndex((u) => u.id === employeeId);
    if (idx === -1) throw new Error("Employee not found");

    state.users[idx] = {
      ...state.users[idx],
      ...employeeData
    };

    const lab = state.labs.find((l) => l.name === state.users[idx].lab_name || l.id === labId);
    const labName = lab ? lab.name : state.users[idx].lab_name;
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Updated staff profile of ${state.users[idx].name}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return state.users[idx];
  },

  // POST /employees/:id/reset-password
  async resetEmployeePassword(employeeId: string): Promise<{ success: boolean; temp_pass: string }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/employees/${employeeId}/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      return res.json();
    }
    await delay(400);
    const state = getMockState();
    const emp = state.users.find((u) => u.id === employeeId);
    if (!emp) throw new Error("Employee not found");

    const temp_pass = `AB-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Save the new temp password
    (emp as any).password = temp_pass;

    const lab = state.labs.find((l) => l.name === emp.lab_name || l.id === emp.labId);
    const labName = lab ? lab.name : emp.lab_name;
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Reset password of ${emp.name}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return { success: true, temp_pass };
  },

  // DELETE /employees/:id
  async deleteEmployee(labId: string, employeeId: string): Promise<void> {
    if (!IS_MOCK) {
      await authFetch(`${API_URL}/employees/${employeeId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lab_id: labId })
      });
      return;
    }
    await delay(300);
    const state = getMockState();
    const idx = state.users.findIndex((u) => u.id === employeeId);
    if (idx === -1) throw new Error("Employee not found");

    const empName = state.users[idx].name;
    state.users.splice(idx, 1);

    // Update users_count for the lab
    const labIdx = state.labs.findIndex((l) => l.id === labId);
    if (labIdx !== -1) {
      state.labs[labIdx].users_count = Math.max(0, (state.labs[labIdx].users_count || 1) - 1);
    }

    const lab = state.labs.find(l => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Deleted staff member: ${empName} (${employeeId})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
  },

  // GET /master-tests
  async getMasterTests(): Promise<MasterTest[]> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/master-tests/`);
      return res.json();
    }
    await delay(300);
    const { masterTests } = getMockState();
    return masterTests;
  },

  // GET /tests (scoped to lab_id with copy-on-write fallback)
  async getTests(labId: string): Promise<PathologyTest[]> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/lab-tests/?lab_id=${labId}`);
      const data = await res.json();
      return data.map(parsePathologyTest);
    }
    await delay(300);
    const state = getMockState();
    let labTests = state.tests.filter((t) => t.labId === labId);

    // If no tests are configured for this lab, clone from Master Test Library
    if (labTests.length === 0) {
      const activeMasters = state.masterTests.filter((m) => m.is_active);
      const copied: PathologyTest[] = activeMasters.map((m) => ({
        id: `LTEST-${m.id.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}-${labId}`,
        labId: labId,
        masterTestId: m.id,
        name: m.name,
        category: m.category,
        code: m.code,
        price: m.default_price,
        tube_type: m.tube_type,
        tube_color: m.tube_color,
        is_enabled: true,
        is_custom: false,
        parameters: m.parameters.map((p) => ({
          id: `LPARAM-${p.id.split('-')[1] || Math.floor(1000 + Math.random() * 9000)}-${labId}`,
          name: p.name,
          unit: p.unit,
          min_val: p.min_val,
          max_val: p.max_val
        }))
      }));
      state.tests.push(...copied);
      saveMockState(state);
      labTests = copied;
    }

    return labTests;
  },

  // POST /tests
  async createCustomTest(labId: string, testData: Omit<PathologyTest, "id" | "is_enabled">): Promise<PathologyTest> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/lab-tests/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...testData, lab_id: labId }),
      });
      const data = await res.json();
      return parsePathologyTest(data);
    }
    await delay(450);
    const state = getMockState();

    const newTest: PathologyTest = {
      id: `LTEST-${Math.floor(500 + Math.random() * 500)}-${labId}`,
      labId: labId,
      name: testData.name,
      category: testData.category || "General",
      code: testData.code.toUpperCase(),
      price: Number(testData.price),
      tube_type: testData.tube_type,
      tube_color: testData.tube_color,
      is_enabled: true,
      parameters: testData.parameters.map((p, index) => ({
        id: `LPARAM-${Math.floor(900 + Math.random() * 900)}-${index}-${labId}`,
        name: p.name,
        unit: p.unit,
        min_val: Number(p.min_val),
        max_val: Number(p.max_val)
      })),
      is_custom: true
    };

    state.tests.push(newTest);

    const lab = state.labs.find((l) => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Created Custom Diagnostic Test: ${newTest.name}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return newTest;
  },

  // PUT /tests/:id
  async updateTest(labId: string, testId: string, testData: Partial<PathologyTest>): Promise<PathologyTest> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/lab-tests/${testId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...testData, lab_id: labId }),
      });
      const data = await res.json();
      return parsePathologyTest(data);
    }
    await delay(350);
    const state = getMockState();
    const idx = state.tests.findIndex((t) => t.id === testId);
    if (idx === -1) throw new Error("Test not found");

    state.tests[idx] = {
      ...state.tests[idx],
      ...testData,
      price: testData.price !== undefined ? Number(testData.price) : state.tests[idx].price,
      parameters: testData.parameters ? testData.parameters.map((p, i) => ({
        id: p.id || `LPARAM-${Math.floor(900 + Math.random() * 900)}-${i}-${labId}`,
        name: p.name,
        unit: p.unit,
        min_val: Number(p.min_val),
        max_val: Number(p.max_val)
      })) : state.tests[idx].parameters
    };

    const lab = state.labs.find((l) => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Modified details of test: ${state.tests[idx].name}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return state.tests[idx];
  },

  // PATCH /tests/:id/toggle
  async toggleTestStatus(labId: string, testId: string, isEnabled: boolean): Promise<PathologyTest> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/lab-tests/${testId}/toggle/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: isEnabled, lab_id: labId }),
      });
      const data = await res.json();
      return parsePathologyTest(data);
    }
    await delay(200);
    const state = getMockState();
    const idx = state.tests.findIndex((t) => t.id === testId);
    if (idx === -1) throw new Error("Test not found");

    state.tests[idx].is_enabled = isEnabled;

    const lab = state.labs.find((l) => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `${isEnabled ? "Enabled" : "Disabled"} test catalog item: ${state.tests[idx].name}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return state.tests[idx];
  },

  // DELETE /tests/:id
  async deleteTest(labId: string, testId: string): Promise<boolean> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/lab-tests/${testId}/?lab_id=${labId}`, {
        method: "DELETE",
      });
      return res.ok;
    }
    await delay(300);
    const state = getMockState();
    const idx = state.tests.findIndex((t) => t.id === testId);
    if (idx === -1) return false;

    const testName = state.tests[idx].name;
    state.tests.splice(idx, 1);

    const lab = state.labs.find((l) => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Deleted test from catalog: ${testName}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return true;
  },

  // GET /patients (Filters based on Role workflow logic)
  async getPatients(labId: string, role: string, search?: string, status?: string, date?: string): Promise<PatientEntry[]> {
    if (!IS_MOCK) {
      const query = new URLSearchParams({
        lab_id: labId,
        role,
        ...(search && { search }),
        ...(status && { status }),
        ...(date && { date })
      });
      const res = await authFetch(`${API_URL}/patients/?${query}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(parsePatientEntry);
    }
    await delay(350);
    const { patients } = getMockState();
    let filtered = [...patients];

    // Role filtration limits
    if (role === "TECHNICIAN") {
      // Tech is no longer restricted to LAB_RECEIVED status globally
    } else if (role === "CASHIER") {
      // Cashier sees everything to manage payments
    } else if (role === "COLLECTION_BOY") {
      // Collection Boy sees created or collected by them
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    } else if (date) {
      filtered = filtered.filter((p) => p.created_at === date);
    }

    if (status && status !== "ALL") {
      filtered = filtered.filter((p) => p.status === status);
    }

    // Sort by id descending
    filtered.sort((a, b) => b.id.localeCompare(a.id));

    return filtered;
  },

  // POST /patients
  async createPatient(labId: string, patientData: Omit<PatientEntry, "id" | "status" | "results" | "created_at"> & { created_at?: string }): Promise<PatientEntry> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/patients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patientData, lab_id: labId }),
      });
      const data = await res.json();
      return parsePatientEntry(data);
    }
    await delay(500);
    const state = getMockState();

    let refDoctorId = patientData.referred_doctor_id;
    let refDoctorName = "";
    if (refDoctorId) {
      const doc = state.referredDoctors.find(d => d.id === refDoctorId);
      if (doc) {
        refDoctorName = doc.doctor_name;
      }
    } else if (patientData.referred_doctor_name && patientData.referred_doctor_name.trim()) {
      const trimmedName = patientData.referred_doctor_name.trim();
      const existingDoc = state.referredDoctors.find(
        d => d.labId === labId && d.doctor_name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingDoc) {
        refDoctorId = existingDoc.id;
        refDoctorName = existingDoc.doctor_name;
      } else {
        // Dynamically create a mock referred doctor
        const labDocs = state.referredDoctors.filter(d => d.labId === labId);
        let nextNum = 1;
        if (labDocs.length > 0) {
          const nums = labDocs.map(d => {
            const match = d.id.match(/^REF(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          });
          nextNum = Math.max(...nums) + 1;
        }
        refDoctorId = `REF${String(nextNum).padStart(3, '0')}`;
        refDoctorName = trimmedName;

        state.referredDoctors.push({
          id: refDoctorId,
          doctor_name: refDoctorName,
          hospital_name: "Direct Referral",
          phone: "",
          address: "",
          status: "Active",
          created_at: new Date().toISOString(),
          labId
        });
      }
    }

    const newPat: PatientEntry = {
      id: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: patientData.name,
      age: Number(patientData.age),
      gender: patientData.gender,
      phone: patientData.phone,
      status: "CREATED",
      tests: patientData.tests,
      results: {},
      collected_by: patientData.collected_by || "",
      referred_doctor_id: refDoctorId || undefined,
      referred_doctor_name: refDoctorName || "",
      total_bill: Number(patientData.total_bill),
      paid_amount: Number(patientData.paid_amount),
      concession: Number(patientData.concession) || 0,
      created_at: patientData.created_at || new Date().toISOString().split("T")[0],
      labId: labId
    };

    state.patients.push(newPat);
    recalculateMockCommissionEntries(state, newPat);

    // Update patient_count for the lab
    const labIdx = state.labs.findIndex((l) => l.id === labId);
    let labName = "AB+ Diagnostic Laboratory";
    if (labIdx !== -1) {
      state.labs[labIdx].patient_count = (state.labs[labIdx].patient_count || 0) + 1;
      labName = state.labs[labIdx].name;
    }

    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || (patientData.collected_by ? "boy@abplus.in" : "cashier@abplus.in") : (patientData.collected_by ? "boy@abplus.in" : "cashier@abplus.in");

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Created patient record: ${newPat.name} (Bill: ₹${newPat.total_bill})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return newPat;
  },

  // PATCH /patients/:id/payment
  async updatePatientPayment(patientId: string, paidAmount: number, concession?: number, paymentMode?: string, notes?: string, clientTxnId?: string): Promise<PatientEntry> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/patients/${patientId}/payment/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paid_amount: paidAmount,
          concession: concession || 0,
          payment_mode: paymentMode || "CASH",
          notes: notes || "",
          client_txn_id: clientTxnId
        }),
      });
      const data = await res.json();
      if (res.status >= 400) {
        throw new Error(data.error || "Failed to process payment.");
      }
      return parsePatientEntry(data);
    }
    await delay(300);
    const state = getMockState();
    const idx = state.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) throw new Error("Patient not found");

    const p = state.patients[idx];

    // Idempotency check for mock mode
    if (clientTxnId && p.transactions?.some(t => t.id === clientTxnId)) {
        return p;
    }

    const addPaid = Number(paidAmount) || 0;
    const addConcession = Number(concession) || 0;
    const modeClean = (paymentMode || "CASH").toUpperCase() as any;

    p.paid_amount = p.paid_amount + addPaid;
    p.concession = (p.concession || 0) + addConcession;

    if (!p.transactions) p.transactions = [];
    p.transactions.push({
      id: clientTxnId || `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      amount_received: addPaid,
      concession_amount: addConcession,
      payment_date: new Date().toISOString(),
      received_by_name: "Mock Cashier",
      payment_mode: modeClean,
      notes: notes || ""
    });

    const pending = p.total_bill - p.paid_amount - (p.concession || 0);
    if (pending <= 0.01) {
      p.payment_status = (p.concession || 0) >= p.total_bill - 0.01 ? "FULL_CONCESSION" : "FULLY_PAID";
    } else if (p.paid_amount > 0.01 || (p.concession || 0) > 0.01) {
      p.payment_status = "PARTIAL_PENDING";
    } else {
      p.payment_status = "CREDIT_PENDING";
    }

    const patientLabId = p.labId;
    const lab = state.labs.find(l => l.id === patientLabId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "cashier@abplus.in" : "cashier@abplus.in";

    let actionMsg = "";
    if (addPaid > 0 && addConcession > 0) {
      actionMsg = `Cashier received ₹${addPaid} payment & applied ₹${addConcession} concession (Mode: ${modeClean}) for ${p.name}`;
    } else if (addPaid > 0) {
      actionMsg = `Cashier received payment of ₹${addPaid} (Mode: ${modeClean}) for ${p.name}`;
    } else if (addConcession > 0) {
      actionMsg = `Cashier applied concession of ₹${addConcession} for ${p.name}`;
    }

    if (actionMsg) {
      state.logs.push({
        id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
        action: actionMsg,
        timestamp: new Date().toISOString(),
        user_email: loggedInEmail,
        lab_name: labName
      });
    }

    saveMockState(state);
    return p;
  },

  // PATCH /patients/:id/status
  async updatePatientStatus(patientId: string, status: "CREATED" | "COLLECTED" | "LAB_RECEIVED" | "COMPLETED" | "DELIVERED", additionalData?: { collected_by?: string }): Promise<PatientEntry> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/patients/${patientId}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...additionalData }),
      });
      const data = await res.json();
      return parsePatientEntry(data);
    }
    await delay(300);
    const state = getMockState();
    const idx = state.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) throw new Error("Patient not found");

    const oldStatus = state.patients[idx].status;
    state.patients[idx].status = status;

    if (additionalData?.collected_by) {
      state.patients[idx].collected_by = additionalData.collected_by;
    }

    let userMail = "doctor@abplus.in";
    if (status === "COMPLETED") userMail = "tech@abplus.in";

    const patientLabId = state.patients[idx].labId;
    const lab = state.labs.find(l => l.id === patientLabId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || userMail : userMail;

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Moved status of ${state.patients[idx].name} from ${oldStatus} to ${status}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return state.patients[idx];
  },

  // PATCH /patients/:id/ (to update general patient information)
  async updatePatient(patientId: string, updatedData: Partial<PatientEntry> & { referred_doctor_name?: string }): Promise<PatientEntry> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/patients/${patientId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to update patient profile.");
      }
      return parsePatientEntry(data);
    }
    await delay(300);
    const state = getMockState();
    const idx = state.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) throw new Error("Patient not found");

    const p = state.patients[idx];

    // Update simple fields
    if (updatedData.name !== undefined) p.name = updatedData.name;
    if (updatedData.age !== undefined) p.age = Number(updatedData.age);
    if (updatedData.gender !== undefined) p.gender = updatedData.gender;
    if (updatedData.phone !== undefined) p.phone = updatedData.phone;
    if (updatedData.tests !== undefined) p.tests = updatedData.tests;
    if (updatedData.total_bill !== undefined) p.total_bill = Number(updatedData.total_bill);
    
    // Update referred doctor fields
    if (updatedData.referred_doctor_id !== undefined) {
      p.referred_doctor_id = updatedData.referred_doctor_id || undefined;
      if (p.referred_doctor_id) {
        const doc = state.referredDoctors.find(d => d.id === p.referred_doctor_id);
        if (doc) {
          p.referred_doctor_name = doc.doctor_name;
        }
      }
    }
    
    if (updatedData.referred_doctor_name !== undefined) {
      const trimmedName = (updatedData.referred_doctor_name || "").trim();
      if (trimmedName && !p.referred_doctor_id) {
        // Look up or create doctor
        const existingDoc = state.referredDoctors.find(
          d => d.labId === p.labId && d.doctor_name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (existingDoc) {
          p.referred_doctor_id = existingDoc.id;
          p.referred_doctor_name = existingDoc.doctor_name;
        } else {
          // Dynamically create a mock referred doctor
          const labDocs = state.referredDoctors.filter(d => d.labId === p.labId);
          let nextNum = 1;
          if (labDocs.length > 0) {
            const nums = labDocs.map(d => {
              const match = d.id.match(/^REF(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            });
            nextNum = Math.max(...nums) + 1;
          }
          const newDocId = `REF${String(nextNum).padStart(3, '0')}`;
          state.referredDoctors.push({
            id: newDocId,
            doctor_name: trimmedName,
            hospital_name: "Direct Referral",
            phone: "",
            address: "",
            status: "Active",
            created_at: new Date().toISOString(),
            labId: p.labId
          });
          p.referred_doctor_id = newDocId;
          p.referred_doctor_name = trimmedName;
        }
      } else if (!trimmedName) {
        p.referred_doctor_id = undefined;
        p.referred_doctor_name = "";
      }
    }

    // Recalculate billing status if tests / total_bill updated
    const pending = p.total_bill - p.paid_amount - (p.concession || 0);
    if (pending <= 0.01) {
      p.payment_status = (p.concession || 0) >= p.total_bill - 0.01 ? "FULL_CONCESSION" : "FULLY_PAID";
    } else if (p.paid_amount > 0.01 || (p.concession || 0) > 0.01) {
      p.payment_status = "PARTIAL_PENDING";
    } else {
      p.payment_status = "CREDIT_PENDING";
    }

    const lab = state.labs.find(l => l.id === p.labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "tech@abplus.in" : "tech@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Updated patient profile: ${p.name} (ID: ${p.id})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    recalculateMockCommissionEntries(state, p);
    saveMockState(state);
    return p;
  },

  // PATCH /patients/:id/results
  async saveTestResults(patientId: string, results: Record<string, number>): Promise<PatientEntry> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/patients/${patientId}/results/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      return parsePatientEntry(data);
    }
    await delay(400);
    const state = getMockState();
    const idx = state.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) throw new Error("Patient not found");

    state.patients[idx].results = {
      ...state.patients[idx].results,
      ...results
    };
    state.patients[idx].status = "COMPLETED";

    const patientLabId = state.patients[idx].labId;
    const lab = state.labs.find(l => l.id === patientLabId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "tech@abplus.in" : "tech@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Technician entered test results for ${state.patients[idx].name}`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return state.patients[idx];
  },

  // GET /patients/:id
  async getPatientDetails(patientId: string): Promise<PatientEntry> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/patients/${patientId}/`);
      const data = await res.json();
      return parsePatientEntry(data);
    }
    await delay(200);
    const { patients } = getMockState();
    const pat = patients.find((p) => p.id === patientId);
    if (!pat) throw new Error("Patient not found");
    return pat;
  },

  // DELETE /patients/:id  (Collection Boy can delete own CREATED entries)
  async deletePatient(patientId: string): Promise<void> {
    if (!IS_MOCK) {
      await authFetch(`${API_URL}/patients/${patientId}/`, { method: "DELETE" });
      return;
    }
    await delay(300);
    const state = getMockState();
    const idx = state.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) throw new Error("Patient not found");

    const patientName = state.patients[idx].name;
    const patientLabId = state.patients[idx].labId;
    const lab = state.labs.find(l => l.id === patientLabId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "collection@abplus.in" : "collection@abplus.in";

    state.patients.splice(idx, 1);
    state.commissionEntries = (state.commissionEntries || []).filter(e => e.patientId !== patientId);

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Patient entry deleted: ${patientName} (ID: ${patientId})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
  },

  // GET /expenses
  async getExpenses(labId: string, date: string, createdBy?: string): Promise<Expense[]> {
    if (!IS_MOCK) {
      const params: Record<string, string> = { lab_id: labId, date };
      if (createdBy) params.created_by = createdBy;
      const q = new URLSearchParams(params);
      const res = await authFetch(`${API_URL}/expenses/?${q}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map(parseExpense);
    }
    await delay(200);
    const { expenses } = getMockState();
    return expenses.filter((e) => 
      e.labId === labId && 
      e.date === date && 
      (!createdBy || (e.created_by || "").toLowerCase() === createdBy.toLowerCase())
    );
  },

  // POST /expenses
  async addExpense(labId: string, expenseData: Omit<Expense, "id"> & { created_by?: string }): Promise<Expense> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/expenses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...expenseData, lab_id: labId }),
      });
      const data = await res.json();
      return parseExpense(data);
    }
    await delay(300);
    const state = getMockState();

    const newExp: Expense = {
      id: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      title: expenseData.title,
      amount: Number(expenseData.amount),
      note: expenseData.note || "",
      date: expenseData.date,
      labId,
      created_by: expenseData.created_by || "doctor@abplus.in"
    };

    state.expenses.push(newExp);

    const lab = state.labs.find(l => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || newExp.created_by || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Recorded overhead expense: ${newExp.title} (₹${newExp.amount})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return newExp;
  },

  // DELETE /expenses/:id
  async deleteExpense(labId: string, expenseId: string): Promise<void> {
    if (!IS_MOCK) {
      await authFetch(`${API_URL}/expenses/${expenseId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      return;
    }
    await delay(300);
    const state = getMockState();
    const exp = state.expenses.find(e => e.id === expenseId);
    if (!exp) return;

    state.expenses = state.expenses.filter(e => e.id !== expenseId);

    const lab = state.labs.find(l => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Deleted overhead expense: ${exp.title} (₹${exp.amount})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
  },

  // GET /collection-dashboard?date=&created_by=
  async getCollectionBoyDashboardStats(labId: string, date: string, createdBy: string): Promise<{
    total_patients: number;
    settled_patients: number;
    pending_patients: number;
    total_collected: number;
    pending_amount: number;
    concession_totals: number;
    total_expenses: number;
    today_expenses?: number;
    net_cash: number;
    settlement_status?: "PENDING" | "SETTLED" | "PENDING CASH";
    settlement_time?: string | null;
    settled_by_name?: string | null;
    net_cash_in_hand?: number;
    submitted_cash_today?: number;
    cash_not_submitted?: number;
    total_pending_receivables?: number;
    total_pending_patients?: number;
  }> {
    if (!IS_MOCK) {
      const q = new URLSearchParams({ lab_id: labId, date, created_by: createdBy });
      const res = await authFetch(`${API_URL}/collection-dashboard/?${q}`);
      const data = await res.json();
      return {
        total_patients: Number(data.total_patients),
        settled_patients: Number(data.settled_patients),
        pending_patients: Number(data.pending_patients),
        total_collected: Number(data.total_collected),
        pending_amount: Number(data.pending_amount),
        concession_totals: Number(data.concession_totals),
        total_expenses: Number(data.total_expenses),
        today_expenses: Number(data.today_expenses ?? 0),
        net_cash: Number(data.net_cash),
        settlement_status: data.settlement_status,
        settlement_time: data.settlement_time,
        settled_by_name: data.settled_by_name,
        net_cash_in_hand: Number(data.net_cash_in_hand ?? data.net_cash),
        submitted_cash_today: Number(data.submitted_cash_today ?? 0),
        cash_not_submitted: Number(data.cash_not_submitted ?? 0),
        total_pending_receivables: Number(data.total_pending_receivables ?? data.pending_amount),
        total_pending_patients: Number(data.total_pending_patients ?? data.pending_patients)
      };
    }
    await delay(300);
    const state = getMockState();
    const labPatients = state.patients.filter(p => 
      p.labId === labId && 
      p.created_at === date && 
      (p.collected_by || "").toLowerCase() === createdBy.toLowerCase()
    );
    const labExpenses = state.expenses.filter(e => 
      e.labId === labId && 
      e.date === date && 
      (e.created_by || "").toLowerCase() === createdBy.toLowerCase()
    );

    const total_patients = labPatients.length;
    const settled_patients = labPatients.filter(p => p.total_bill - p.paid_amount - (p.concession || 0) <= 0).length;
    const pending_patients = labPatients.filter(p => p.total_bill - p.paid_amount - (p.concession || 0) > 0).length;
    const total_collected = labPatients.reduce((sum, p) => sum + p.paid_amount, 0);
    const pending_amount = labPatients.reduce((sum, p) => sum + Math.max(0, p.total_bill - p.paid_amount - (p.concession || 0)), 0);
    const concession_totals = labPatients.reduce((sum, p) => sum + (p.concession || 0), 0);
    const total_expenses = labExpenses.reduce((sum, e) => sum + e.amount, 0);
    const net_cash = total_collected - total_expenses;

    let settled_amount = 0;
    let settlement_time: string | null = null;
    let settled_by_name: string | null = null;
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`abplus_mock_settlements_${labId}_${date}_${createdBy}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          settled_amount = parsed.amount_received || 0;
          settlement_time = parsed.settlement_time;
          settled_by_name = parsed.settled_by_name;
        } catch {}
      }
    }

    const net_cash_in_hand = Math.max(0, net_cash - settled_amount);
    const settlement_status: "PENDING" | "SETTLED" | "PENDING CASH" = 
      net_cash_in_hand > 0 ? "PENDING CASH" : "SETTLED";
    const submitted_cash_today = settled_amount;

    return {
      total_patients,
      settled_patients,
      pending_patients,
      total_collected,
      pending_amount,
      concession_totals,
      total_expenses,
      today_expenses: total_expenses,
      net_cash,
      settlement_status,
      settlement_time,
      settled_by_name,
      net_cash_in_hand,
      submitted_cash_today,
      cash_not_submitted: net_cash_in_hand, // mock value
      total_pending_receivables: pending_amount,
      total_pending_patients: pending_patients
    };
  },

  async settleCollectionBoy(
    labId: string,
    employeeId: string,
    data: {
      date: string;
      amount_collected: number;
      expenses: number;
      net_cash_expected: number;
      amount_received: number;
      notes: string;
    }
  ): Promise<{
    success: boolean;
    settlement_status: "SETTLED" | "PENDING CASH";
    settled_by_name: string;
    settlement_time: string;
  }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/employees/${employeeId}/settle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lab_id: labId, ...data }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to settle collection boy");
      }
      return res.json();
    }
    await delay(400);
    
    let settled_amount = data.amount_received;
    if (typeof window !== "undefined") {
      const state = getMockState();
      const boy = state.users.find(u => u.id === employeeId);
      const boyName = boy ? boy.username : employeeId;
      const key = `abplus_mock_settlements_${labId}_${data.date}_${boyName}`;
      const existing = localStorage.getItem(key);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          settled_amount = (parsed.amount_received || 0) + data.amount_received;
        } catch {}
      }
      const mockSettlement = {
        success: true,
        settlement_status: "SETTLED" as const,
        settled_by_name: "Mock Cashier",
        settlement_time: new Date().toISOString(),
        amount_received: settled_amount,
      };
      localStorage.setItem(key, JSON.stringify(mockSettlement));
      return mockSettlement;
    }
    return {
      success: true,
      settlement_status: "SETTLED",
      settled_by_name: "Mock Cashier",
      settlement_time: new Date().toISOString(),
    };
  },

  async submitDailyCloseout(labId: string, data: DailyCloseout): Promise<DailyCloseout> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/closeouts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lab_id: labId, ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit closeout");
      }
      return res.json();
    }
    await delay(300);
    if (typeof window !== "undefined") {
      const key = `abplus_mock_closeout_${labId}_${data.date}`;
      const closeoutRecord = {
        ...data,
        id: `CLO-${Math.floor(1000 + Math.random() * 9000)}`,
        cashier_name: "Mock Cashier",
        submitted_at: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(closeoutRecord));
      return closeoutRecord;
    }
    return data;
  },

  async getDailyCloseout(labId: string, date: string): Promise<DailyCloseout | null> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/closeouts/?lab_id=${labId}&date=${date}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      return null;
    }
    await delay(200);
    if (typeof window !== "undefined") {
      const key = `abplus_mock_closeout_${labId}_${date}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    return null;
  },

  async getCashierLabSettlements(labId: string, date?: string): Promise<CashierLabSettlement[]> {
    if (!IS_MOCK) {
      let url = `${API_URL}/cashier-lab-settlements/?lab_id=${labId}`;
      if (date) {
        url += `&date=${date}`;
      }
      const res = await authFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results || []);
    }
    await delay(200);
    let cashier_lab_settlements: CashierLabSettlement[] = [];
    if (typeof window !== "undefined") {
      const settlementsRaw = localStorage.getItem("abplus_mock_cashier_lab_settlements");
      if (settlementsRaw) {
        try {
          cashier_lab_settlements = JSON.parse(settlementsRaw);
        } catch {}
      }
    }
    let filtered = cashier_lab_settlements.filter(s => s.lab_id === labId);
    if (date) {
      filtered = filtered.filter(s => s.submitted_at?.split("T")[0] === date);
    }
    return filtered;
  },

  async submitCashierLabSettlement(labId: string, remarks: string): Promise<CashierLabSettlement> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/cashier-lab-settlements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit settlement");
      }
      return res.json();
    }
    await delay(400);
    const stats = await this.getLabDashboardStats(labId, new Date().toISOString().split("T")[0]);
    const settlement_amount = stats.cashier_pending || 0;
    
    const { expenses } = getMockState();
    const dateToday = new Date().toISOString().split("T")[0];
    const dailyExpenses = expenses.filter((e) => e.labId === labId && e.date === dateToday);
    const expenses_amount = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

    const newSettlement: CashierLabSettlement = {
      id: `CLS-${Math.floor(1000 + Math.random() * 9000)}`,
      lab_id: labId,
      cashier_user_id: "USR-MOCK-CASHIER",
      cashier_name: "Mock Cashier",
      settlement_amount,
      expenses_amount,
      remarks,
      submitted_at: new Date().toISOString()
    };

    let cashier_lab_settlements: CashierLabSettlement[] = [];
    if (typeof window !== "undefined") {
      const settlementsRaw = localStorage.getItem("abplus_mock_cashier_lab_settlements");
      if (settlementsRaw) {
        try {
          cashier_lab_settlements = JSON.parse(settlementsRaw);
        } catch {}
      }
      cashier_lab_settlements.push(newSettlement);
      localStorage.setItem("abplus_mock_cashier_lab_settlements", JSON.stringify(cashier_lab_settlements));

      const state = getMockState();
      const lab = state.labs.find(l => l.id === labId);
      const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
      state.logs.push({
        id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
        action: `Cashier Mock Cashier submitted rolling settlement to Lab Admin. Amount: ₹${settlement_amount.toFixed(2)}, Expenses: ₹${expenses_amount.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        user_email: "cashier@abplus.in",
        lab_name: labName
      });
      saveMockState(state);
    }

    return newSettlement;
  },

  // GET /activity-logs (lab specific)
  async getLabActivityLogs(labId: string): Promise<ActivityLog[]> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/activity-logs/?lab_id=${labId}`);
      return res.json();
    }
    await delay(200);
    const { logs } = getMockState();
    // Return all logs matching the lab context, sorted chronologically desc
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // GET /settings
  async getLabSettings(labId: string): Promise<LabSettings> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/settings/?lab_id=${labId}`);
      return res.json();
    }
    await delay(200);
    const { settings } = getMockState();
    return settings[labId] || {
      name: "AB+ Diagnostic Laboratory",
      address: "New Delhi, India",
      phone: "+91 99999 88888",
      logo_base64: "",
      letterhead_base64: ""
    };
  },

  // PUT /settings
  async updateLabSettings(labId: string, settingsData: LabSettings): Promise<LabSettings> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/settings/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settingsData, lab_id: labId }),
      });
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    state.settings[labId] = settingsData;

    const lab = state.labs.find(l => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Updated diagnostic lab settings and letterhead branding`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return settingsData;
  },

  // Referred Doctor API Methods
  async getReferredDoctors(labId: string, search?: string, status?: string): Promise<ReferredDoctor[]> {
    if (!IS_MOCK) {
      let url = `${API_URL}/referred-doctors/?lab_id=${labId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status && status !== 'all') url += `&status=${encodeURIComponent(status)}`;
      const res = await authFetch(url);
      return res.json();
    }
    await delay(200);
    const { referredDoctors } = getMockState();
    let filtered = referredDoctors.filter(doc => doc.labId === labId);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.doctor_name.toLowerCase().includes(s) || 
        doc.hospital_name.toLowerCase().includes(s) || 
        doc.phone.includes(s) || 
        doc.id.toLowerCase().includes(s)
      );
    }
    if (status && status !== 'all') {
      filtered = filtered.filter(doc => doc.status === status);
    }
    return filtered;
  },

  async searchReferredDoctors(labId: string, query: string, page = 1, limit = 10): Promise<{ results: ReferredDoctor[]; count: number }> {
    if (!IS_MOCK) {
      const q = new URLSearchParams({
        lab_id: labId,
        q: query,
        page: String(page),
        limit: String(limit),
      });
      const res = await authFetch(`${API_URL}/referred-doctors/search/?${q}`);
      return res.json();
    }
    await delay(200);
    const { referredDoctors } = getMockState();
    // Search active referred doctors belonging to this lab
    const excludePatterns = ["self / direct", "self/direct", "no referral", "self referral"];
    let filtered = referredDoctors.filter(doc => {
      if (doc.labId !== labId || doc.status !== "Active") return false;
      const lowerName = doc.doctor_name.toLowerCase();
      return !excludePatterns.some(p => lowerName.includes(p));
    });
    if (query) {
      const s = query.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.doctor_name.toLowerCase().includes(s)
      );
    }
    const total = filtered.length;
    const offset = (page - 1) * limit;
    const results = filtered.slice(offset, offset + limit);
    return { results, count: total };
  },

  async createReferredDoctor(labId: string, doctorData: Omit<ReferredDoctor, 'id' | 'created_at'>): Promise<ReferredDoctor> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/referred-doctors/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...doctorData, lab_id: labId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || Object.values(errorData).flat().join(", ") || "Failed to register referring doctor.");
      }
      return res.json();
    }
    await delay(300);
    const state = getMockState();

    const exists = state.referredDoctors.some(
      d => d.labId === labId && 
      d.doctor_name.toLowerCase().trim() === doctorData.doctor_name.toLowerCase().trim() && 
      d.hospital_name.toLowerCase().trim() === doctorData.hospital_name.toLowerCase().trim()
    );
    if (exists) {
      throw new Error("A referred doctor with this name and hospital clinic already exists in this lab.");
    }
    
    // Auto-generate ID: REF001, REF002...
    const labDocs = state.referredDoctors.filter(d => d.labId === labId);
    let nextNum = 1;
    if (labDocs.length > 0) {
      const nums = labDocs.map(d => {
        const match = d.id.match(/^REF(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const id = `REF${String(nextNum).padStart(3, '0')}`;

    const newDoc: ReferredDoctor = {
      id,
      doctor_name: doctorData.doctor_name,
      hospital_name: doctorData.hospital_name,
      phone: doctorData.phone,
      address: doctorData.address || "",
      status: doctorData.status || "Active",
      created_at: new Date().toISOString(),
      labId
    };

    state.referredDoctors.push(newDoc);

    const lab = state.labs.find(l => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Created referred doctor: ${newDoc.doctor_name} (${newDoc.id})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return newDoc;
  },

  async updateReferredDoctor(labId: string, id: string, doctorData: Partial<ReferredDoctor>): Promise<ReferredDoctor> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/referred-doctors/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doctorData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || Object.values(errorData).flat().join(", ") || "Failed to update referring doctor.");
      }
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    const docIndex = state.referredDoctors.findIndex(d => d.id === id && d.labId === labId);
    if (docIndex === -1) {
      throw new Error("Referred doctor not found");
    }

    const oldDoc = state.referredDoctors[docIndex];

    const exists = state.referredDoctors.some(
      d => d.labId === labId && d.id !== id &&
      d.doctor_name.toLowerCase().trim() === (doctorData.doctor_name || oldDoc.doctor_name).toLowerCase().trim() && 
      d.hospital_name.toLowerCase().trim() === (doctorData.hospital_name || oldDoc.hospital_name).toLowerCase().trim()
    );
    if (exists) {
      throw new Error("A referred doctor with this name and hospital clinic already exists in this lab.");
    }
    const updatedDoc = {
      ...oldDoc,
      ...doctorData
    };

    state.referredDoctors[docIndex] = updatedDoc;

    const lab = state.labs.find(l => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    let logAction = `Updated referred doctor: ${updatedDoc.doctor_name} (${updatedDoc.id})`;
    if (doctorData.status && doctorData.status !== oldDoc.status) {
      logAction = `${doctorData.status === 'Inactive' ? 'Disabled' : 'Enabled'} referred doctor: ${updatedDoc.doctor_name} (${updatedDoc.id})`;
    }

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: logAction,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });

    saveMockState(state);
    return updatedDoc;
  },

  async toggleReferredDoctorStatus(labId: string, id: string): Promise<ReferredDoctor> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/referred-doctors/${id}/toggle-status/`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || Object.values(errorData).flat().join(", ") || "Failed to toggle status.");
      }
      return res.json();
    }
    const state = getMockState();
    const doc = state.referredDoctors.find(d => d.id === id && d.labId === labId);
    if (!doc) throw new Error("Referred doctor not found");
    const newStatus = doc.status === "Active" ? "Inactive" : "Active";
    return this.updateReferredDoctor(labId, id, { status: newStatus });
  },

  async deleteReferredDoctor(labId: string, id: string): Promise<boolean> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/referred-doctors/${id}/`, {
        method: "DELETE",
      });
      return res.ok;
    }
    await delay(300);
    const state = getMockState();
    const docIdx = state.referredDoctors.findIndex(d => d.id === id && d.labId === labId);
    if (docIdx === -1) return false;
    
    const doc = state.referredDoctors[docIdx];
    state.referredDoctors.splice(docIdx, 1);
    
    const lab = state.labs.find(l => l.id === labId);
    const labName = lab ? lab.name : "AB+ Diagnostic Laboratory";
    const loggedInEmail = typeof window !== "undefined" ? localStorage.getItem("abplus_logged_in_email") || "doctor@abplus.in" : "doctor@abplus.in";

    state.logs.push({
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      action: `Soft deleted referred doctor: ${doc.doctor_name} (${doc.id})`,
      timestamp: new Date().toISOString(),
      user_email: loggedInEmail,
      lab_name: labName
    });
    
    saveMockState(state);
    return true;
  },

  async getReferredDoctorStats(labId: string, id: string): Promise<{
    total_patients: number;
    total_revenue: number;
    first_referral_date: string | null;
    last_referral_date: string | null;
    patients_this_month: number;
    patients_this_year: number;
  }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/referred-doctors/${id}/stats/`);
      if (!res.ok) {
        throw new Error("Failed to load doctor statistics.");
      }
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    const patients = state.patients.filter(p => p.labId === labId && p.referred_doctor_id === id);
    
    const total_patients = patients.length;
    const total_revenue = patients.reduce((sum, p) => sum + (p.total_bill || 0), 0);
    
    const sorted = [...patients].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const first_referral_date = sorted.length > 0 ? sorted[0].created_at.split('T')[0] : null;
    const last_referral_date = sorted.length > 0 ? sorted[sorted.length - 1].created_at.split('T')[0] : null;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const patients_this_month = patients.filter(p => {
      const d = new Date(p.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    
    const patients_this_year = patients.filter(p => {
      const d = new Date(p.created_at);
      return d.getFullYear() === currentYear;
    }).length;
    
    return {
      total_patients,
      total_revenue,
      first_referral_date,
      last_referral_date,
      patients_this_month,
      patients_this_year
    };
  },

  async getCommissionDashboardStats(labId: string): Promise<{
    total_earned: number;
    doctors_count: number;
    pending_commission: number;
    top_doctor: {
      id: string;
      name: string;
      hospital: string;
      total_commission: number;
      patient_count: number;
    } | null;
  }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/commission/stats/?lab_id=${labId}`);
      if (!res.ok) throw new Error("Failed to load commission statistics.");
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    const entries = (state.commissionEntries || []).filter(e => e.labId === labId);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthEntries = entries.filter(e => {
      const d = new Date(e.entry_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const total_earned = monthEntries.reduce((sum, e) => sum + e.commission_amount, 0);
    const doctors_count = new Set(monthEntries.map(e => e.doctorId)).size;
    const pending_commission = entries.filter(e => !e.is_paid).reduce((sum, e) => sum + e.commission_amount, 0);

    const doctorStats: Record<string, { id: string; name: string; hospital: string; total_commission: number; patient_count: number; patients: Set<string> }> = {};
    monthEntries.forEach(e => {
      if (!doctorStats[e.doctorId]) {
        doctorStats[e.doctorId] = {
          id: e.doctorId,
          name: e.doctorName || "Unknown Doctor",
          hospital: e.hospitalName || "Hospital",
          total_commission: 0,
          patient_count: 0,
          patients: new Set()
        };
      }
      doctorStats[e.doctorId].total_commission += e.commission_amount;
      doctorStats[e.doctorId].patients.add(e.patientId);
    });

    let top_doctor = null;
    let maxComm = -1;
    Object.values(doctorStats).forEach(ds => {
      ds.patient_count = ds.patients.size;
      if (ds.total_commission > maxComm) {
        maxComm = ds.total_commission;
        top_doctor = {
          id: ds.id,
          name: ds.name,
          hospital: ds.hospital,
          total_commission: ds.total_commission,
          patient_count: ds.patient_count
        };
      }
    });

    return {
      total_earned,
      doctors_count,
      pending_commission,
      top_doctor
    };
  },

  async getCommissionReports(labId: string, month: number, year: number, doctorId?: string): Promise<Array<{
    doctor_id: string;
    doctor_name: string;
    hospital_name: string;
    patient_count: number;
    total_revenue: number;
    total_commission: number;
    unpaid_commission: number;
    paid_commission: number;
  }>> {
    if (!IS_MOCK) {
      let url = `${API_URL}/commission/reports/?lab_id=${labId}&month=${month}&year=${year}`;
      if (doctorId) url += `&doctor_id=${doctorId}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to load commission reports.");
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    let entries = (state.commissionEntries || []).filter(e => {
      const d = new Date(e.entry_date);
      return e.labId === labId && (d.getMonth() + 1) === month && d.getFullYear() === year;
    });

    if (doctorId) {
      entries = entries.filter(e => e.doctorId === doctorId);
    }

    const doctorGroups: Record<string, {
      doctor_id: string;
      doctor_name: string;
      hospital_name: string;
      patients: Set<string>;
      total_revenue: number;
      total_commission: number;
      unpaid_commission: number;
      paid_commission: number;
    }> = {};

    entries.forEach(e => {
      if (!doctorGroups[e.doctorId]) {
        doctorGroups[e.doctorId] = {
          doctor_id: e.doctorId,
          doctor_name: e.doctorName || "Unknown Doctor",
          hospital_name: e.hospitalName || "Hospital",
          patients: new Set(),
          total_revenue: 0,
          total_commission: 0,
          unpaid_commission: 0,
          paid_commission: 0
        };
      }
      const group = doctorGroups[e.doctorId];
      group.patients.add(e.patientId);
      group.total_revenue += e.testPrice;
      group.total_commission += e.commission_amount;
      if (e.is_paid) {
        group.paid_commission += e.commission_amount;
      } else {
        group.unpaid_commission += e.commission_amount;
      }
    });

    return Object.values(doctorGroups).map(g => ({
      doctor_id: g.doctor_id,
      doctor_name: g.doctor_name,
      hospital_name: g.hospital_name,
      patient_count: g.patients.size,
      total_revenue: g.total_revenue,
      total_commission: g.total_commission,
      unpaid_commission: g.unpaid_commission,
      paid_commission: g.paid_commission
    })).sort((a, b) => b.total_commission - a.total_commission);
  },

  async settleDoctorCommission(labId: string, doctorId: string, month: number, year: number): Promise<{
    message: string;
    settled_count: number;
  }> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/commission/settle/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lab_id: labId, doctor_id: doctorId, month, year })
      });
      if (!res.ok) throw new Error("Failed to settle commission.");
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    let settled_count = 0;
    (state.commissionEntries || []).forEach(e => {
      const d = new Date(e.entry_date);
      if (e.labId === labId && e.doctorId === doctorId && (d.getMonth() + 1) === month && d.getFullYear() === year && !e.is_paid) {
        e.is_paid = true;
        settled_count++;
      }
    });

    if (settled_count > 0) {
      saveMockState(state);
    }
    return {
      message: `Successfully settled ${settled_count} commission entries.`,
      settled_count
    };
  },

  async getDoctorCommissionDetail(labId: string, doctorId: string, month?: number, year?: number): Promise<{
    doctor_id: string;
    doctor_name: string;
    hospital_name: string;
    summary: {
      total_revenue: number;
      total_commission: number;
      unpaid_commission: number;
      paid_commission: number;
      patient_count: number;
    };
    entries: Array<{
      id: string;
      patient_id: string;
      patient_name: string;
      patient_code: string;
      test_id: string;
      test_name: string;
      test_price: number;
      commission_percentage: number;
      commission_amount: number;
      entry_date: string;
      is_paid: boolean;
      created_at: string;
    }>;
  }> {
    if (!IS_MOCK) {
      let url = `${API_URL}/commission/doctor/${doctorId}/?lab_id=${labId}`;
      if (month && year) url += `&month=${month}&year=${year}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to load doctor commission details.");
      return res.json();
    }
    await delay(300);
    const state = getMockState();
    const doctor = state.referredDoctors.find(d => d.id === doctorId);
    if (!doctor) throw new Error("Doctor not found");

    let filtered = (state.commissionEntries || []).filter(e => e.labId === labId && e.doctorId === doctorId);
    if (month && year) {
      filtered = filtered.filter(e => {
        const d = new Date(e.entry_date);
        return (d.getMonth() + 1) === month && d.getFullYear() === year;
      });
    }

    const entries = filtered.map(e => ({
      id: e.id,
      patient_id: e.patientId,
      patient_name: e.patientName,
      patient_code: e.patientCode,
      test_id: e.testId,
      test_name: e.testName,
      test_price: e.testPrice,
      commission_percentage: e.commission_percentage,
      commission_amount: e.commission_amount,
      entry_date: e.entry_date,
      is_paid: e.is_paid,
      created_at: e.created_at
    }));

    const total_revenue = entries.reduce((sum, e) => sum + e.test_price, 0);
    const total_commission = entries.reduce((sum, e) => sum + e.commission_amount, 0);
    const unpaid_commission = entries.filter(e => !e.is_paid).reduce((sum, e) => sum + e.commission_amount, 0);
    const paid_commission = entries.filter(e => e.is_paid).reduce((sum, e) => sum + e.commission_amount, 0);
    const patient_count = new Set(entries.map(e => e.patient_id)).size;

    return {
      doctor_id: doctorId,
      doctor_name: doctor.doctor_name,
      hospital_name: doctor.hospital_name,
      summary: {
        total_revenue,
        total_commission,
        unpaid_commission,
        paid_commission,
        patient_count
      },
      entries
    };
  },

  async getCommissionReportPreview(labId: string, params: {
    type: 'consolidated' | 'doctor_wise';
    from_date: string;
    to_date: string;
    doctor_id?: string;
    include_patients?: boolean;
  }): Promise<any> {
    if (!IS_MOCK) {
      const queryParams = new URLSearchParams({
        lab_id: labId,
        type: params.type,
        from_date: params.from_date,
        to_date: params.to_date,
      });
      if (params.doctor_id) queryParams.set('doctor_id', params.doctor_id);
      if (params.include_patients) queryParams.set('include_patients', 'true');
      const res = await authFetch(`${API_URL}/commission/report-preview/?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load commission report preview.');
      return res.json();
    }
    // Mock fallback - aggregate from local commission entries
    await delay(400);
    return { report_type: params.type, from_date: params.from_date, to_date: params.to_date, lab_name: 'Demo Lab', summary: { total_doctors: 0, total_patients: 0, total_billing: 0, total_commission: 0 }, records: [] };
  },

  getCommissionExportPDFUrl(labId: string, params: {
    type: 'consolidated' | 'doctor_wise';
    from_date: string;
    to_date: string;
    doctor_id?: string;
    include_patients?: boolean;
  }): string {
    const queryParams = new URLSearchParams({
      lab_id: labId,
      type: params.type,
      from_date: params.from_date,
      to_date: params.to_date,
    });
    if (params.doctor_id) queryParams.set('doctor_id', params.doctor_id);
    if (params.include_patients) queryParams.set('include_patients', 'true');
    return `${API_URL}/commission/export-pdf/?${queryParams.toString()}`;
  },

  getCommissionExportExcelUrl(labId: string, params: {
    type: 'consolidated' | 'doctor_wise';
    from_date: string;
    to_date: string;
    doctor_id?: string;
    include_patients?: boolean;
  }): string {
    const queryParams = new URLSearchParams({
      lab_id: labId,
      type: params.type,
      from_date: params.from_date,
      to_date: params.to_date,
    });
    if (params.doctor_id) queryParams.set('doctor_id', params.doctor_id);
    if (params.include_patients) queryParams.set('include_patients', 'true');
    return `${API_URL}/commission/export-excel/?${queryParams.toString()}`;
  },

  async getInformativeReportsList(): Promise<any[]> {
    if (!IS_MOCK) {
      const res = await authFetch(`${API_URL}/informative-reports/`);
      if (!res.ok) throw new Error('Failed to load reports list.');
      return res.json();
    }
    return [];
  },

  async getInformativeReportPreview(labId: string, reportId: string, params: any): Promise<any> {
    if (!IS_MOCK) {
      const queryParams = new URLSearchParams({
        lab_id: labId,
        report_id: reportId,
        ...params
      });
      const res = await authFetch(`${API_URL}/informative-reports/preview/?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load report preview.');
      return res.json();
    }
    return { records: [], summary: {}, lab_name: 'Demo Lab' };
  },

  getInformativeReportExportUrl(labId: string, reportId: string, format: 'pdf' | 'excel', params: any): string {
    const queryParams = new URLSearchParams({
      lab_id: labId,
      report_id: reportId,
      format,
      ...params
    });
    return `${API_URL}/informative-reports/export/?${queryParams.toString()}`;
  }
};

