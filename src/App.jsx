import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { useLiveTable } from "./useLiveTable";

// ============================================================
// DadOps — Interactive Prototype
// Tactical Green theme. In-memory state. Phone + Tablet aware.
// ============================================================

const C = {
  bg: "#080f0d",
  surface: "#0d1610",
  card: "#121e14",
  cardHi: "#16271a",
  accent: "#00D26E",
  accentDim: "rgba(0,210,110,0.12)",
  accentBorder: "rgba(0,210,110,0.25)",
  text: "#ffffff",
  muted: "#4a6655",
  muted2: "#6b8a76",
  border: "rgba(255,255,255,0.06)",
  danger: "#ff5a5a",
};

const GO_DAY = new Date("2026-06-26T08:00:00");
const TABLET_PASS = "dadops-tablet-2026";

const fonts = {
  display: "'Bebas Neue', sans-serif",
  mono: "'Space Mono', monospace",
  body: "'DM Sans', sans-serif",
};

// ---- People ----
const PEOPLE = [
  { id: "matt", name: "Matt", role: "Dad", color: "#00D26E" },
  { id: "jhomaira", name: "Jhomaira", role: "Mum", color: "#3aa0ff" },
  { id: "omaira", name: "Omaira", role: "Helper", color: "#c084fc" },
  { id: "tablet", name: "Tablet", role: "Dashboard", color: "#6b8a76" },
];

// ---- Inject fonts + global resets ----
function useGlobalStyle() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&family=Bebas+Neue&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      ::-webkit-scrollbar { width: 0; height: 0; }
      @keyframes fadeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:none;} }
      @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      @keyframes slideIn { from { transform: translateY(100%);} to {transform:none;} }
      @keyframes scaleIn { from { opacity:0; transform: scale(0.96);} to {opacity:1; transform:none;} }
      @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
    `;
    document.head.appendChild(style);
  }, []);
}

// ---- Helpers ----
const now = () => new Date();
function fmtTime(d) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function agoStr(d) {
  const mins = Math.floor((now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m ago`;
}
function daysUntil(d) {
  return Math.ceil((d - now()) / 86400000);
}

// ============================================================
// MAIN APP
// ============================================================
function useIsTablet() {
  const [isTablet, setIsTablet] = useState(typeof window !== "undefined" ? window.innerWidth >= 900 : false);
  useEffect(() => {
    const onResize = () => setIsTablet(window.innerWidth >= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isTablet;
}

export default function DadOps() {
  useGlobalStyle();
  const isTablet = useIsTablet();
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setSession(data.session);
        setAuthLoading(false);
      } else if (isTablet) {
        const { data: d } = await supabase.auth.signInWithPassword({
          email: "tablet@dadops.local",
          password: TABLET_PASS,
        });
        setSession(d?.session ?? null);
        setAuthLoading(false);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => subscription.unsubscribe();
  }, [isTablet]);

  if (authLoading) return <AuthLoading />;
  if (!session) return <LoginScreen />;
  return <AuthenticatedApp session={session} isTablet={isTablet} />;
}

function AuthLoading() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontFamily: fonts.display, fontSize: 38, letterSpacing: 4 }}>DAD<span style={{ color: C.accent }}>OPS</span></div>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.accentDim}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function LoginScreen() {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const members = PEOPLE.filter((p) => p.id !== "tablet");

  useEffect(() => {
    if (pin.length !== 4 || !selected) return;
    const t = setTimeout(async () => {
      setSubmitting(true);
      const { error: err } = await supabase.auth.signInWithPassword({
        email: `${selected.id}@dadops.local`,
        password: pin,
      });
      setSubmitting(false);
      if (err) { setError("Wrong PIN — try again."); setPin(""); }
    }, 120);
    return () => clearTimeout(t);
  }, [pin, selected]);

  const tap = (k) => {
    if (submitting) return;
    if (k === "DEL") { setError(null); setPin((p) => p.slice(0, -1)); return; }
    if (pin.length < 4) setPin((p) => p + k);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: fonts.body, color: C.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ fontFamily: fonts.display, fontSize: 38, letterSpacing: 4, marginBottom: 4 }}>DAD<span style={{ color: C.accent }}>OPS</span></div>
      <div style={{ fontFamily: fonts.mono, fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 44 }}>JACOB · BORN 26 JUN 2026</div>

      {!selected ? (
        <>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.muted2, marginBottom: 18 }}>WHO ARE YOU?</div>
          {members.map((p) => (
            <button key={p.id} onClick={() => { setSelected(p); setPin(""); setError(null); }}
              style={{ width: "100%", maxWidth: 340, display: "flex", alignItems: "center", gap: 18, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 22px", marginBottom: 12, cursor: "pointer", color: C.text }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: p.color, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 18 }}>{p.name[0]}</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.muted2, fontFamily: fonts.mono, marginTop: 2 }}>{p.role.toUpperCase()}</div>
              </div>
            </button>
          ))}
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: selected.color, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 20 }}>{selected.name[0]}</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{selected.name}</div>
              <button onClick={() => { setSelected(null); setPin(""); setError(null); }} style={{ background: "none", border: "none", color: C.muted2, fontSize: 11, cursor: "pointer", padding: 0, fontFamily: fonts.body }}>Not you? ←</button>
            </div>
          </div>

          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.muted2, marginBottom: 16 }}>ENTER PIN</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: pin.length > i ? selected.color : "transparent", border: `2px solid ${pin.length > i ? selected.color : C.muted}`, transition: "all 0.15s" }} />
            ))}
          </div>

          {error && <div style={{ color: C.danger, fontSize: 12.5, marginBottom: 16, fontFamily: fonts.mono, letterSpacing: 0.5 }}>{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 10, opacity: submitting ? 0.5 : 1 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "DEL"].map((k, idx) => (
              <button key={idx} onClick={() => k !== null && tap(k === 0 ? "0" : String(k))}
                disabled={k === null || submitting}
                style={{
                  height: 64, borderRadius: 14,
                  border: k === null ? "none" : `1px solid ${C.border}`,
                  background: k === null ? "transparent" : C.card,
                  color: C.text, fontSize: k === "DEL" ? 18 : 22, fontWeight: 600,
                  cursor: k === null ? "default" : "pointer", fontFamily: fonts.mono,
                }}>
                {k === null ? "" : k === "DEL" ? "⌫" : k}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AuthenticatedApp({ session, isTablet }) {
  const [tab, setTab] = useState("shift");
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreScreen, setMoreScreen] = useState(null);
  const [changePinOpen, setChangePinOpen] = useState(false);

  const personId = session.user.user_metadata?.person_id;
  const user = PEOPLE.find((p) => p.id === personId) || PEOPLE[0];

  const feedsT = useLiveTable("feeds", {
    mapRow: (r) => ({ id: r.id, type: r.type, side: r.side, vol: r.vol_ml, at: new Date(r.at), by: r.by_person }),
  });
  const sleepsT = useLiveTable("sleeps", {
    orderBy: "start_ts",
    mapRow: (r) => ({ id: r.id, start: new Date(r.start_ts), end: r.end_ts ? new Date(r.end_ts) : null, by: r.by_person }),
  });
  const nappiesT = useLiveTable("nappies", {
    mapRow: (r) => ({ id: r.id, type: r.type, at: new Date(r.at), by: r.by_person }),
  });
  const tempsT = useLiveTable("temps", {
    mapRow: (r) => ({ id: r.id, c: Number(r.c), at: new Date(r.at), by: r.by_person }),
  });

  const feeds = feedsT.rows, sleeps = sleepsT.rows, nappies = nappiesT.rows, temps = tempsT.rows;
  const [shifts] = useState([
    { person: "matt", start: "10:00 PM", end: "02:00 AM", state: "active" },
    { person: "jhomaira", start: "02:00 AM", end: "06:00 AM", state: "next" },
    { person: "omaira", start: "On call", end: "", state: "backup" },
  ]);

  const lastFeed = feeds[0];
  const lastNappy = nappies[0];

  const addFeed = (f) => feedsT.add({ at: now().toISOString(), by_person: user.id, type: f.type, side: f.side, vol_ml: f.vol });
  const addNappy = (t) => nappiesT.add({ at: now().toISOString(), by_person: user.id, type: t });
  const addSleep = (s) => sleepsT.add({ start_ts: (s.start || now()).toISOString(), end_ts: s.end ? s.end.toISOString() : null, by_person: user.id });
  const addTemp = (c) => tempsT.add({ at: now().toISOString(), by_person: user.id, c });
  const lastTemp = temps[0];
  const tempAlert = lastTemp && lastTemp.c >= 38;

  const [dailyLogs, setDailyLogs] = useState({});
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("daily_log")
      .select("*")
      .eq("person_id", user.id)
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setDailyLogs((prev) => ({
            ...prev,
            [user.id]: data.map((r) => ({
              id: r.id,
              date: new Date(r.date),
              scores: { night: r.score_night, rel: r.score_rel, conf: r.score_conf, energy: r.score_energy },
              mind: r.text_mind,
              win: r.text_win,
              tag: r.day_tag,
              reflection: r.reflection,
            })),
          }));
        }
      });
  }, [user.id]);

  const addDailyLog = async (personId, entry) => {
    const local = { id: `local-${Date.now()}`, date: now(), ...entry };
    setDailyLogs((prev) => ({ ...prev, [personId]: [local, ...(prev[personId] || [])] }));
    if (!supabase) return;
    await supabase.from("daily_log").insert({
      person_id: personId,
      score_night: entry.scores.night,
      score_rel: entry.scores.rel,
      score_conf: entry.scores.conf,
      score_energy: entry.scores.energy,
      text_mind: entry.mind,
      text_win: entry.win,
      day_tag: entry.tag,
      reflection: entry.reflection,
    });
  };

  const onSignOut = () => supabase?.auth.signOut();
  const shared = { feeds, sleeps, nappies, temps, feedsT, sleepsT, nappiesT, tempsT, lastTemp, tempAlert, shifts, lastFeed, lastNappy, user, addFeed, addNappy, addSleep, addTemp, setTab };

  if (isTablet) return <TabletDashboard shared={shared} />;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: fonts.body, color: C.text, position: "relative", maxWidth: 480, margin: "0 auto", overflow: "hidden" }}>
      <TopBar user={user} onSignOut={onSignOut} openChangePinModal={() => setChangePinOpen(true)} />

      <div style={{ padding: "0 16px 120px", minHeight: "100vh" }}>
        {tab === "shift" && <Shift {...shared} />}
        {tab === "protocols" && <Protocols {...shared} />}
        {tab === "insights" && <Insights {...shared} />}
        {tab === "library" && <Library {...shared} />}
      </div>

      <QuickLogFab open={fabOpen} setOpen={setFabOpen} addFeed={addFeed} addNappy={addNappy} addSleep={addSleep} addTemp={addTemp} />

      {moreOpen && <MoreSheet close={() => setMoreOpen(false)} open={(s) => { setMoreScreen(s); setMoreOpen(false); }} />}
      {moreScreen && <MoreScreen screen={moreScreen} close={() => setMoreScreen(null)} user={user} dailyLogs={dailyLogs} addDailyLog={addDailyLog} {...shared} />}
      {changePinOpen && <ChangePinModal user={user} close={() => setChangePinOpen(false)} />}

      <BottomNav tab={tab} setTab={setTab} openMore={() => setMoreOpen(true)} />
    </div>
  );
}

function ChangePinModal({ user, close }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!/^\d{4}$/.test(next)) { setError("New PIN must be exactly 4 digits"); return; }
    if (next !== confirm) { setError("PINs don't match"); return; }
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: `${user.id}@dadops.local`,
      password: current,
    });
    if (authErr) { setError("Current PIN is wrong"); setLoading(false); return; }
    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updErr) { setError(updErr.message); return; }
    setSaved(true);
  };

  const pinField = (label, val, setter) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>{label}</div>
      <input
        type="password" inputMode="numeric" maxLength={4}
        value={val}
        onChange={(e) => setter(e.target.value.replace(/\D/g, "").slice(0, 4))}
        style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 14px", color: C.text, fontSize: 22, fontFamily: fonts.mono, outline: "none", letterSpacing: 10, textAlign: "center" }}
      />
    </div>
  );

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, padding: 24, width: "88%", maxWidth: 360, border: `1px solid ${C.border}`, animation: "scaleIn 0.15s" }}>
        <div style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, marginBottom: 20 }}>CHANGE PIN</div>
        {saved ? (
          <>
            <div style={{ color: C.accent, fontSize: 15, textAlign: "center", marginBottom: 20 }}>✓ PIN updated successfully</div>
            <button onClick={close} style={bigBtn()}>Done</button>
          </>
        ) : (
          <>
            {pinField("CURRENT PIN", current, setCurrent)}
            {pinField("NEW PIN (4 DIGITS)", next, setNext)}
            {pinField("CONFIRM NEW PIN", confirm, setConfirm)}
            {error && <div style={{ color: C.danger, fontSize: 12, marginBottom: 12, fontFamily: fonts.mono }}>{error}</div>}
            <button onClick={save} disabled={loading} style={{ ...bigBtn(), opacity: loading ? 0.7 : 1 }}>{loading ? "Saving…" : "Update PIN"}</button>
            <button onClick={close} style={{ ...bigBtn(), background: "transparent", border: `1px solid ${C.border}`, color: C.muted2, marginTop: 10 }}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TABLET DASHBOARD — always-on shared family view (Samsung tablet)
// Three-panel: Shifts | Live status (feed/sleep/nappy) | Latest insight
// No personal mood / Daily Log data on the shared screen.
// ============================================================
function TabletDashboard({ shared }) {
  const { shifts, lastFeed, lastNappy, feeds, sleeps, temps, lastTemp, tempAlert, addTemp } = shared;
  const [clock, setClock] = useState(now());
  const [tempOpen, setTempOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setClock(now()), 30000);
    return () => clearInterval(t);
  }, []);
  const lastSleep = sleeps[0];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: fonts.body, color: C.text, padding: "28px 32px" }}>
      {/* Header strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: 1.5, color: C.accent }}>DADOPS</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 12, color: C.muted2, letterSpacing: 1 }}>JACOB · FAMILY DASHBOARD</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button onClick={() => setTempOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 16px", color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            🌡️ Add Temp
          </button>
          <div style={{ fontFamily: fonts.mono, fontSize: 22, color: C.text, letterSpacing: 1 }}>{fmtTime(clock)}</div>
        </div>
      </div>

      {tempAlert && (
        <div style={{ background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 14, padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.danger }}>ACTION NEEDED</span>
          <span style={{ fontSize: 13.5, color: "#ffb0b0" }}>Last temp {lastTemp.c.toFixed(1)}°C ({agoStr(lastTemp.at)}) — call your provider or Pregnancy, Birth & Baby 1800 882 436.</span>
        </div>
      )}

      {/* Four-panel grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Panel 1 — Shifts */}
        <DashPanel title="SHIFTS">
          {shifts.map((s, i) => {
            const person = PEOPLE.find((p) => p.id === s.person);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: s.state === "active" ? C.accentDim : C.card, border: `1px solid ${s.state === "active" ? C.accentBorder : C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 9 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: person?.color || C.muted, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{person?.name}</div>
                  <div style={{ fontSize: 12, color: C.muted2, fontFamily: fonts.mono }}>{s.start}{s.end ? ` – ${s.end}` : ""}</div>
                </div>
                {s.state === "active" && <span style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: C.accent, background: C.accentDim, border: `1px solid ${C.accentBorder}`, padding: "4px 8px", borderRadius: 10 }}>ON NOW</span>}
              </div>
            );
          })}
        </DashPanel>

        {/* Panel 2 — Live status */}
        <DashPanel title="LIVE STATUS">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <BigStat icon="🍼" label="Last feed" value={lastFeed ? agoStr(lastFeed.at) : "—"} sub={lastFeed ? (lastFeed.type === "bottle" ? `Bottle · ${lastFeed.vol}ml` : `Breast · ${lastFeed.side}`) : ""} />
            <BigStat icon="💧" label="Last nappy" value={lastNappy ? agoStr(lastNappy.at) : "—"} sub={lastNappy ? lastNappy.type : ""} />
            <BigStat icon="😴" label="Last sleep" value={lastSleep ? agoStr(lastSleep.end || lastSleep.start) : "—"} sub={lastSleep?.end ? "Woke" : "In progress"} />
            <BigStat icon="🌙" label="Wake forecast" value="~50 min" sub="Often tired after 1–1.5h awake" />
          </div>
        </DashPanel>

        {/* Panel 3 — Temperature */}
        <DashPanel title="TEMPERATURE">
          {lastTemp ? (
            <>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 40, color: tempAlert ? C.danger : C.accent }}>{lastTemp.c.toFixed(1)}°C</div>
                <div style={{ fontSize: 11, color: C.muted2 }}>{agoStr(lastTemp.at)}</div>
              </div>
              {temps.length > 1 && <TempChart temps={temps} />}
            </>
          ) : (
            <div style={{ fontSize: 13, color: C.muted2, textAlign: "center", padding: "30px 10px" }}>No readings yet</div>
          )}
        </DashPanel>

        {/* Panel 4 — Latest insight */}
        <DashPanel title="LATEST INSIGHT">
          <div style={{ background: tempAlert ? "rgba(255,90,90,0.08)" : C.accentDim, border: `1px solid ${tempAlert ? "rgba(255,90,90,0.3)" : C.accentBorder}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: tempAlert ? "#ffb0b0" : C.text }}>
              {tempAlert
                ? "Last temperature reading was 38°C or higher. Call your provider's advice line now."
                : "Feeds have been steady through the day — nappy output is on track. Nothing needs action right now."}
            </div>
          </div>
          <div style={{ marginTop: 16, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, textAlign: "center" }}>
            No personal mood or journal data is shown here
          </div>
        </DashPanel>
      </div>

      {tempOpen && (
        <div onClick={() => setTempOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, padding: 24, width: 380, border: `1px solid ${C.border}` }}>
            <TempLog onSave={(c) => { addTemp(c); setTempOpen(false); }} back={() => setTempOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function DashPanel({ title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, minHeight: 320 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, color: C.accent, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function BigStat({ icon, label, value, sub }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1, color: C.muted2, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted2 }}>{sub}</div>}
    </div>
  );
}

// ============================================================
// TOP BAR
// ============================================================
function TopBar({ user, onSignOut, openChangePinModal }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 50 }}>
      <div style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 3 }}>
        DAD<span style={{ color: C.accent }}>OPS</span>
      </div>
      <div style={{ position: "relative" }}>
        <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px 5px 6px", cursor: "pointer" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: user.color, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 12 }}>
            {user.name[0]}
          </div>
          <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{user.name}</span>
          <span style={{ color: C.muted, fontSize: 10, marginLeft: 2 }}>▾</span>
        </button>
        {open && (
          <div style={{ position: "absolute", right: 0, top: 42, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", minWidth: 170, zIndex: 100, animation: "scaleIn 0.12s" }}>
            <div style={{ padding: "10px 14px 6px", fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5, color: C.muted }}>
              {user.role.toUpperCase()}
            </div>
            <button onClick={() => { openChangePinModal(); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: C.text, fontSize: 13, fontFamily: fonts.body }}>
              🔑 Change PIN
            </button>
            <div style={{ height: 1, background: C.border, margin: "4px 0" }} />
            <button onClick={() => { onSignOut(); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: C.danger, fontSize: 13, fontFamily: fonts.body }}>
              ↩ Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SECTION LABEL
// ============================================================
function Label({ children }) {
  return <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted, margin: "22px 2px 12px" }}>{children}</div>;
}

// ============================================================
// TONIGHT
// ============================================================
function Shift({ shifts, lastFeed, lastNappy, user, feeds, nappies, sleeps, temps, feedsT, nappiesT, sleepsT, tempsT }) {
  const [handedOff, setHandedOff] = useState(false);
  const nameOf = (id) => PEOPLE.find((p) => p.id === id)?.name || id;
  const next = shifts.find((s) => s.state === "next");

  // forecast: predict next wake from last feed (no data yet = no forecast)
  const sinceFeed = lastFeed ? Math.floor((now() - lastFeed.at) / 60000) : null;
  const predict = sinceFeed === null ? null : Math.max(0, 165 - sinceFeed);

  return (
    <div style={{ animation: "fadeUp 0.3s" }}>
      <Label>Shift Plan</Label>

      {/* forecast banner */}
      <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontSize: 22 }}>🔮</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
          {lastFeed
            ? <>Jacob last fed <b>{agoStr(lastFeed.at)}</b>. Expect a wake in roughly <b style={{ color: C.accent }}>{predict > 0 ? `${predict} min` : "any time now"}</b>.</>
            : "No feeds logged yet — log one from the + button to start the wake forecast."}
        </div>
      </div>

      {shifts.map((s, i) => {
        const p = PEOPLE.find((x) => x.id === s.person);
        const active = s.state === "active" && !handedOff;
        const isNextActive = handedOff && s.state === "next";
        return (
          <div key={i} style={{ background: active || isNextActive ? C.accentDim : C.card, border: `1px solid ${active || isNextActive ? C.accentBorder : C.border}`, borderRadius: 14, padding: 16, marginBottom: 10, animation: `fadeUp 0.3s ${i * 0.06}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: active || isNextActive ? C.accent : C.muted2, marginBottom: 5 }}>
                  {active ? "ON SHIFT NOW" : isNextActive ? "ON SHIFT NOW" : s.state === "next" ? "NEXT UP" : "BACKUP"}
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                  {p.name}
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: 12, color: C.muted2, marginTop: 3 }}>
                  {s.start}{s.end ? ` → ${s.end}` : ""}
                </div>
              </div>
              {(active || isNextActive) && <div style={{ fontSize: 11, fontFamily: fonts.mono, color: C.accent, animation: "pulse 2s infinite" }}>● LIVE</div>}
            </div>
          </div>
        );
      })}

      {!handedOff ? (
        <button onClick={() => setHandedOff(true)} style={bigBtn()}>
          Hand off to {nameOf(next.person)} →
        </button>
      ) : (
        <div style={{ ...bigBtn(), background: C.card, color: C.muted2, border: `1px solid ${C.border}`, textAlign: "center", cursor: "default" }}>
          ✓ Handed off — {nameOf(next.person)} is now on shift
        </div>
      )}

      <Label>Live Status</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatTile icon="🍼" label="Last Feed" value={lastFeed ? agoStr(lastFeed.at) : "—"} sub={lastFeed ? (lastFeed.type === "breast" ? `Breast (${lastFeed.side})` : `Bottle ${lastFeed.vol}ml`) : "No feeds yet"} />
        <StatTile icon="👶" label="Last Nappy" value={lastNappy ? agoStr(lastNappy.at) : "—"} sub={lastNappy ? lastNappy.type.toUpperCase() : "No nappies yet"} />
      </div>

      <Label>Activity Log</Label>
      <ActivityLog
        feeds={feeds} nappies={nappies} sleeps={sleeps} temps={temps}
        feedsT={feedsT} nappiesT={nappiesT} sleepsT={sleepsT} tempsT={tempsT}
      />
    </div>
  );
}

function StatTile({ icon, label, value, sub }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.5, color: C.muted, marginBottom: 3 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: C.muted2, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

// ============================================================
// ACTIVITY LOG — edit / soft-delete logged entries
// ============================================================
function ActivityLog({ feeds, nappies, sleeps, temps, feedsT, nappiesT, sleepsT, tempsT }) {
  const [editing, setEditing] = useState(null);

  const nameOf = (id) => PEOPLE.find((p) => p.id === id)?.name || id;

  const tableFor = (kind) => ({ feed: feedsT, nappy: nappiesT, sleep: sleepsT, temp: tempsT }[kind]);
  const timeColFor = (kind) => (kind === "sleep" ? "start_ts" : "at");

  const events = useMemo(() => [
    ...feeds.map((f) => ({
      id: f.id, kind: "feed", at: f.at, by: f.by,
      icon: "🍼",
      label: f.type === "breast" ? `Breast · ${f.side}` : `Bottle · ${f.vol}ml`,
    })),
    ...nappies.map((n) => ({
      id: n.id, kind: "nappy", at: n.at, by: n.by,
      icon: "👶",
      label: n.type.charAt(0).toUpperCase() + n.type.slice(1),
    })),
    ...sleeps.map((s) => ({
      id: s.id, kind: "sleep", at: s.start, by: s.by,
      icon: "😴",
      label: s.end
        ? `Slept · ${Math.round((s.end - s.start) / 60000)}m`
        : "Sleep in progress",
    })),
    ...temps.map((t) => ({
      id: t.id, kind: "temp", at: t.at, by: t.by,
      icon: "🌡️",
      label: `${t.c.toFixed(1)}°C`,
      alert: t.c >= 38,
    })),
  ].sort((a, b) => b.at - a.at).slice(0, 25), [feeds, nappies, sleeps, temps]);

  if (events.length === 0) {
    return (
      <div style={{ textAlign: "center", color: C.muted2, fontSize: 13, padding: "20px 10px" }}>
        No entries yet — use + to log a feed, nappy or sleep.
      </div>
    );
  }

  return (
    <>
      {events.map((ev, i) => (
        <button
          key={ev.id}
          onClick={() => setEditing(ev)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            background: ev.alert ? "rgba(255,90,90,0.06)" : C.card,
            border: `1px solid ${ev.alert ? "rgba(255,90,90,0.25)" : C.border}`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 7,
            cursor: "pointer", color: C.text,
            animation: `fadeUp 0.2s ${Math.min(i, 8) * 0.03}s both`,
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>{ev.icon}</span>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.label}</div>
            <div style={{ fontSize: 11, color: C.muted2, fontFamily: fonts.mono, marginTop: 1 }}>
              {agoStr(ev.at)} · {nameOf(ev.by)}
            </div>
          </div>
          <span style={{ fontSize: 10, color: C.muted, fontFamily: fonts.mono, letterSpacing: 0.5 }}>EDIT ›</span>
        </button>
      ))}

      {editing && (
        <EntryEditSheet
          entry={editing}
          tableHook={tableFor(editing.kind)}
          timeCol={timeColFor(editing.kind)}
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ---- Entry edit / delete sheet ----
function EntryEditSheet({ entry, tableHook, timeCol, close }) {
  const [time, setTime] = useState(new Date(entry.at));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const adjust = (mins) => setTime((t) => new Date(t.getTime() + mins * 60000));

  const save = async () => {
    setSaving(true);
    await tableHook.update(entry.id, { [timeCol]: time.toISOString() });
    setSaving(false);
    close();
  };

  const doDelete = async () => {
    await tableHook.remove(entry.id);
    close();
  };

  const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;

  return (
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, borderRadius: "22px 22px 0 0", padding: "20px 20px 28px", width: "100%", maxWidth: 480, borderTop: `1px solid ${C.border}`, animation: "slideIn 0.25s" }}
      >
        <div style={{ width: 40, height: 4, background: C.cardHi, borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 24 }}>{entry.icon}</span>
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 1 }}>EDIT ENTRY</div>
            <div style={{ fontSize: 13, color: C.muted2 }}>{entry.label}</div>
          </div>
        </div>

        {!confirmDelete ? (
          <>
            <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 10 }}>ADJUST TIME</div>
            <div style={{ textAlign: "center", fontFamily: fonts.display, fontSize: 38, color: C.accent, marginBottom: 14, letterSpacing: 1 }}>
              {fmtTime(time)}
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, justifyContent: "center" }}>
              {[[-30, "−30m"], [-15, "−15m"], [-5, "−5m"], [5, "+5m"], [15, "+15m"], [30, "+30m"]].map(([m, lbl]) => (
                <button
                  key={m}
                  onClick={() => adjust(m)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.muted2, fontSize: 10.5, fontFamily: fonts.mono, cursor: "pointer" }}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <input
              type="time"
              value={timeStr}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                const d = new Date(time);
                d.setHours(h, m, 0, 0);
                setTime(d);
              }}
              style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 15, fontFamily: fonts.mono, outline: "none", marginBottom: 14, textAlign: "center" }}
            />
            <button onClick={save} disabled={saving} style={{ ...bigBtn(), marginTop: 4, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "18px 0 14px" }} />
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid rgba(255,90,90,0.3)", background: "rgba(255,90,90,0.06)", color: C.danger, fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1, cursor: "pointer" }}
            >
              DELETE ENTRY
            </button>
          </>
        ) : (
          <div style={{ animation: "fadeUp 0.15s" }}>
            <div style={{ background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.danger, marginBottom: 6 }}>CONFIRM DELETE</div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                Remove this entry? It stays in the audit trail but won't show in the app.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ ...bigBtn(), background: C.card, color: C.text, border: `1px solid ${C.border}`, flex: 1, marginTop: 0 }}
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                style={{ ...bigBtn(), background: C.danger, flex: 1, marginTop: 0, color: "#fff", border: "none" }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PROTOCOLS — workflow engine
// Linear-with-guidance by default; surgical branching at real forks.
// Steps support: why, timer (countdown + manual), how-to sheet ref.
// ============================================================

// ---- Reusable HOW-TO library (referenced by id from any step) ----
const HOWTOS = {
  burp: {
    title: "How to burp Jacob",
    icon: "🫧",
    source: "Raising Children Network",
    body: [
      { h: "Why", t: "Trapped air during a feed makes a baby fussy and can mimic hunger. Getting the wind up often settles things on its own." },
      { h: "Position 1 — Over the shoulder", t: "Hold Jacob upright against your chest, his chin resting on your shoulder. Support his bottom with one hand. Pat or rub his back firmly but gently with the other, working upward." },
      { h: "Position 2 — Sitting on your lap", t: "Sit him upright on your thigh. Support his chest and jaw with the heel of your hand (not his throat). Lean him very slightly forward and pat his back." },
      { h: "Position 3 — Face down on your forearm", t: "Lay him along your forearm, face down, head supported in your hand, slightly higher than his body. Gentle pats." },
      { h: "How long", t: "Try a few minutes per position. Not every feed produces a burp — if nothing comes after 5 minutes and he's calm, that's fine, move on." },
    ],
  },
  swaddle: {
    title: "How to swaddle",
    icon: "🌯",
    source: "Red Nose",
    body: [
      { h: "Why", t: "A snug swaddle recreates the womb and dampens the startle (Moro) reflex that wakes newborns. Calms an overstimulated baby fast." },
      { h: "1. Diamond", t: "Lay a square blanket as a diamond. Fold the top corner down a few inches." },
      { h: "2. Place baby", t: "Lay Jacob on his back, shoulders just below the fold, head above the blanket." },
      { h: "3. Left arm + wrap", t: "Gently straighten his left arm down. Pull the left side of the blanket across his body and tuck it under his right side." },
      { h: "4. Bottom up", t: "Fold the bottom corner up over his feet, leaving room for his hips and legs to bend and move — never straight and tight at the hips." },
      { h: "5. Right arm + wrap", t: "Straighten his right arm, pull the right side across, tuck it under. Snug across the chest, loose at the hips." },
      { h: "Safety", t: "Always put a swaddled baby down on his BACK. Stop swaddling once he shows signs of rolling. Don't overheat — one light layer underneath." },
    ],
  },
  calmhold: {
    title: "The calm hold & bounce",
    icon: "🤱",
    source: "Raising Children Network",
    body: [
      { h: "Why", t: "Rhythmic motion plus secure containment soothes the newborn nervous system. Your calm is contagious — and so is your tension." },
      { h: "The hold", t: "Hold Jacob against your chest, his ear over your heart. One hand supports his head/neck, the other his bottom. Tuck him in close." },
      { h: "The bounce", t: "Small, smooth bounces from your knees — not your arms. Think gentle, steady, predictable. About one bounce per second." },
      { h: "Add sound", t: "A long, low 'shhh' close to his ear, or white noise, roughly as loud as his crying. Match it, then slowly bring it down." },
      { h: "Your breathing", t: "Slow your own breathing first. Drop your shoulders. Babies co-regulate off you — a settled adult settles a baby far faster than a stressed one." },
      { h: "Never shake", t: "Frustration is normal on no sleep. If you ever feel it rising, put Jacob down safely on his back in the cot and step away for two minutes. A crying baby in a safe cot is completely fine. Never shake a baby." },
    ],
  },
  latch: {
    title: "Checking a bottle feed",
    icon: "🍼",
    source: "Australian Breastfeeding Association",
    body: [
      { h: "Position", t: "Hold Jacob semi-upright (not flat on his back), head supported in the crook of your arm. Flat feeding can cause milk to pool and increases ear-infection risk." },
      { h: "Paced feeding", t: "Hold the bottle horizontal, not tipped straight up. Let him draw the milk rather than it pouring in. Tilt just enough to keep the teat full." },
      { h: "Pauses", t: "Pause every minute or so, lower the bottle, let him breathe. This mimics breastfeeding flow and prevents overfeeding and gulping air." },
      { h: "Temperature & flow", t: "Body temperature, not hot — test a drop on your wrist. A slow-flow teat is right for a newborn; if milk streams out when inverted, the flow is too fast." },
    ],
  },
};

// ---- Protocol definitions ----
// Linear protocols: ordered `steps`. Branch protocols: `nodes` graph + `start`.
const PROTOCOLS = {
  settling: {
    title: "Won't settle / crying",
    icon: "😭",
    type: "linear",
    source: "Raising Children Network / Red Nose",
    intro: "Work down calmly. Most crying is solved in the first few steps. The guidance tells you when you can stop.",
    steps: [
      { text: "Take one slow breath before you pick him up.", why: "Your nervous system sets his. Ten seconds to settle yourself makes everything that follows work better. There's no emergency in a crying, breathing baby." },
      { text: "Run the quick checklist: hungry, wet/dirty, too hot or cold, or due a burp?", why: "Four causes cover the large majority of crying. If one is obviously it — last feed was hours ago, or the nappy's full — fix that first and you may be done here." },
      { text: "Check for wind and try to bring up a burp.", why: "Trapped air is one of the most common and most missed causes, especially after a feed.", howto: "burp", timer: { seconds: 300, label: "Try burping" } },
      { text: "If still unsettled, swaddle him snugly.", why: "Containment dampens the startle reflex that keeps newborns from settling.", howto: "swaddle" },
      { text: "Hold close and do the calm bounce with a low 'shhh' or white noise.", why: "Rhythmic motion + sound + containment is the classic soothing combination. Give it real time to work.", howto: "calmhold", timer: { seconds: 600, label: "Calm hold" } },
      { text: "Still going after all that? Hand off to fresh arms if you can.", why: "A reset for you helps Jacob. Tag in Jhomaira or Omaira. If you're solo and feel frustration rising, it is always safe to put him down on his back in the cot and step away for two minutes." },
    ],
    outcome: { tone: "ok", title: "Settled, or close to it", text: "If he's calm — well done, that's the job. If he settled then woke again, that's normal newborn behaviour, not failure. Start again from the top whenever you need to." },
  },

  feed: {
    title: "Won't feed",
    icon: "🍼",
    type: "linear",
    source: "Australian Breastfeeding Association / Raising Children Network",
    intro: "Combo feeding (breast + bottle). Stay relaxed — a stressed baby feeds poorly, and so does a stressed parent.",
    steps: [
      { text: "Check the timing. Is Jacob actually due, or recently fed and just unsettled?", why: "A baby who fed 40 minutes ago may not be hungry. If it's not hunger, the settling protocol may fit better than forcing a feed." },
      { text: "Calm the environment. Dim, quiet, skin-to-skin if you can.", why: "An overstimulated or overtired baby won't latch or take a teat well. Resetting the room often fixes a 'refusal' on its own." },
      { text: "For breast: hand Jhomaira a calm space and let her re-offer.", why: "Latching improves when mum is relaxed and supported. Your job is to remove friction — water, pillow, quiet." },
      { text: "For bottle: check temperature, flow, and position, then re-offer.", why: "Cold milk, fast flow, or a flat position cause refusal. Paced feeding semi-upright usually works.", howto: "latch" },
      { text: "Offer, pause, re-try. Don't force.", why: "Forcing creates aversion. A short break then another calm attempt beats pushing through a fight.", timer: { seconds: 300, label: "Pause & re-try" } },
    ],
    outcome: { tone: "watch", title: "If refusal continues", softHandoff: true, text: "An occasional skipped or small feed isn't an emergency if Jacob is otherwise content and having wet nappies. But repeated refusal across several feeds, fewer wet nappies, or seeming unwell warrants a call to your provider for advice." },
  },

  reassure: {
    title: "Worried? A quick reassurance check",
    icon: "🩺",
    type: "linear",
    source: "Raising Children Network / Pregnancy, Birth & Baby",
    softHandoff: true,
    intro: "A calm, ordered check — not a diagnosis. Trust your instinct, you know Jacob. Work through it; the protocol won't tell you what's wrong, only when to call.",
    steps: [
      { text: "Check feeding and wet nappies over the day.", why: "Output is a reliable window into a newborn's wellbeing. Roughly 6+ wet nappies a day (from day 5) and regular feeds is reassuring." },
      { text: "Look at his colour, tone and alertness.", why: "A baby who is pink, rousable, and has normal muscle tone is reassuring, even if grizzly." },
      { text: "Watch his breathing for a short while.", why: "Calm, regular breathing is reassuring. A newborn's rate can be slightly irregular at rest — that's normal.", timer: { seconds: 30, label: "Observe breathing" } },
      { text: "Notice anything that's actually changed — not just 'he seems off'.", why: "Trust your instinct, but pin down what's different. A specific change is more useful information for a provider than a feeling." },
    ],
    outcome: { tone: "watch", title: "Trust your read", softHandoff: true, text: "If everything above looks normal, that's reassuring — keep watching as you normally would. If something still feels wrong, or anything changes, that's exactly what your provider's advice line is for." },
  },
};

// ---- How-to slide-up sheet ----
function HowToSheet({ id, close }) {
  const h = HOWTOS[id];
  if (!h) return null;
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: "22px 22px 0 0", padding: "20px 20px 28px", width: "100%", maxWidth: 480, maxHeight: "82vh", overflowY: "auto", borderTop: `1px solid ${C.accentBorder}`, animation: "slideIn 0.25s" }}>
        <div style={{ width: 40, height: 4, background: C.cardHi, borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ fontSize: 30 }}>{h.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 1 }}>{h.title.toUpperCase()}</div>
            {h.source && <div style={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1, color: C.muted2, marginTop: 2 }}>SOURCE: {h.source.toUpperCase()}</div>}
          </div>
        </div>
        {h.body.map((b, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.accent, marginBottom: 5 }}>{b.h.toUpperCase()}</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: C.text }}>{b.t}</div>
          </div>
        ))}
        <button onClick={close} style={{ ...bigBtn(), marginTop: 6 }}>Back to protocol</button>
      </div>
    </div>
  );
}

// ---- Step timer (countdown + manual; silent visual + vibration) ----
function StepTimer({ seconds, label, done, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(ref.current);
          setRunning(false);
          setFinished(true);
          if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div style={{ background: finished ? C.accentDim : C.bg, border: `1px solid ${finished ? C.accentBorder : C.border}`, borderRadius: 12, padding: 14, marginTop: 12, transition: "all 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: finished ? C.accent : C.muted2 }}>
          {finished ? "✓ TIME'S UP" : (label || "TIMER").toUpperCase()}
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: 2, color: finished ? C.accent : C.text, lineHeight: 1 }}>
          {mm}:{ss}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {!finished && !running && (
          <button onClick={() => setRunning(true)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: C.accent, color: "#000", fontWeight: 700, fontSize: 12.5, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
            {remaining < seconds ? "RESUME" : "START TIMER"}
          </button>
        )}
        {running && (
          <button onClick={() => { clearInterval(ref.current); setRunning(false); }} style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 600, fontSize: 12.5, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
            PAUSE
          </button>
        )}
        {!done && (
          <button onClick={onDone} style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${finished ? "transparent" : C.border}`, background: finished ? C.accent : "transparent", color: finished ? "#000" : C.muted2, fontWeight: 600, fontSize: 12.5, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
            DONE — NEXT
          </button>
        )}
      </div>
      {!finished && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 8, textAlign: "center" }}>Start it and put the phone down — it'll buzz when the time's up. Or tap Done whenever you're ready.</div>}
    </div>
  );
}

// ---- Linear runner ----
function LinearRunner({ proto, onExit, openHowTo }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false); // show outcome
  const step = proto.steps[i];
  const last = i >= proto.steps.length - 1;

  if (show) return <OutcomeCard outcome={proto.outcome} onExit={onExit} />;

  return (
    <div style={{ animation: "fadeUp 0.2s" }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 11, color: C.muted, margin: "14px 2px 10px", display: "flex", justifyContent: "space-between" }}>
        <span>STEP {i + 1} / {proto.steps.length}</span>
        <span>{proto.title.toUpperCase()}</span>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 18, lineHeight: 1.5, fontWeight: 500, marginBottom: 12 }}>{step.text}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.muted2, borderLeft: `2px solid ${C.accentBorder}`, paddingLeft: 12 }}>{step.why}</div>

        {step.howto && (
          <button onClick={() => openHowTo(step.howto)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 14, padding: "12px 14px", borderRadius: 11, border: `1px solid ${C.accentBorder}`, background: C.accentDim, color: C.accent, cursor: "pointer", fontFamily: fonts.body }}>
            <span style={{ fontSize: 20 }}>{HOWTOS[step.howto]?.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, textAlign: "left", flex: 1 }}>How do I do this?</span>
            <span style={{ fontSize: 16 }}>›</span>
          </button>
        )}

        {step.timer && <StepTimer seconds={step.timer.seconds} label={step.timer.label} done={false} onDone={() => last ? setShow(true) : setI(i + 1)} />}
      </div>

      {!step.timer && (
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {i > 0 && <button onClick={() => setI(i - 1)} style={{ ...bigBtn(), background: C.card, color: C.text, border: `1px solid ${C.border}`, flex: 1, marginTop: 0 }}>← Back</button>}
          <button onClick={() => last ? setShow(true) : setI(i + 1)} style={{ ...bigBtn(), flex: 2, marginTop: 0 }}>{last ? "Finish →" : "Next step →"}</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
        {proto.steps.map((_, k) => (
          <div key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 4, background: k <= i ? C.accent : C.cardHi, transition: "all 0.2s" }} />
        ))}
      </div>
    </div>
  );
}

// ---- Branch runner ----
function BranchRunner({ proto, onExit, openHowTo }) {
  const [nodeId, setNodeId] = useState(proto.start);
  const [history, setHistory] = useState([]);
  const node = proto.nodes[nodeId];

  const go = (next) => { setHistory((h) => [...h, nodeId]); setNodeId(next); };
  const back = () => { const h = [...history]; const prev = h.pop(); setHistory(h); setNodeId(prev); };

  if (node.kind === "outcome") return <OutcomeCard outcome={node} onExit={onExit} onBack={history.length ? back : null} />;

  return (
    <div style={{ animation: "fadeUp 0.2s" }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 11, color: C.muted, margin: "14px 2px 10px", display: "flex", justifyContent: "space-between" }}>
        <span>CHECK</span><span>{proto.title.toUpperCase()}</span>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 18, lineHeight: 1.5, fontWeight: 500, marginBottom: 12 }}>{node.text}</div>
        {node.why && <div style={{ fontSize: 13.5, lineHeight: 1.55, color: C.muted2, borderLeft: `2px solid ${C.accentBorder}`, paddingLeft: 12 }}>{node.why}</div>}

        {node.howto && (
          <button onClick={() => openHowTo(node.howto)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 14, padding: "12px 14px", borderRadius: 11, border: `1px solid ${C.accentBorder}`, background: C.accentDim, color: C.accent, cursor: "pointer", fontFamily: fonts.body }}>
            <span style={{ fontSize: 20 }}>{HOWTOS[node.howto]?.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, textAlign: "left", flex: 1 }}>How do I do this?</span>
            <span style={{ fontSize: 16 }}>›</span>
          </button>
        )}

        {node.kind === "step" && node.timer && <StepTimer seconds={node.timer.seconds} label={node.timer.label} done={false} onDone={() => go(node.next)} />}
      </div>

      {node.kind === "step" && !node.timer && (
        <button onClick={() => go(node.next)} style={{ ...bigBtn() }}>Done — next check →</button>
      )}

      {node.kind === "decision" && (
        <div style={{ marginTop: 14 }}>
          {node.question && <div style={{ fontSize: 13, color: C.muted2, marginBottom: 10, textAlign: "center" }}>{node.question}</div>}
          {node.options.map((o, k) => (
            <button key={k} onClick={() => go(o.next)} style={{ width: "100%", textAlign: "left", padding: "15px 16px", borderRadius: 12, marginBottom: 9, cursor: "pointer", fontFamily: fonts.body, fontSize: 14.5, fontWeight: 500, border: `1px solid ${o.tone === "call" ? "rgba(255,90,90,0.3)" : C.border}`, background: o.tone === "call" ? "rgba(255,90,90,0.08)" : C.card, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: o.tone === "call" ? C.danger : C.accent, flexShrink: 0 }} />
              {o.label}
            </button>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <button onClick={back} style={{ ...backBtn(), display: "block", margin: "14px auto 0" }}>← Previous check</button>
      )}
    </div>
  );
}

// ---- Outcome card ----
function OutcomeCard({ outcome, onExit, onBack }) {
  const call = outcome.tone === "call";
  return (
    <div style={{ animation: "fadeUp 0.2s" }}>
      <div style={{ background: call ? "rgba(255,90,90,0.08)" : C.accentDim, border: `1px solid ${call ? "rgba(255,90,90,0.3)" : C.accentBorder}`, borderRadius: 16, padding: 22, marginTop: 16 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: call ? C.danger : C.accent, marginBottom: 10 }}>
          {call ? "ACTION NEEDED" : "OUTCOME"}
        </div>
        <div style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 0.5, marginBottom: 12, color: call ? "#ffb0b0" : C.text }}>{outcome.title}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, color: C.text }}>{outcome.text}</div>
        {outcome.softHandoff && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 12.5, lineHeight: 1.55, color: C.muted2 }}>
            If you're worried, or it doesn't feel right, that's a call to your provider — GP, child & family health nurse, or Pregnancy, Birth & Baby <b style={{ color: C.text }}>1800 882 436</b> (7am–midnight, 7 days). You're never wasting their time with a newborn.
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {onBack && <button onClick={onBack} style={{ ...bigBtn(), background: C.card, color: C.text, border: `1px solid ${C.border}`, flex: 1, marginTop: 0 }}>← Back</button>}
        <button onClick={onExit} style={{ ...bigBtn(), flex: 2, marginTop: 0 }}>Close protocol</button>
      </div>
    </div>
  );
}

// ---- Protocols home + router ----
function Protocols({ user }) {
  const [active, setActive] = useState(null);
  const [howTo, setHowTo] = useState(null);
  const [ama, setAma] = useState(false);

  if (ama) return <AMA close={() => setAma(false)} user={user} />;

  if (active) {
    const proto = PROTOCOLS[active];
    return (
      <div style={{ animation: "fadeUp 0.25s" }}>
        <button onClick={() => setActive(null)} style={backBtn()}>← All protocols</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 6px" }}>
          <div style={{ fontSize: 30 }}>{proto.icon}</div>
          <div style={{ fontFamily: fonts.display, fontSize: 26, letterSpacing: 1 }}>{proto.title}</div>
        </div>
        {proto.intro && <div style={{ fontSize: 13.5, color: C.muted2, lineHeight: 1.5, marginBottom: 4 }}>{proto.intro}</div>}
        {proto.source && <div style={{ fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1, color: C.muted, marginBottom: 10 }}>SOURCE: {proto.source.toUpperCase()}</div>}

        {proto.type === "linear"
          ? <LinearRunner proto={proto} onExit={() => setActive(null)} openHowTo={setHowTo} />
          : <BranchRunner proto={proto} onExit={() => setActive(null)} openHowTo={setHowTo} />}

        {howTo && <HowToSheet id={howTo} close={() => setHowTo(null)} />}
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp 0.3s" }}>
      <Label>What's happening right now?</Label>
      {Object.entries(PROTOCOLS).map(([k, p], i) => (
        <button key={k} onClick={() => setActive(k)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", marginBottom: 10, cursor: "pointer", color: C.text, animation: `fadeUp 0.3s ${i * 0.05}s both` }}>
          <span style={{ fontSize: 24 }}>{p.icon}</span>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 500 }}>{p.title}</div>
            <div style={{ fontSize: 11.5, color: C.muted2 }}>{p.type === "branch" ? "Guided assessment" : `${p.steps.length}-step workflow`}</div>
          </div>
          <span style={{ color: C.muted, fontSize: 18 }}>›</span>
        </button>
      ))}

      <button onClick={() => setAma(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: "16px", marginTop: 6, cursor: "pointer", color: C.text }}>
        <span style={{ fontSize: 24 }}>💬</span>
        <div style={{ textAlign: "left", flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600 }}>Ask the SOP library</div>
          <div style={{ fontSize: 12, color: C.muted2 }}>Describe it in your words → exact protocol</div>
        </div>
        <span style={{ color: C.accent, fontSize: 18 }}>›</span>
      </button>
    </div>
  );
}

// ============================================================
// AMA (stubbed Claude — real API in React build)
// ============================================================
function AMA({ close, user }) {
  const [msgs, setMsgs] = useState([
    { role: "assistant", text: `I've got Jacob's context — last fed 2h45m ago, you're on shift. What's going on?` },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = () => {
    if (!input.trim()) return;
    const q = input.trim();
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "assistant", text: stubReply(q) }]);
    }, 600);
  };

  return (
    <div style={{ animation: "fadeUp 0.25s", display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      <button onClick={close} style={backBtn()}>← Protocols</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 14px" }}>
        <div style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 1 }}>SOP ASSISTANT</div>
        <div style={{ fontSize: 9, fontFamily: fonts.mono, background: C.accentDim, color: C.accent, padding: "3px 8px", borderRadius: 12, border: `1px solid ${C.accentBorder}` }}>JACOB-AWARE</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{ maxWidth: "82%", background: m.role === "user" ? C.accent : C.card, color: m.role === "user" ? "#000" : C.text, border: m.role === "user" ? "none" : `1px solid ${C.border}`, borderRadius: 14, padding: "11px 14px", fontSize: 14.5, lineHeight: 1.5, fontWeight: m.role === "user" ? 500 : 400 }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Describe what's happening…" style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 14.5, fontFamily: fonts.body, outline: "none" }} />
        <button onClick={send} style={{ background: C.accent, border: "none", borderRadius: 12, padding: "0 18px", color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 16 }}>↑</button>
      </div>
      <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 8, fontFamily: fonts.mono }}>DEMO REPLIES · REAL CLAUDE API IN FULL BUILD</div>
    </div>
  );
}

function stubReply(q) {
  const l = q.toLowerCase();
  if (l.includes("sleep") || l.includes("settle")) return "Jacob's often tired after 1–1.5 hours awake. Dark room, white noise, snug swaddle. Feed-to-sleep is fine right now — don't fight it. Want me to open the settling protocol?";
  if (l.includes("feed") || l.includes("hungry")) return "He fed 2h45m ago, so hunger is plausible. For combo feeding, offer breast first then top up with bottle if still rooting. Track the bottle volume so we can spot a pattern.";
  if (l.includes("cry")) return "Run the quick checklist first: hungry, wet, tired, wind, temperature. He's due a feed soon based on timing. If it's not hunger, try upright holding for wind. Calm voice — your heart rate sets his.";
  if (l.includes("burp") || l.includes("wind")) return "Three positions work: over the shoulder, sitting upright on your lap supporting his jaw, or face-down along your forearm. A few minutes each. Not every feed brings a burp up — that's fine.";
  return "Tell me a bit more — is this about sleep, feeding, crying, or how you're holding up? I'll point you to the exact protocol.";
}


// ============================================================
// INSIGHTS
// ============================================================
function Insights({ feeds, sleeps, temps, tempAlert, lastTemp, user }) {
  const suggestions = [
    { icon: "🌙", text: "Jhomaira has taken the 2 AM shift 3 nights running. Worth rotating tonight so she can recover — she's 5 days post C-section.", tag: "SHIFT BALANCE" },
    { icon: "📈", text: "Jacob's longest sleep stretch has grown from 1h50m to 2h40m over 4 nights. The evening routine is working. Keep it identical.", tag: "PROGRESS" },
    { icon: "🍼", text: "Feeds are clustering in the early evening (5–8 PM). This 'cluster feeding' is normal and often precedes a longer night stretch.", tag: "PATTERN" },
  ];

  // simple bar data
  const sleepTrend = [110, 95, 140, 130, 160, 155, 175];
  const max = Math.max(...sleepTrend);

  return (
    <div style={{ animation: "fadeUp 0.3s" }}>
      {tempAlert && (
        <div style={{ background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 14, padding: 16, marginBottom: 14, animation: "fadeUp 0.2s" }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.danger, marginBottom: 8 }}>LIVE NUDGE · ACTION NEEDED</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "#ffb0b0" }}>
            Last reading was <b>{lastTemp.c.toFixed(1)}°C</b> ({agoStr(lastTemp.at)}). 38°C or higher in a baby under 3 months warrants a call to your provider — GP, child & family health nurse, or Pregnancy, Birth & Baby 1800 882 436 — day or night.
          </div>
        </div>
      )}

      <Label>Smart Suggestions</Label>
      {suggestions.map((s, i) => (
        <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 15, marginBottom: 10, animation: `fadeUp 0.3s ${i * 0.06}s both` }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5, color: C.accent, marginBottom: 6 }}>{s.tag}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{s.text}</div>
            </div>
          </div>
        </div>
      ))}

      {temps && temps.length > 0 && (
        <>
          <Label>Temperature · Recent Readings</Label>
          <TempChart temps={temps} />
        </>
      )}

      <Label>Longest Sleep Stretch · 7 nights</Label>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
          {sleepTrend.map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", height: `${(v / max) * 100}%`, background: i === sleepTrend.length - 1 ? C.accent : C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: "4px 4px 0 0", transition: "height 0.4s", minHeight: 8 }} />
              <div style={{ fontFamily: fonts.mono, fontSize: 8.5, color: C.muted }}>{["M", "T", "W", "T", "F", "S", "S"][i]}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted2, marginTop: 12, textAlign: "center" }}>
          Trending up — <b style={{ color: C.accent }}>+59%</b> since Monday
        </div>
      </div>

      <Label>Shift Balance · This Week</Label>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        {[{ n: "Matt", v: 52, c: "#00D26E" }, { n: "Jhomaira", v: 38, c: "#3aa0ff" }, { n: "Omaira", v: 10, c: "#c084fc" }].map((r) => (
          <div key={r.n} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
              <span>{r.n}</span><span style={{ color: C.muted2, fontFamily: fonts.mono }}>{r.v}%</span>
            </div>
            <div style={{ height: 8, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${r.v}%`, height: "100%", background: r.c, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Temp mini line chart (SVG, no deps) ----
function TempChart({ temps }) {
  const pts = [...temps].slice(0, 12).reverse(); // oldest -> newest, cap 12
  const w = 320, h = 110, pad = 14;
  const vals = pts.map((p) => p.c);
  const min = Math.min(36, ...vals) - 0.3;
  const max = Math.max(38.2, ...vals) + 0.3;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, pts.length - 1);
  const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const feverY = y(38);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.c)}`).join(" ");
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 14px" }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        <line x1={pad} x2={w - pad} y1={feverY} y2={feverY} stroke={C.danger} strokeDasharray="3,4" strokeWidth="1" opacity="0.5" />
        <path d={path} fill="none" stroke={C.accent} strokeWidth="2" />
        {pts.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(p.c)} r={p.c >= 38 ? 4 : 3} fill={p.c >= 38 ? C.danger : C.accent} />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted2, marginTop: 4 }}>
        <span>{pts.length ? agoStr(pts[0].at) : ""}</span>
        <span style={{ fontFamily: fonts.mono, color: C.danger }}>– – 38°C fever line</span>
        <span>{pts.length ? agoStr(pts[pts.length - 1].at) : ""}</span>
      </div>
    </div>
  );
}

// ============================================================
// LIBRARY
// ============================================================
function Library({ user }) {
  const [section, setSection] = useState("guides");
  const guides = [
    { cat: "SLEEP", title: "Wake windows for newborns", icon: "🌙", source: "Raising Children Network" },
    { cat: "FEEDING", title: "Combo feeding: breast + bottle without nipple confusion", icon: "🍼", source: "Australian Breastfeeding Association" },
    { cat: "RECOVERY", title: "Supporting Jhomaira's C-section recovery: weeks 1–6", icon: "🩹", source: "The Women's / Better Health Channel" },
    { cat: "YOUR HEAD", title: "Dad anxiety is real — and normal", icon: "🧠", source: "PANDA" },
    { cat: "RELATIONSHIP", title: "Protecting your relationship in the newborn fog", icon: "💬", source: "Raising Children Network" },
    { cat: "DEVELOPMENT", title: "What Jacob can do: week by week", icon: "📈", source: "Raising Children Network" },
  ];

  return (
    <div style={{ animation: "fadeUp 0.3s" }}>
      <div style={{ display: "flex", gap: 8, margin: "18px 0 8px" }}>
        {[["guides", "Guides"], ["protocols", "SOP Library"], ["ama", "AMA"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setSection(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${section === k ? C.accentBorder : C.border}`, background: section === k ? C.accentDim : C.card, color: section === k ? C.accent : C.muted2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}>
            {lbl}
          </button>
        ))}
      </div>

      {section === "guides" && guides.map((g, i) => (
        <button key={i} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 15, marginTop: 10, cursor: "pointer", color: C.text, animation: `fadeUp 0.3s ${i * 0.04}s both` }}>
          <span style={{ fontSize: 22 }}>{g.icon}</span>
          <div style={{ textAlign: "left", flex: 1 }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5, color: C.accent, marginBottom: 4 }}>{g.cat}</div>
            <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.3 }}>{g.title}</div>
            {g.source && <div style={{ fontFamily: fonts.mono, fontSize: 9, color: C.muted, marginTop: 4 }}>Source: {g.source}</div>}
          </div>
          <span style={{ color: C.muted, fontSize: 18 }}>›</span>
        </button>
      ))}

      {section === "protocols" && (
        <div style={{ marginTop: 12 }}>
          <input placeholder="Search by problem — e.g. 'won't burp'" style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 14, fontFamily: fonts.body, outline: "none", marginBottom: 12 }} />
          <div style={{ fontSize: 12.5, color: C.muted2, lineHeight: 1.6, textAlign: "center", padding: "30px 20px" }}>
            47 individually sourced SOPs live here.<br />
            <span style={{ color: C.muted }}>Searchable by problem, not category. We'll generate these together using Claude in the next phase.</span>
          </div>
        </div>
      )}

      {section === "ama" && (
        <div style={{ marginTop: 12 }}>
          <AMAInline user={user} />
        </div>
      )}
    </div>
  );
}

function AMAInline({ user }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>💬</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Ask Me Anything</div>
      <div style={{ fontSize: 13, color: C.muted2, lineHeight: 1.5 }}>
        Context-aware Claude that knows Jacob's age, feeding method, last feed and your current shift. Locked to newborn care, feeding, sleep, recovery and your wellbeing. Live in the full build.
      </div>
    </div>
  );
}

// ============================================================
// QUICK LOG FAB
// ============================================================
function QuickLogFab({ open, setOpen, addFeed, addNappy, addSleep, addTemp }) {
  const [view, setView] = useState(null);
  const [toast, setToast] = useState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const close = () => { setOpen(false); setView(null); };

  return (
    <>
      {toast && <div style={{ position: "fixed", bottom: 150, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#000", padding: "10px 18px", borderRadius: 30, fontWeight: 600, fontSize: 13.5, zIndex: 300, animation: "fadeUp 0.2s", boxShadow: "0 8px 30px rgba(0,210,110,0.4)" }}>✓ {toast}</div>}

      <button onClick={() => setOpen(true)} style={{ position: "fixed", bottom: 86, right: 18, width: 58, height: 58, borderRadius: "50%", background: C.accent, border: "none", color: "#000", fontSize: 28, fontWeight: 300, cursor: "pointer", zIndex: 200, boxShadow: "0 8px 30px rgba(0,210,110,0.45)", maxWidth: 480, display: "grid", placeItems: "center" }}>
        +
      </button>

      {open && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 250, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: "22px 22px 0 0", padding: 20, width: "100%", maxWidth: 480, borderTop: `1px solid ${C.border}`, animation: "slideIn 0.25s" }}>
            <div style={{ width: 40, height: 4, background: C.cardHi, borderRadius: 2, margin: "0 auto 18px" }} />

            {!view && (
              <>
                <div style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, marginBottom: 16 }}>QUICK LOG</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <LogBtn icon="🍼" label="Feed" onClick={() => setView("feed")} />
                  <LogBtn icon="👶" label="Nappy" onClick={() => setView("nappy")} />
                  <LogBtn icon="😴" label="Sleep" onClick={() => setView("sleep")} />
                  <LogBtn icon="🌡️" label="Add Temp" onClick={() => setView("temp")} />
                </div>
              </>
            )}

            {view === "feed" && (
              <FeedLog onSave={(f) => { addFeed(f); flash("Feed logged"); close(); }} back={() => setView(null)} />
            )}
            {view === "nappy" && (
              <div>
                <SheetTitle back={() => setView(null)}>Nappy</SheetTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {["Wet", "Dirty", "Both"].map((t) => (
                    <button key={t} onClick={() => { addNappy(t.toLowerCase()); flash("Nappy logged"); close(); }} style={logChoice()}>{t}</button>
                  ))}
                </div>
              </div>
            )}
            {view === "sleep" && (
              <div>
                <SheetTitle back={() => setView(null)}>Sleep</SheetTitle>
                <button onClick={() => { addSleep({ start: now(), end: null }); flash("Sleep started"); close(); }} style={{ ...bigBtn(), marginTop: 4 }}>Start sleep now</button>
              </div>
            )}
            {view === "temp" && (
              <TempLog onSave={(c) => { addTemp(c); flash(c >= 38 ? "Temp logged — 38°C+" : "Temp logged"); close(); }} back={() => setView(null)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TempLog({ onSave, back }) {
  const [c, setC] = useState(36.8);
  const high = c >= 38;
  return (
    <div>
      <SheetTitle back={back}>Add Temp</SheetTitle>
      <div style={{ textAlign: "center", margin: "10px 0 18px" }}>
        <div style={{ fontFamily: fonts.display, fontSize: 56, color: high ? C.danger : C.accent, lineHeight: 1 }}>{c.toFixed(1)}°C</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted2, marginTop: 6 }}>NORMAL RANGE 36.5–38°C · ARMPIT READING</div>
      </div>
      <input type="range" min="35" max="40" step="0.1" value={c} onChange={(e) => setC(parseFloat(e.target.value))} style={{ width: "100%", accentColor: high ? C.danger : C.accent, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[36.5, 36.8, 37.2, 37.8, 38.2].map((v) => (
          <button key={v} onClick={() => setC(v)} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.muted2, fontSize: 12, fontFamily: fonts.mono, cursor: "pointer" }}>{v}</button>
        ))}
      </div>
      {high && (
        <div style={{ background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 12, padding: 13, fontSize: 13, lineHeight: 1.5, color: "#ffb0b0", marginBottom: 14 }}>
          38°C or higher in a baby under 3 months always warrants a call to your provider — GP, child & family health nurse, or Pregnancy, Birth & Baby 1800 882 436 — day or night, even if he seems okay otherwise.
        </div>
      )}
      <button onClick={() => onSave(c)} style={bigBtn()}>Save reading</button>
    </div>
  );
}

function FeedLog({ onSave, back }) {
  const [mode, setMode] = useState("breast");
  const [side, setSide] = useState("L");
  const [vol, setVol] = useState(60);
  return (
    <div>
      <SheetTitle back={back}>Feed</SheetTitle>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {["breast", "bottle"].map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1px solid ${mode === m ? C.accentBorder : C.border}`, background: mode === m ? C.accentDim : C.card, color: mode === m ? C.accent : C.muted2, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: fonts.body, textTransform: "capitalize" }}>{m}</button>
        ))}
      </div>
      {mode === "breast" ? (
        <div style={{ display: "flex", gap: 10 }}>
          {["L", "R", "Both"].map((s) => (
            <button key={s} onClick={() => setSide(s)} style={{ ...logChoice(), background: side === s ? C.accentDim : C.card, borderColor: side === s ? C.accentBorder : C.border, color: side === s ? C.accent : C.text }}>{s}</button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ textAlign: "center", fontFamily: fonts.display, fontSize: 40, color: C.accent }}>{vol}<span style={{ fontSize: 18, color: C.muted2 }}>ml</span></div>
          <input type="range" min="10" max="180" step="10" value={vol} onChange={(e) => setVol(+e.target.value)} style={{ width: "100%", accentColor: C.accent }} />
        </div>
      )}
      <button onClick={() => onSave(mode === "breast" ? { type: "breast", side } : { type: "bottle", vol })} style={{ ...bigBtn(), marginTop: 18 }}>Save feed</button>
    </div>
  );
}

function SheetTitle({ children, back }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <button onClick={back} style={{ background: "none", border: "none", color: C.muted2, fontSize: 20, cursor: "pointer" }}>←</button>
      <div style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 1 }}>{children.toUpperCase()}</div>
    </div>
  );
}

function LogBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 10px", cursor: "pointer", color: C.text, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

// ============================================================
// MORE SHEET
// ============================================================
function MoreSheet({ close, open }) {
  const items = [
    { k: "daily3", icon: "🎯", label: "Daily 3", sub: "Today's three anchors" },
    { k: "log", icon: "📓", label: "Daily Log", sub: "Private — how are you doing?" },
    { k: "milestones", icon: "🌱", label: "Milestones", sub: "Jacob's growth & firsts" },
    { k: "settings", icon: "⚙️", label: "Settings", sub: "People, baby, preferences" },
  ];
  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 250, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: "22px 22px 0 0", padding: 20, width: "100%", maxWidth: 480, borderTop: `1px solid ${C.border}`, animation: "slideIn 0.25s" }}>
        <div style={{ width: 40, height: 4, background: C.cardHi, borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, marginBottom: 16 }}>MORE</div>
        {items.map((it) => (
          <button key={it.k} onClick={() => open(it.k)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 15, marginBottom: 10, cursor: "pointer", color: C.text }}>
            <span style={{ fontSize: 24 }}>{it.icon}</span>
            <div style={{ textAlign: "left", flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{it.label}</div>
              <div style={{ fontSize: 12, color: C.muted2 }}>{it.sub}</div>
            </div>
            <span style={{ color: C.muted, fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MORE SCREENS
// ============================================================
function MoreScreen({ screen, close, user, dailyLogs, addDailyLog }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 280, maxWidth: 480, margin: "0 auto", overflowY: "auto", animation: "fadeUp 0.2s" }}>
      <div style={{ padding: "16px 16px 100px" }}>
        <button onClick={close} style={backBtn()}>← Close</button>
        {screen === "daily3" && <Daily3 user={user} />}
        {screen === "log" && <DailyLog user={user} entries={dailyLogs[user.id] || []} addEntry={(e) => addDailyLog(user.id, e)} />}
        {screen === "milestones" && <Milestones />}
        {screen === "settings" && <Settings />}
      </div>
    </div>
  );
}

// ---- Daily 3 ----
function Daily3({ user }) {
  const [mood, setMood] = useState(null);
  const [done, setDone] = useState([false, false, false]);
  const tasks = mood
    ? mood <= 2
      ? ["Rest when Jacob rests — actually lie down", "One small win: shower or a proper meal", "Ask Jhomaira what she needs most today"]
      : ["10 min skin-to-skin with Jacob", "Prep tomorrow's bottles & wash pump parts", "Take Jhomaira a glass of water without being asked"]
    : [];
  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: 1, margin: "10px 0 4px" }}>DAILY 3</div>
      <div style={{ color: C.muted2, fontSize: 13.5, marginBottom: 20 }}>Three things. That's it. Win the day.</div>

      {!mood ? (
        <>
          <Label>First — how are you feeling today?</Label>
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            {[["😞", 1], ["😕", 2], ["😐", 3], ["🙂", 4], ["💪", 5]].map(([e, v]) => (
              <button key={v} onClick={() => setMood(v)} style={{ flex: 1, aspectRatio: "1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 26, cursor: "pointer" }}>{e}</button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: 13, fontSize: 13.5, marginBottom: 18 }}>
            {mood <= 2 ? "Rough one. Today's three are lighter — survival is the goal." : "Solid. Here are your three for today."}
          </div>
          {tasks.map((t, i) => (
            <button key={i} onClick={() => setDone(done.map((d, j) => j === i ? !d : d))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: done[i] ? C.accentDim : C.card, border: `1px solid ${done[i] ? C.accentBorder : C.border}`, borderRadius: 14, padding: 16, marginBottom: 10, cursor: "pointer", color: C.text }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${done[i] ? C.accent : C.muted}`, background: done[i] ? C.accent : "transparent", display: "grid", placeItems: "center", color: "#000", fontWeight: 700, flexShrink: 0 }}>{done[i] ? "✓" : ""}</div>
              <span style={{ fontSize: 14.5, textAlign: "left", textDecoration: done[i] ? "line-through" : "none", opacity: done[i] ? 0.6 : 1 }}>{t}</span>
            </button>
          ))}
          {done.every(Boolean) && <div style={{ textAlign: "center", color: C.accent, fontWeight: 600, marginTop: 16, animation: "fadeUp 0.3s" }}>🎯 All three done. That's the day won.</div>}
        </>
      )}
    </div>
  );
}

// ---- Daily Log (private journal, persisted in-memory) ----
function DailyLog({ user, entries, addEntry }) {
  const [mode, setMode] = useState(entries.length ? "history" : "new");
  const [scores, setScores] = useState({ night: 0, rel: 0, conf: 0, energy: 0 });
  const [mind, setMind] = useState("");
  const [win, setWin] = useState("");
  const [tag, setTag] = useState(null);
  const [justSaved, setJustSaved] = useState(null);

  const set = (k, v) => setScores({ ...scores, [k]: v });
  const rows = [["night", "Last night"], ["rel", "Relationship"], ["conf", "Confidence"], ["energy", "Energy"]];
  const tags = ["Hard day", "Good day", "Survival mode", "Turning point"];

  const reflectionFor = (s) => s.night <= 2
    ? "Rough night and you still showed up and logged it. That's the job. Tomorrow's another shift."
    : "Good rhythm today. Bank it — these are the days that carry you through the hard ones.";

  const save = () => {
    const reflection = reflectionFor(scores);
    addEntry({ scores, mind, win, tag, reflection });
    setJustSaved(reflection);
    setScores({ night: 0, rel: 0, conf: 0, energy: 0 });
    setMind(""); setWin(""); setTag(null);
  };

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: 1, margin: "10px 0 4px" }}>DAILY LOG</div>
      <div style={{ color: C.muted2, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <span>🔒</span> Private to {user.name}. Not shared with anyone.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["new", "New Entry"], ["history", `History (${entries.length})`]].map(([k, lbl]) => (
          <button key={k} onClick={() => { setMode(k); setJustSaved(null); }} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${mode === k ? C.accentBorder : C.border}`, background: mode === k ? C.accentDim : C.card, color: mode === k ? C.accent : C.muted2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}>{lbl}</button>
        ))}
      </div>

      {mode === "new" && (justSaved ? (
        <div style={{ animation: "fadeUp 0.3s" }}>
          <div style={{ background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 13, color: C.accent, fontFamily: fonts.mono, marginBottom: 10 }}>REFLECTION</div>
            <div style={{ fontSize: 16, lineHeight: 1.6, fontStyle: "italic" }}>"{justSaved}"</div>
          </div>
          <button onClick={() => setMode("history")} style={{ ...bigBtn(), marginTop: 16 }}>View history</button>
        </div>
      ) : (
        <div>
          <Label>Quick check-in</Label>
          {rows.map(([k, lbl]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: C.muted2, marginBottom: 7 }}>{lbl}</div>
              <div style={{ display: "flex", gap: 7 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} onClick={() => set(k, v)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1px solid ${scores[k] === v ? C.accentBorder : C.border}`, background: scores[k] === v ? C.accent : C.card, color: scores[k] === v ? "#000" : C.muted2, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{v}</button>
                ))}
              </div>
            </div>
          ))}

          <Label>Day tag</Label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
            {tags.map((t) => (
              <button key={t} onClick={() => setTag(t)} style={{ padding: "8px 13px", borderRadius: 20, border: `1px solid ${tag === t ? C.accentBorder : C.border}`, background: tag === t ? C.accentDim : C.card, color: tag === t ? C.accent : C.muted2, fontSize: 12.5, cursor: "pointer" }}>{t}</button>
            ))}
          </div>

          <Label>What's on your mind?</Label>
          <textarea value={mind} onChange={(e) => setMind(e.target.value)} placeholder="Free write. No one sees this but you." rows={4} style={ta()} />

          <Label>One thing that went well</Label>
          <textarea value={win} onChange={(e) => setWin(e.target.value)} placeholder="Even on hard days, find one." rows={2} style={ta()} />

          <button onClick={save} style={{ ...bigBtn(), marginTop: 18 }}>Save today's log</button>
        </div>
      ))}

      {mode === "history" && (
        <div>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted2, fontSize: 13.5, padding: "30px 10px" }}>No entries yet. Your first one is one tap away.</div>
          ) : entries.map((e) => (
            <div key={e.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: C.muted2 }}>{e.date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</div>
                {e.tag && <div style={{ fontSize: 10.5, color: C.accent, background: C.accentDim, border: `1px solid ${C.accentBorder}`, padding: "3px 9px", borderRadius: 10 }}>{e.tag}</div>}
              </div>
              <div style={{ display: "flex", gap: 14, marginBottom: e.mind || e.win ? 10 : 0, fontSize: 11.5, color: C.muted2 }}>
                <span>Night {e.scores.night}/5</span><span>Rel {e.scores.rel}/5</span><span>Conf {e.scores.conf}/5</span><span>Energy {e.scores.energy}/5</span>
              </div>
              {e.mind && <div style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 6 }}>{e.mind}</div>}
              {e.win && <div style={{ fontSize: 13, lineHeight: 1.5, color: C.accent }}>✓ {e.win}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 16, fontFamily: fonts.mono }}>PRIVATE TO {user.name.toUpperCase()} · NOT SHARED</div>
    </div>
  );
}

// ---- Milestones (post-birth; replaces Go-Day) ----
const MILESTONE_CATEGORIES = [
  { k: "physical", label: "Physical", icon: "💪" },
  { k: "social", label: "Social", icon: "😊" },
  { k: "feeding", label: "Feeding", icon: "🍼" },
  { k: "sleep", label: "Sleep", icon: "😴" },
];

function Milestones() {
  const milestonesT = useLiveTable("milestones", {
    mapRow: (r) => ({ id: r.id, cat: r.category, title: r.title, notes: r.notes, date: r.date_label }),
  });
  const items = milestonesT.rows;
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");

  const add = (m) => { milestonesT.add({ category: m.cat, title: m.title, notes: m.notes, date_label: m.date }); setAdding(false); };
  const shown = filter === "all" ? items : items.filter((i) => i.cat === filter);

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: 1, margin: "10px 0 4px" }}>MILESTONES</div>
      <div style={{ color: C.muted2, fontSize: 13.5, marginBottom: 16 }}>Jacob's firsts — physical, social, feeding, sleep.</div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={() => setFilter("all")} style={{ padding: "8px 13px", borderRadius: 20, border: `1px solid ${filter === "all" ? C.accentBorder : C.border}`, background: filter === "all" ? C.accentDim : C.card, color: filter === "all" ? C.accent : C.muted2, fontSize: 12.5, cursor: "pointer" }}>All</button>
        {MILESTONE_CATEGORIES.map((c) => (
          <button key={c.k} onClick={() => setFilter(c.k)} style={{ padding: "8px 13px", borderRadius: 20, border: `1px solid ${filter === c.k ? C.accentBorder : C.border}`, background: filter === c.k ? C.accentDim : C.card, color: filter === c.k ? C.accent : C.muted2, fontSize: 12.5, cursor: "pointer" }}>{c.icon} {c.label}</button>
        ))}
      </div>

      <button onClick={() => setAdding(true)} style={{ ...bigBtn(), marginBottom: 18 }}>+ Add a milestone</button>

      {adding && <AddMilestone onSave={add} cancel={() => setAdding(false)} />}

      {shown.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted2, fontSize: 13.5, padding: "30px 10px" }}>Nothing logged in this category yet.</div>
      ) : shown.map((m) => {
        const cat = MILESTONE_CATEGORIES.find((c) => c.k === m.cat);
        return (
          <div key={m.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 10.5, color: C.accent, background: C.accentDim, border: `1px solid ${C.accentBorder}`, padding: "3px 9px", borderRadius: 10 }}>{cat?.icon} {cat?.label}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: 11, color: C.muted2 }}>{m.date}</div>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: m.notes ? 4 : 0 }}>{m.title}</div>
            {m.notes && <div style={{ fontSize: 13, color: C.muted2, lineHeight: 1.5 }}>{m.notes}</div>}
          </div>
        );
      })}
    </div>
  );
}

function AddMilestone({ onSave, cancel }) {
  const [cat, setCat] = useState("physical");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
        {MILESTONE_CATEGORIES.map((c) => (
          <button key={c.k} onClick={() => setCat(c.k)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${cat === c.k ? C.accentBorder : C.border}`, background: cat === c.k ? C.accentDim : C.card, color: cat === c.k ? C.accent : C.muted2, fontSize: 16, cursor: "pointer" }}>{c.icon}</button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: fonts.body, outline: "none", marginBottom: 10 }} />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} style={ta()} />
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={cancel} style={{ ...bigBtn(), background: C.card, color: C.text, border: `1px solid ${C.border}`, flex: 1, marginTop: 0 }}>Cancel</button>
        <button onClick={() => title && onSave({ cat, title, notes, date: now().toLocaleDateString([], { day: "numeric", month: "short" }) })} style={{ ...bigBtn(), flex: 2, marginTop: 0 }}>Save</button>
      </div>
    </div>
  );
}

function CheckRow({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => setC(!c)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: c ? C.accentDim : C.card, border: `1px solid ${c ? C.accentBorder : C.border}`, borderRadius: 11, padding: "12px 14px", marginBottom: 7, cursor: "pointer", color: C.text }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${c ? C.accent : C.muted}`, background: c ? C.accent : "transparent", display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{c ? "✓" : ""}</div>
      <span style={{ fontSize: 14, textAlign: "left", textDecoration: c ? "line-through" : "none", opacity: c ? 0.55 : 1 }}>{text}</span>
    </button>
  );
}

// ---- Settings ----
function Settings() {
  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: 1, margin: "10px 0 18px" }}>SETTINGS</div>
      <Label>Baby</Label>
      <SetRow label="Name" value="Jacob" />
      <SetRow label="Born" value="26 June 2026" />
      <SetRow label="Feeding" value="Breast + Bottle" />
      <Label>People</Label>
      {PEOPLE.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.color, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 13 }}>{p.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: C.muted2, fontFamily: fonts.mono }}>{p.role.toUpperCase()}</div>
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 20, fontFamily: fonts.mono, lineHeight: 1.8 }}>
        DADOPS · PROTOTYPE v0.1<br />IN-MEMORY DEMO · SUPABASE IN FULL BUILD
      </div>
    </div>
  );
}

function SetRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
      <span style={{ fontSize: 14, color: C.muted2 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
function BottomNav({ tab, setTab, openMore }) {
  const items = [
    ["shift", "🔄", "Shift"],
    ["protocols", "⚡", "Protocols"],
    ["insights", "📊", "Insights"],
    ["library", "📚", "Library"],
    ["more", "☰", "More"],
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 6px 12px", zIndex: 150, backdropFilter: "blur(10px)" }}>
      {items.map(([k, icon, label]) => {
        const active = tab === k;
        return (
          <button key={k} onClick={() => k === "more" ? openMore() : setTab(k)} style={{ flex: 1, background: active ? C.accentDim : "transparent", border: "none", borderRadius: 12, padding: "8px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <span style={{ fontSize: 19, filter: active ? "none" : "grayscale(0.6) opacity(0.6)" }}>{icon}</span>
            <span style={{ fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 0.5, textTransform: "uppercase", color: active ? C.accent : C.muted }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// SHARED STYLES
// ============================================================
function bigBtn() {
  return { width: "100%", padding: "15px", borderRadius: 13, border: "none", background: C.accent, color: "#000", fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, cursor: "pointer", marginTop: 12 };
}
function backBtn() {
  return { background: "none", border: "none", color: C.muted2, fontSize: 13.5, cursor: "pointer", padding: "6px 0", fontFamily: fonts.body };
}
function logChoice() {
  return { flex: 1, padding: "16px 0", borderRadius: 11, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: fonts.body };
}
function ta() {
  return { width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, color: C.text, fontSize: 14.5, fontFamily: fonts.body, outline: "none", resize: "none", lineHeight: 1.5 };
}
