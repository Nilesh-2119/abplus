"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "../services/api";

const NAV_LINKS = ["Features", "Workflow", "Dashboard", "Contact"];

const FEATURES = [
  { icon: "👥", title: "Multi-user Workflow", desc: "Collection boys, cashiers, and technicians work in parallel with real-time sync.", accent: "#0ea5e9" },
  { icon: "🧬", title: "Smart Patient Entry", desc: "Fast patient registration with auto-fill, barcode support, and smart search.", accent: "#6366f1" },
  { icon: "🔬", title: "Technician Dashboard", desc: "Dedicated panel showing pending samples, test queue, and priority flags.", accent: "#10b981" },
  { icon: "📄", title: "Smart PDF Reports", desc: "Auto-generated, branded PDF reports ready for instant download.", accent: "#f59e0b" },
  { icon: "🏛️", title: "Multi-lab Architecture", desc: "Manage multiple branches from a single admin interface.", accent: "#0ea5e9" },
  { icon: "🔐", title: "Role-based Access", desc: "Granular permissions for every role. No unauthorized access ever.", accent: "#ef4444" },
  { icon: "📊", title: "Modern Dashboard", desc: "Real-time analytics, revenue tracking, and daily lab overview.", accent: "#6366f1" },
  { icon: "📋", title: "Audit Logs", desc: "Every action tracked. Full traceability for compliance and review.", accent: "#10b981" },
  { icon: "☁️", title: "Cloud-based System", desc: "Access from anywhere. Automatic backups. Zero IT overhead.", accent: "#0ea5e9" },
];

const WORKFLOW = [
  { role: "Collection Boy", icon: "🚶", color: "#0ea5e9", bg: "#e0f2fe", desc: "Collects samples, assigns barcodes, logs collection in real time.", step: "01" },
  { role: "Cashier", icon: "💳", color: "#6366f1", bg: "#ede9fe", desc: "Processes payments, generates billing receipts, marks samples ready.", step: "02" },
  { role: "Technician", icon: "🔬", color: "#10b981", bg: "#d1fae5", desc: "Receives queued samples, enters results, validates reports.", step: "03" },
  { role: "Report Ready", icon: "📄", color: "#f59e0b", bg: "#fef3c7", desc: "System auto-generates branded PDF reports, delivers via WhatsApp.", step: "04" },
];

const STATS = [
  { label: "Faster Report Generation", value: "80", suffix: "%", color: "#0ea5e9" },
  { label: "Reduction in Manual Work", value: "60", suffix: "%", color: "#6366f1" },
  { label: "Concurrent Users", value: "50", suffix: "+", color: "#10b981" },
  { label: "Labs Onboarded", value: "120", suffix: "+", color: "#f59e0b" },
];

const TESTIMONIALS = [
  { name: "Dr. Rajesh Sharma", role: "Lab Director, Pune Diagnostics", avatar: "RS", color: "#0ea5e9", bg: "#e0f2fe", text: "AB+ transformed our lab. The workflow is so clean — collection boys submit, cashier bills, and technicians just see a queue. Reports are ready in minutes." },
  { name: "Dr. Priya Mehta", role: "Pathologist, MediCare Labs, Mumbai", avatar: "PM", color: "#6366f1", bg: "#ede9fe", text: "We manage 3 branches from one dashboard. The multi-tenant system is seamless. My staff learned it in a day — the UI is that intuitive." },
  { name: "Ankit Joshi", role: "Lab Manager, Nashik Health Centre", avatar: "AJ", color: "#10b981", bg: "#d1fae5", text: "The PDF reports look incredibly professional. Patients are impressed. Our billing errors dropped to zero after we switched to AB+." },
];

const DASHBOARDS = [
  { title: "Admin Overview", color: "#0ea5e9", bg: "#f0f9ff", icon: "📊", items: ["Revenue ₹1,24,500", "Tests Today: 342", "Pending: 28", "Staff Active: 12"] },
  { title: "Technician Panel", color: "#10b981", bg: "#f0fdf4", icon: "🔬", items: ["Queue: 18 samples", "CBC — Pending", "LFT — Processing", "KFT — Done ✓"] },
  { title: "Cashier Screen", color: "#6366f1", bg: "#f5f3ff", icon: "💳", items: ["Billed Today: ₹82,200", "Unpaid: 3", "Receipts: 124", "Pending Samples: 7"] },
  { title: "Report Screen", color: "#f59e0b", bg: "#fffbeb", icon: "📄", items: ["Ready: 89 reports", "Sent via WhatsApp: 76", "Pending Sign: 13", "Downloads: 201"] },
];

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * parseInt(target)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function FadeUp({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView(0.07);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(22px)", transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ stat, animate }) {
  const count = useCountUp(stat.value, 1800, animate);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "28px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", transition: "transform 0.25s, box-shadow 0.25s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)"; }}
    >
      <div style={{ fontSize: 44, fontWeight: 800, color: stat.color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{animate ? count : 0}{stat.suffix}</div>
      <div style={{ color: "#64748b", fontSize: 13, marginTop: 10, fontWeight: 500, lineHeight: 1.5 }}>{stat.label}</div>
    </div>
  );
}

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [statsRef, statsInView] = useInView(0.3);
  
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const [staffLabCode, setStaffLabCode] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [changePasswordUser, setChangePasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f8fafc", color: "#0f172a", minHeight: "100vh", overflowX: "hidden" }}>

      {/* NAVBAR */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:60, padding:"0 clamp(1rem, 4vw, 2.5rem)", display:"flex", alignItems:"center", justifyContent:"space-between", background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.85)", backdropFilter:"blur(16px)", borderBottom: scrolled ? "1px solid #e2e8f0" : "1px solid transparent", transition:"all .3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff" }}>A+</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:"#0f172a", letterSpacing:"-0.02em" }}>AB<span style={{ color:"#0ea5e9" }}>+</span></span>
        </div>
        <div className="nav-links">
          {NAV_LINKS.map(l => <a key={l} href={`#${l.toLowerCase()}`} className="nl">{l}</a>)}
        </div>
        <div className="nav-actions">
          <button className="gb" style={{ padding:"8px 20px" }} onClick={() => setLoginOpen(true)}>Login</button>
          <button className="pb" style={{ padding:"8px 20px" }}>Book Demo</button>
        </div>
        <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        {NAV_LINKS.map(l => <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMobileOpen(false)}>{l}</a>)}
        <div className="mobile-menu-actions">
          <button className="gb" style={{ padding:"10px 20px" }} onClick={() => { setMobileOpen(false); setLoginOpen(true); }}>Login</button>
          <button className="pb" style={{ padding:"10px 20px" }}>Book Demo</button>
        </div>
      </div>

      {/* HERO */}
      <section style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"120px 2rem 80px", background:"linear-gradient(160deg,#f0f9ff 0%,#fafafa 55%,#f5f3ff 100%)", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(#cbd5e180 1px,transparent 1px)", backgroundSize:"30px 30px", pointerEvents:"none" }} />

        <FadeUp delay={0}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#fff", border:"1px solid #bae6fd", borderRadius:100, padding:"5px 14px", marginBottom:28, fontSize:13, color:"#0284c7", fontWeight:600, boxShadow:"0 2px 10px rgba(14,165,233,.1)" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#0ea5e9", display:"inline-block", animation:"pdot 2s ease-in-out infinite" }} />
            Now live for Indian pathology labs
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(2.2rem,5.5vw,3.8rem)", fontWeight:800, lineHeight:1.1, letterSpacing:"-0.03em", maxWidth:740, margin:"0 auto 20px", color:"#0f172a" }}>
            Manage Your Pathology Lab <span style={{ color:"#0ea5e9" }}>Smarter</span> with AB+
          </h1>
        </FadeUp>

        <FadeUp delay={0.18}>
          <p style={{ color:"#64748b", fontSize:"clamp(.95rem,1.8vw,1.1rem)", maxWidth:520, margin:"0 auto 36px", lineHeight:1.75 }}>
            Patient management, technician workflow, billing, and smart report generation — all in one clean platform built for Indian diagnostic labs.
          </p>
        </FadeUp>

        <FadeUp delay={0.26}>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="pb" style={{ padding:"13px 30px", fontSize:15 }}>Book a Demo →</button>
            <button className="gb" style={{ padding:"13px 30px", fontSize:15 }}>Get Started Free</button>
          </div>
        </FadeUp>

        {/* Dashboard mockup */}
        <FadeUp delay={0.42} style={{ width:"100%", maxWidth:840, margin:"56px auto 0", position:"relative", zIndex:1, padding:"0 1rem" }}>
          <div style={{ borderRadius:16, overflow:"hidden", boxShadow:"0 30px 80px rgba(15,23,42,.14), 0 0 0 1px rgba(15,23,42,.07)", animation:"float 7s ease-in-out infinite" }}>
            {/* Browser bar */}
            <div style={{ background:"#f1f5f9", borderBottom:"1px solid #e2e8f0", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ display:"flex", gap:5 }}>{["#fc625d","#fdbc40","#35cd4b"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}</div>
              <div style={{ background:"#e2e8f0", borderRadius:6, padding:"3px 44px", fontSize:11, color:"#94a3b8", margin:"0 auto" }}>app.abplus.in</div>
            </div>
            {/* App */}
            <div className="mockup-layout" style={{ background:"#fff" }}>
              <div className="mockup-sidebar">
                <div style={{ fontSize:10, fontWeight:700, color:"#cbd5e1", letterSpacing:"0.1em", padding:"4px 10px", marginBottom:4 }}>MENU</div>
                {[["📊","Dashboard",true],["👤","Patients",false],["🔬","Tests",false],["📄","Reports",false],["💳","Billing",false],["👥","Staff",false]].map(([ic,label,active]) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, background:active?"#e0f2fe":"transparent", color:active?"#0284c7":"#94a3b8", fontSize:12, fontWeight:active?600:400, cursor:"pointer" }}>
                    <span style={{ fontSize:13 }}>{ic}</span>{label}
                  </div>
                ))}
              </div>
              <div style={{ padding:"18px", display:"flex", flexDirection:"column", gap:12 }}>
                <div className="grid-mockup-stats">
                  {[["Tests Today","342","↑ 12%","#0ea5e9","#f0f9ff"],["Revenue","₹1.2L","↑ 8%","#6366f1","#f5f3ff"],["Pending","28","Active","#10b981","#f0fdf4"],["Staff","12","Online","#f59e0b","#fffbeb"]].map(([label,val,change,col,bg]) => (
                    <div key={label} style={{ background:bg, borderRadius:10, padding:"10px 12px" }}>
                      <div style={{ fontSize:10, color:"#94a3b8", marginBottom:3, fontWeight:500 }}>{label}</div>
                      <div style={{ fontSize:18, fontWeight:800, color:col, fontFamily:"'Syne',sans-serif" }}>{val}</div>
                      <div style={{ fontSize:10, color:col, marginTop:2, fontWeight:600 }}>{change}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", overflow:"hidden" }}>
                  <div style={{ padding:"9px 14px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Recent Patients</span>
                    <span style={{ fontSize:11, color:"#0ea5e9", cursor:"pointer" }}>View all →</span>
                  </div>
                  {[["Rohan Patil","CBC + LFT","Processing","#f59e0b"],["Anita Desai","Blood Sugar","Ready","#10b981"],["Suresh Kumar","KFT Panel","Pending","#94a3b8"],["Meena Shah","Thyroid","Ready","#10b981"]].map(([name,test,status,col]) => (
                    <div key={name} className="grid-mockup-table" style={{ padding:"7px 14px", borderBottom:"1px solid #f1f5f9", alignItems:"center" }}>
                      <div style={{ fontSize:12, color:"#374151", fontWeight:500 }}>{name}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{test}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:col }}>{status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating chips */}
          <div className="float-chip float-chip-left">
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 16px", boxShadow:"0 8px 24px rgba(0,0,0,.09)", minWidth:148 }}>
              <div style={{ fontSize:10, color:"#94a3b8", marginBottom:4, fontWeight:500 }}>Tests Completed</div>
              <div style={{ fontSize:20, fontWeight:800, color:"#0ea5e9", fontFamily:"'Syne',sans-serif" }}>342</div>
              <div style={{ fontSize:10, color:"#10b981", marginTop:2, fontWeight:600 }}>↑ 12% today</div>
            </div>
          </div>
          <div className="float-chip float-chip-right">
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 16px", boxShadow:"0 8px 24px rgba(0,0,0,.09)", minWidth:148 }}>
              <div style={{ fontSize:10, color:"#94a3b8", marginBottom:4, fontWeight:500 }}>Reports Sent</div>
              <div style={{ fontSize:20, fontWeight:800, color:"#6366f1", fontFamily:"'Syne',sans-serif" }}>89</div>
              <div style={{ fontSize:10, color:"#10b981", marginTop:2, fontWeight:600 }}>✓ via WhatsApp</div>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" style={{ padding:"96px 2rem", background:"#fff" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <FadeUp>
            <div style={{ textAlign:"center", marginBottom:60 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#0ea5e9", letterSpacing:"0.12em", marginBottom:12 }}>HOW IT WORKS</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.8rem,4vw,2.7rem)", fontWeight:800, letterSpacing:"-0.02em", color:"#0f172a", marginBottom:12 }}>The AB+ Workflow</h2>
              <p style={{ color:"#64748b", maxWidth:420, margin:"0 auto", fontSize:15 }}>Four roles, one seamless pipeline. Every step connects automatically.</p>
            </div>
          </FadeUp>
          <div className="grid-4" style={{ gap:0, position:"relative", alignItems:"start" }}>
            <div className="workflow-line" />
            {WORKFLOW.map((s,i) => (
              <FadeUp key={s.role} delay={i*0.12}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"0 18px", position:"relative", zIndex:1 }}>
                  <div style={{ width:70, height:70, borderRadius:"50%", background:s.bg, border:`2.5px solid ${s.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:18, position:"relative", boxShadow:`0 4px 18px ${s.color}28` }}>
                    {s.icon}
                    <div style={{ position:"absolute", top:-8, right:-8, width:22, height:22, borderRadius:"50%", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#fff", fontFamily:"'Syne',sans-serif" }}>{s.step}</div>
                  </div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"#1e293b", marginBottom:7 }}>{s.role}</div>
                  <div style={{ fontSize:13, color:"#64748b", lineHeight:1.65 }}>{s.desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding:"96px 2rem", background:"#f8fafc" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <FadeUp>
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6366f1", letterSpacing:"0.12em", marginBottom:12 }}>BUILT FOR LABS</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.8rem,4vw,2.7rem)", fontWeight:800, letterSpacing:"-0.02em", color:"#0f172a" }}>Everything your lab needs</h2>
            </div>
          </FadeUp>
          <div className="grid-3" style={{ gap:16 }}>
            {FEATURES.map((feat,i) => (
              <FadeUp key={feat.title} delay={i*0.07}>
                <div className="fc" style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"22px 20px", boxShadow:"0 1px 6px rgba(0,0,0,.04)" }}>
                  <div style={{ width:42, height:42, borderRadius:11, background:`${feat.accent}12`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:14 }}>{feat.icon}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"#1e293b", marginBottom:7 }}>{feat.title}</div>
                  <div style={{ fontSize:13, color:"#64748b", lineHeight:1.7 }}>{feat.desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="dashboard" style={{ padding:"96px 2rem", background:"#fff" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <FadeUp>
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#10b981", letterSpacing:"0.12em", marginBottom:12 }}>PANEL PREVIEWS</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.8rem,4vw,2.7rem)", fontWeight:800, letterSpacing:"-0.02em", color:"#0f172a", marginBottom:12 }}>A panel for every role</h2>
              <p style={{ color:"#64748b", maxWidth:420, margin:"0 auto", fontSize:15 }}>Each team member sees exactly what they need — nothing more, nothing less.</p>
            </div>
          </FadeUp>
          <div className="grid-2" style={{ gap:18 }}>
            {DASHBOARDS.map((dash,i) => (
              <FadeUp key={dash.title} delay={i*0.1}>
                <div style={{ background:dash.bg, border:`1px solid ${dash.color}22`, borderRadius:16, overflow:"hidden", transition:"all .25s", boxShadow:"0 2px 10px rgba(0,0,0,.04)" }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 16px 36px ${dash.color}18`; }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.04)"; }}
                >
                  <div style={{ padding:"13px 18px", display:"flex", alignItems:"center", gap:9, borderBottom:`1px solid ${dash.color}18`, background:`${dash.color}08` }}>
                    <span style={{ fontSize:17 }}>{dash.icon}</span>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:"#1e293b" }}>{dash.title}</span>
                    <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:"#10b981", animation:"pdot 2.5s infinite" }} />
                      <span style={{ fontSize:11, color:"#10b981", fontWeight:600 }}>Live</span>
                    </div>
                  </div>
                  <div style={{ padding:16, display:"flex", flexDirection:"column", gap:8 }}>
                    {dash.items.map((item,j) => (
                      <div key={j} style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", borderRadius:8, padding:"9px 13px", border:"1px solid rgba(0,0,0,.05)" }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:dash.color, flexShrink:0 }} />
                        <span style={{ fontSize:13, color:"#374151", fontWeight:500 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding:"80px 2rem", background:"linear-gradient(135deg,#f0f9ff,#faf5ff)" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <FadeUp>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.8rem,4vw,2.5rem)", fontWeight:800, letterSpacing:"-0.02em", color:"#0f172a", textAlign:"center", marginBottom:48 }}>Numbers that speak for themselves</h2>
          </FadeUp>
          <div ref={statsRef} className="grid-4" style={{ gap:16 }}>
            {STATS.map((stat,i) => (
              <FadeUp key={stat.label} delay={i*0.1}>
                <StatCard stat={stat} animate={statsInView} />
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* WHY AB+ */}
      <section style={{ padding:"96px 2rem", background:"#fff" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <FadeUp>
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#f59e0b", letterSpacing:"0.12em", marginBottom:12 }}>WHY AB+</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.8rem,4vw,2.7rem)", fontWeight:800, letterSpacing:"-0.02em", color:"#0f172a" }}>
                Built for <span style={{ color:"#0ea5e9" }}>Indian pathology labs</span>
              </h2>
            </div>
          </FadeUp>
          <div className="grid-2" style={{ gap:16 }}>
            {[
              { title:"Simpler workflow", icon:"⚡", desc:"Your staff doesn't need training days. The UI is intuitive enough to go live within hours.", color:"#0ea5e9", bg:"#f0f9ff" },
              { title:"Faster reports", icon:"📈", desc:"From sample collection to PDF report — automated pipeline with no manual steps.", color:"#10b981", bg:"#f0fdf4" },
              { title:"Cloud-based", icon:"☁️", desc:"No servers to manage. Access from any device. Your data is always safe and backed up.", color:"#6366f1", bg:"#f5f3ff" },
              { title:"Designed for India", icon:"🇮🇳", desc:"GST billing, WhatsApp delivery, regional test panels — built for how Indian labs work.", color:"#f59e0b", bg:"#fffbeb" },
            ].map((item,i) => (
              <FadeUp key={item.title} delay={i*0.1}>
                <div style={{ display:"flex", gap:16, padding:"22px", background:item.bg, borderRadius:14, border:`1px solid ${item.color}1a` }}>
                  <div style={{ width:46, height:46, borderRadius:12, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>{item.icon}</div>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:"#1e293b", marginBottom:6 }}>{item.title}</div>
                    <div style={{ fontSize:13, color:"#64748b", lineHeight:1.7 }}>{item.desc}</div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding:"96px 2rem", background:"#f8fafc" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <FadeUp>
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6366f1", letterSpacing:"0.12em", marginBottom:12 }}>TESTIMONIALS</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.8rem,4vw,2.7rem)", fontWeight:800, letterSpacing:"-0.02em", color:"#0f172a" }}>Labs love AB+</h2>
            </div>
          </FadeUp>
          <div className="grid-3" style={{ gap:18 }}>
            {TESTIMONIALS.map((t,i) => (
              <FadeUp key={t.name} delay={i*0.12}>
                <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"26px 22px", boxShadow:"0 2px 12px rgba(0,0,0,.05)", display:"flex", flexDirection:"column" }}>
                  <div style={{ fontSize:34, color:t.color, lineHeight:1, marginBottom:12, opacity:0.35, fontFamily:"serif" }}>"</div>
                  <p style={{ fontSize:14, color:"#475569", lineHeight:1.8, marginBottom:20, flex:1 }}>{t.text}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:11, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:t.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:t.color, flexShrink:0 }}>{t.avatar}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:"#1e293b" }}>{t.name}</div>
                      <div style={{ fontSize:12, color:"#94a3b8" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"80px 2rem", background:"#fff" }}>
        <div style={{ maxWidth:840, margin:"0 auto" }}>
          <FadeUp>
            <div style={{ background:"linear-gradient(135deg,#f0f9ff,#f5f3ff)", border:"1px solid #bfdbfe", borderRadius:22, padding:"60px 48px", textAlign:"center" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#0ea5e9", letterSpacing:"0.12em", marginBottom:14 }}>GET STARTED TODAY</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(1.8rem,4vw,2.7rem)", fontWeight:800, letterSpacing:"-0.02em", color:"#0f172a", marginBottom:14 }}>Ready to Modernize Your Lab?</h2>
              <p style={{ color:"#64748b", fontSize:15, maxWidth:400, margin:"0 auto 32px", lineHeight:1.75 }}>Join 120+ labs already running on AB+. Set up in minutes, not days.</p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <button className="pb" style={{ padding:"13px 34px", fontSize:15 }}>Book a Free Demo</button>
                <button className="gb" style={{ padding:"13px 34px", fontSize:15 }}>Contact Sales</button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{ background:"#f8fafc", borderTop:"1px solid #e2e8f0", padding:"52px 2rem 28px" }}>
        <div style={{ maxWidth:1060, margin:"0 auto" }}>
          <div className="grid-footer" style={{ gap:44, marginBottom:36 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>A+</div>
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:"#0f172a" }}>AB<span style={{ color:"#0ea5e9" }}>+</span></span>
              </div>
              <p style={{ fontSize:13, color:"#64748b", lineHeight:1.8, maxWidth:230 }}>Modern pathology lab management built for Indian diagnostic centers.</p>
            </div>
            {[
              { heading:"Product", links:["Features","Workflow","Dashboard","Pricing"] },
              { heading:"Company", links:["About","Blog","Careers","Press"] },
              { heading:"Contact", links:["support@abplus.in","+91 98765 43210","Pune, Maharashtra","WhatsApp Support"] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.08em", marginBottom:14 }}>{col.heading}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  {col.links.map(l => <a key={l} href="#" style={{ fontSize:13, color:"#64748b", textDecoration:"none", transition:"color .2s" }} onMouseEnter={e=>e.target.style.color="#0ea5e9"} onMouseLeave={e=>e.target.style.color="#64748b"}>{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid #e2e8f0", paddingTop:20, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:12, color:"#94a3b8" }}>© 2025 AB+. All rights reserved.</div>
            <div style={{ fontSize:12, color:"#94a3b8" }}>Built for Indian Pathology Labs 🇮🇳</div>
          </div>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {loginOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.3)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifycontent:"center", zIndex:999, padding:20 }}>
          <div style={{ background:"rgba(255,255,255,0.85)", border:"1px solid rgba(255,255,255,0.4)", borderRadius:24, boxShadow:"0 20px 50px rgba(15,23,42,0.15)", width:"100%", maxWidth:420, padding:32, position:"relative", backdropFilter:"blur(20px)" }}>
            {/* Title */}
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:"#0f172a", marginBottom:8, letterSpacing:"-0.02em" }}>Welcome back</h3>
            <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>Log in to your AB+ Pathology Lab Workspace</p>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (!email) {
                setError("Email is required");
                return;
              }
              if (!password) {
                setError("Password is required");
                return;
              }

              setLoading(true);
              try {
                const res = await apiService.login({
                  email,
                  password
                });

                if (res.user.requires_password_change) {
                  setChangePasswordUser(res.user);
                  setLoginOpen(false);
                  return;
                }

                if (res.user.role === "SUPER_ADMIN") {
                  router.push("/super-admin");
                } else {
                  router.push("/dashboard");
                }
              } catch (err) {
                console.error(err);
                setError(err.message || "Invalid email or password.");
              } finally {
                setLoading(false);
              }
            }} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Email Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. employee@abplus.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"1px solid #cbd5e1", background:"#fff", fontSize:14, outline:"none" }}
                />
                <span style={{ fontSize:10, color:"#94a3b8", display:"block", marginTop:4 }}>Enter your registered email address or staff login ID.</span>
              </div>

              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width:"100%", padding:"12px 16px", paddingRight: 40, borderRadius:12, border:"1px solid #cbd5e1", background:"#fff", fontSize:14, outline:"none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              {error && <div style={{ color:"#ef4444", fontSize:13, fontWeight:500 }}>{error}</div>}

              <button type="submit" disabled={loading} className="pb" style={{ padding:"12px", width:"100%", fontSize:15, marginTop:8, border:"none", borderRadius:12, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", color:"#fff", fontWeight:700, cursor:"pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setLoginOpen(false);
                  setStaffLoginOpen(true);
                }}
                style={{ background: "none", border: "none", color: "#0ea5e9", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
              >
                Staff Login
              </button>
            </div>

            {/* Close button */}
            <button type="button" onClick={() => setLoginOpen(false)} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>&times;</button>
          </div>
        </div>
      )}

      {/* STAFF LOGIN MODAL */}
      {staffLoginOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.3)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20 }}>
          <div style={{ background:"rgba(255,255,255,0.85)", border:"1px solid rgba(255,255,255,0.4)", borderRadius:24, boxShadow:"0 20px 50px rgba(15,23,42,0.15)", width:"100%", maxWidth:420, padding:32, position:"relative", backdropFilter:"blur(20px)" }}>
            {/* Title */}
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:"#0f172a", marginBottom:8, letterSpacing:"-0.02em" }}>Staff Login</h3>
            <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>Log in to your pathology workspace</p>

            {/* Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (!staffLabCode) {
                setError("Lab Code is required");
                return;
              }
              if (!staffUsername) {
                setError("Username is required");
                return;
              }
              if (!staffPassword) {
                setError("Password is required");
                return;
              }

              setLoading(true);
              try {
                const res = await apiService.login({
                  lab_code: staffLabCode,
                  username: staffUsername,
                  password: staffPassword
                });

                if (res.user.requires_password_change) {
                  setChangePasswordUser(res.user);
                  setStaffLoginOpen(false);
                  return;
                }

                router.push("/dashboard");
              } catch (err) {
                console.error(err);
                setError(err.message || "Invalid credentials.");
              } finally {
                setLoading(false);
              }
            }} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Lab Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAMARTH"
                  value={staffLabCode}
                  onChange={(e) => setStaffLabCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"1px solid #cbd5e1", background:"#fff", fontSize:14, outline:"none" }}
                />
                <span style={{ fontSize:10, color:"#94a3b8", display:"block", marginTop:4 }}>Enter your lab's unique code.</span>
              </div>

              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. lucky_patil"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  style={{ width:"100%", padding:"12px 16px", borderRadius:12, border:"1px solid #cbd5e1", background:"#fff", fontSize:14, outline:"none" }}
                />
                <span style={{ fontSize:10, color:"#94a3b8", display:"block", marginTop:4 }}>Letters, numbers, and underscores only. No spaces.</span>
              </div>

              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showStaffPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    style={{ width:"100%", padding:"12px 16px", paddingRight: 40, borderRadius:12, border:"1px solid #cbd5e1", background:"#fff", fontSize:14, outline:"none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
                  >
                    {showStaffPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              {error && <div style={{ color:"#ef4444", fontSize:13, fontWeight:500 }}>{error}</div>}

              <button type="submit" disabled={loading} className="pb" style={{ padding:"12px", width:"100%", fontSize:15, marginTop:8, border:"none", borderRadius:12, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", color:"#fff", fontWeight:700, cursor:"pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Logging in..." : "Log In"}
              </button>

              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStaffLoginOpen(false);
                    setLoginOpen(true);
                  }}
                  style={{ background: "none", border: "none", color: "#0ea5e9", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                >
                  Back to Admin Login
                </button>
              </div>
            </form>

            {/* Close button */}
            <button type="button" onClick={() => setStaffLoginOpen(false)} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>&times;</button>
          </div>
        </div>
      )}
      {/* CHANGE PASSWORD MODAL */}
      {changePasswordUser && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.6)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:20 }}>
          <div style={{ background:"rgba(255,255,255,0.95)", border:"1px solid rgba(255,255,255,0.4)", borderRadius:24, boxShadow:"0 20px 50px rgba(15,23,42,0.15)", width:"100%", maxWidth:420, padding:32, position:"relative", backdropFilter:"blur(20px)" }}>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:"#0f172a", marginBottom:8, letterSpacing:"-0.02em" }}>Set New Password</h3>
            <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>You are using a temporary password. Please set a new secure password to continue.</p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              if (newPassword.length < 6) {
                setError("Password must be at least 6 characters.");
                return;
              }
              if (newPassword !== confirmNewPassword) {
                setError("Passwords do not match.");
                return;
              }

              setLoading(true);
              try {
                const res = await apiService.changePassword(newPassword);
                if (res.success) {
                  const role = changePasswordUser.role;
                  setChangePasswordUser(null);
                  if (role === "SUPER_ADMIN") {
                    router.push("/super-admin");
                  } else {
                    router.push("/dashboard");
                  }
                }
              } catch (err) {
                console.error(err);
                setError(err.message || "Failed to change password.");
              } finally {
                setLoading(false);
              }
            }} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ width:"100%", borderRadius:12, border:"1px solid #cbd5e1", background:"rgba(255,255,255,0.8)", padding:"12px 16px", fontSize:14, outline:"none", transition:"all 0.2s" }}
                  onFocus={e => { e.target.style.borderColor = "#0ea5e9"; e.target.style.boxShadow = "0 0 0 4px rgba(14,165,233,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#cbd5e1"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:6 }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={{ width:"100%", borderRadius:12, border:"1px solid #cbd5e1", background:"rgba(255,255,255,0.8)", padding:"12px 16px", fontSize:14, outline:"none", transition:"all 0.2s" }}
                  onFocus={e => { e.target.style.borderColor = "#0ea5e9"; e.target.style.boxShadow = "0 0 0 4px rgba(14,165,233,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#cbd5e1"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {error && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 500, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{ width:"100%", borderRadius:12, padding:"12px", background:"linear-gradient(135deg, #0f172a, #1e293b)", color:"#fff", fontSize:15, fontWeight:700, border:"none", cursor: loading ? "not-allowed" : "pointer", marginTop:8, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Updating..." : "Set Password & Continue"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
