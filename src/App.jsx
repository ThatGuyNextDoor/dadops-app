import React, { useState, useEffect, useRef, useMemo, useContext, createContext } from "react";
import { supabase } from "./supabaseClient";
import { useLiveTable } from "./useLiveTable";
import { useWakeLock } from "./hooks/useWakeLock";

// ============================================================
// DadOps — Interactive Prototype
// Tactical Green theme. In-memory state. Phone + Tablet aware.
// ============================================================

const DARK = {
  bg: "#0d1f18",
  surface: "#132b1f",
  card: "#1a3828",
  accent: "#4ade9a",
  text: "#e8f5ee",
  muted: "#a8c4b0",
  muted2: "#7ab898",
  danger: "#f87171",
  border: "#2a5040",
  accentDim: "rgba(74,222,154,0.12)",
  accentBorder: "rgba(74,222,154,0.3)",
  cardHi: "#224535",
};

const LIGHT = {
  bg: "#f0faf4",
  surface: "#ffffff",
  card: "#e8f5ee",
  accent: "#16a05c",
  text: "#0d2b1a",
  muted: "#4a8a6a",
  muted2: "#6aaa86",
  danger: "#dc2626",
  border: "#c0e0ce",
  accentDim: "rgba(22,160,92,0.1)",
  accentBorder: "rgba(22,160,92,0.25)",
  cardHi: "#d4f0e0",
};

// Module-level mutable theme reference. Reassigned by the root
// component on every render (see DadOps below) — no component in
// this file is React.memo'd, so the whole tree re-executes on any
// state change and every `C.xxx` lookup below picks up the new value.
let C = DARK;

// ============================================================
// LANGUAGE / i18n (UI chrome only — NOT medical guidance)
// ============================================================
const STRINGS = {
  en: {
    // Nav
    shift: "Shift", protocols: "Protocols", insights: "Insights", library: "Library", more: "More",
    // TopBar / person picker
    whoAreYou: "WHO ARE YOU?", switchPerson: "Switch person",
    lightMode: "Switch to light mode", darkModeLabel: "Switch to dark mode",
    // People management
    managePeople: "PEOPLE", addPersonBtn: "+ Add", savePerson: "Save",
    inCharge: "IN CHARGE", noOneSet: "—", deactivatingNote: "Deactivating keeps their past log entries intact.",
    activeStatus: "Active", inactiveStatus: "Inactive",
    householdRole: "Household", helperRole: "Helper",
    // Quick log FAB
    quickLog: "QUICK LOG", feed: "Feed", nappy: "Nappy", sleep: "Sleep", addTemp: "Add Temp",
    // Shift
    shiftPlan: "Shift Plan", liveStatus: "Live Status", activityLog: "Activity Log",
    handoffTo: (name) => `Hand off to ${name} →`,
    handedOff: (name) => `✓ Handed off — ${name} is now on shift`,
    lastFeed: "Last Feed", lastNappy: "Last Nappy",
    noFeedsYet: "No feeds yet", noNappiesYet: "No nappies yet",
    noEntries: "No entries yet — use + to log a feed, nappy or sleep.",
    editEntry: "EDIT ENTRY", adjustTime: "ADJUST TIME", saveChanges: "Save changes",
    deleteEntry: "DELETE ENTRY", confirmDelete: "CONFIRM DELETE",
    deleteWarning: "Remove this entry? It stays in the audit trail but won't show in the app.",
    cancel: "Cancel", yesDelete: "Yes, delete",
    // Feed log
    breast: "Breast", bottle: "Bottle", saveReading: "Save reading", saveFeed: "Save feed",
    startBreastfeeding: "Start Breastfeeding", logManually: "Log manually",
    breastSection: "BREAST", bottleSection: "BOTTLE",
    durationMin: "Duration (min)", durationFromTimer: "from timer",
    changeSide: "Change breast", finishFeeding: "Finish feeding",
    feedComboNote: "Fill in what applies — leave the rest blank.",
    startSleep: "Start sleep now", sleepStarted: "Sleep started",
    feedLogged: "Feed logged", nappyLogged: "Nappy changed",
    // Nappy
    nappyUrine: "Urine", nappyNone: "None", nappyLight: "Light",
    nappyNormal: "Normal", nappyHeavy: "Heavy",
    nappyStool: "Stool", nappySoiled: "Soiled",
    feedingNow: "FEEDING NOW",
    // Temp
    tempRange: "NORMAL RANGE 36.5–38°C · ARMPIT READING",
    tempWarning: "38°C or higher in a baby under 3 months always warrants a call to your provider — GP, child & family health nurse, or Pregnancy, Birth & Baby 1800 882 436 — day or night, even if he seems okay otherwise.",
    // Insights
    smartSuggestions: "Smart Suggestions", longestSleep: "Longest Sleep Stretch · 7 nights", shiftBalance: "Shift Balance · Last 24h",
    longestStretch: (name, d) => `${name} has been on longest this stretch — ${d} continuously`,
    holderAttribution: "LAST 24 HOURS", clearHolderHistory: "Clear history older than 7 days", holderHistoryCleared: "Older holder history cleared",
    // Protocols
    whatHappening: "What's happening right now?", askLibrary: "Ask the SOP library",
    askLibrarySub: "Describe it in your words → exact protocol",
    // Handover alarm
    shiftEnding: "SHIFT ENDING",
    handoverBody: (name) => `${name}'s shift is over. Tap to confirm handover.`,
    gotIt: "Got it — Handover confirmed",
    alarmSettings: "ALARM",
    alarmSound: "Sound on handover alarm",
    flashIntensity: "Flash intensity",
    flashLow: "Low", flashMed: "Medium", flashHigh: "High",
    // Misc
    saving: "Saving…", done: "Done",
    onShiftNow: "ON SHIFT NOW", nextUp: "NEXT UP", backup: "BACKUP",
    jacobDashboard: "JACOB · FAMILY DASHBOARD",
    jacobSleeping: "JACOB IS SLEEPING", jacobAwake: "JACOB IS AWAKE",
    heWokeUp: "HE WOKE UP", putDownBy: (name) => `Put down by ${name}`,
    sleptFor: (d) => `Slept ${d}`, wokeAgo: (t) => `woke ${t}`,
    awakenFor: (d) => `${d} awake`, noSleepsYet: "No sleeps logged yet",
    // Routine configuration
    routineSettings: "ROUTINE", routineMenuLabel: "Routine", routineMenuSub: "Feed & sleep targets",
    feedEvery: "Feed every", targetVolume: "Target volume",
    feedType: "Feed type", feedType_formula: "Formula", feedType_breast: "Breast", feedType_combo: "Combo",
    maxAwakeWindow: "Max awake window", expectedNap: "Expected nap", phaseLabel: "Phase label",
    nextFeedDue: (time) => `Next feed due ~${time}`, nextFeedDueUnknown: "Next feed — no data yet",
    // Smart check-in cards
    isJacobStillSleeping: "Is Jacob still sleeping?",
    yesStillSleeping: "Yes, still sleeping",
    heIsAwake: "He's awake",
    timeForAFeed: "Time for a feed?",
    startingNow: "Starting now",
    snooze20: "Snooze 20 min",
    tempCheck: "Temperature check reminder",
    logTempNow: "Log temp now",
    skipForNow: "Skip for now",
    dismissCard: "Dismiss",
    // Ambient mode
    ambientSettings: "AMBIENT MODE", idleBeforeAmbient: "Idle before ambient",
    showInsightsAmbient: "Show insights in ambient", showTipsAmbient: "Show tips in ambient",
    insightLongestSleep: (d) => `Jacob's longest sleep this week: ${d} 🌙`,
    insightFeedsToday: (n) => `${n} feed${n === 1 ? "" : "s"} logged today. You're on top of it 🍼`,
    insightAvgInterval: (d) => `Average feed interval today: ${d} 📊`,
    insightHolderHours: (name, d) => `${name} has had Jacob for ${d} today 💙`,
    // "What's Jacob doing?" prompt (tablet)
    whatsJacobDoing: "What's Jacob up to right now?",
    justWentToSleep: "😴 Just went to sleep",
    startedAFeedBtn: "🍼 Started a feed",
    awakeAndHappy: "☀️ Awake & happy",
    bitUnsettled: "😭 Bit unsettled",
    // "How's today been?" prompt (tablet)
    howsTodayBeen: "☀️ How's today been overall?",
    reallyGood: "🌟 Really good",
    prettyGood: "😊 Pretty good",
    upsAndDowns: "😐 Ups and downs",
    honestlyExhausting: "😴 Honestly exhausting",
    // Baby Metrics
    babyMetrics: "Baby Metrics", logMeasurement: "Log Measurement",
    weightKg: "Weight (kg)", lengthCm: "Length (cm)", headCm: "Head circ. (cm)",
    measuredAgo: (t) => `measured ${t}`,
    noMetricsYet: "No measurements yet",
    saveMetric: "Save measurement",
    // Photos
    gallery: "Gallery", uploadPhoto: "Upload Photo",
    addCaption: "Add a caption (optional)", uploading: "Uploading…",
    noPhotosYet: "No photos yet — take one to start.",
    latestPhotos: "LATEST PHOTOS",
  },
  es: {
    // Nav
    shift: "Turno", protocols: "Protocolos", insights: "Análisis", library: "Biblioteca", more: "Más",
    // TopBar / person picker
    whoAreYou: "¿QUIÉN ERES?", switchPerson: "Cambiar persona",
    lightMode: "Cambiar a modo claro", darkModeLabel: "Cambiar a modo oscuro",
    // People management
    managePeople: "PERSONAS", addPersonBtn: "+ Agregar", savePerson: "Guardar",
    inCharge: "A CARGO", noOneSet: "—", deactivatingNote: "Desactivar mantiene intactos los registros anteriores.",
    activeStatus: "Activo", inactiveStatus: "Inactivo",
    householdRole: "Hogar", helperRole: "Ayudante",
    // Quick log FAB
    quickLog: "REGISTRO RÁPIDO", feed: "Alimentación", nappy: "Pañal", sleep: "Sueño", addTemp: "Temperatura",
    // Shift
    shiftPlan: "Plan de Turno", liveStatus: "Estado Actual", activityLog: "Registro de Actividad",
    handoffTo: (name) => `Pasar turno a ${name} →`,
    handedOff: (name) => `✓ Turno pasado — ${name} está de turno`,
    lastFeed: "Última Comida", lastNappy: "Último Pañal",
    noFeedsYet: "Sin comidas aún", noNappiesYet: "Sin pañales aún",
    noEntries: "Sin entradas aún — usa + para registrar comida, pañal o sueño.",
    editEntry: "EDITAR ENTRADA", adjustTime: "AJUSTAR HORA", saveChanges: "Guardar cambios",
    deleteEntry: "ELIMINAR ENTRADA", confirmDelete: "CONFIRMAR ELIMINACIÓN",
    deleteWarning: "¿Eliminar esta entrada? Queda en el historial pero no se mostrará en la app.",
    cancel: "Cancelar", yesDelete: "Sí, eliminar",
    // Feed log
    breast: "Pecho", bottle: "Biberón", saveReading: "Guardar lectura", saveFeed: "Guardar comida",
    startBreastfeeding: "Iniciar lactancia", logManually: "Registrar manualmente",
    breastSection: "PECHO", bottleSection: "BIBERÓN",
    durationMin: "Duración (min)", durationFromTimer: "del cronómetro",
    changeSide: "Cambiar pecho", finishFeeding: "Finalizar alimentación",
    feedComboNote: "Completa lo que aplique — deja el resto en blanco.",
    startSleep: "Iniciar sueño ahora", sleepStarted: "Sueño iniciado",
    feedLogged: "Comida registrada", nappyLogged: "Pañal cambiado",
    // Nappy
    nappyUrine: "Orina", nappyNone: "Ninguno", nappyLight: "Ligero",
    nappyNormal: "Normal", nappyHeavy: "Abundante",
    nappyStool: "Heces", nappySoiled: "Sucias",
    feedingNow: "ALIMENTANDO",
    // Temp
    tempRange: "RANGO NORMAL 36.5–38°C · LECTURA AXILAR",
    tempWarning: "38°C o más en un bebé menor de 3 meses requiere llamar al médico — GP, enfermera de salud infantil, o Pregnancy, Birth & Baby 1800 882 436 — de día o de noche.",
    // Insights
    smartSuggestions: "Sugerencias Inteligentes", longestSleep: "Mayor Tramo de Sueño · 7 noches", shiftBalance: "Balance de Turnos · Últimas 24h",
    longestStretch: (name, d) => `${name} lleva más tiempo en esta racha — ${d} sin parar`,
    holderAttribution: "ÚLTIMAS 24 HORAS", clearHolderHistory: "Borrar historial de más de 7 días", holderHistoryCleared: "Historial antiguo eliminado",
    // Protocols
    whatHappening: "¿Qué está pasando ahora?", askLibrary: "Consultar la biblioteca",
    askLibrarySub: "Descríbelo en tus palabras → protocolo exacto",
    // Handover alarm
    shiftEnding: "FIN DE TURNO",
    handoverBody: (name) => `El turno de ${name} ha terminado. Toca para confirmar.`,
    gotIt: "Entendido — Relevo confirmado",
    alarmSettings: "ALARMA",
    alarmSound: "Sonido en alarma de turno",
    flashIntensity: "Intensidad del flash",
    flashLow: "Baja", flashMed: "Media", flashHigh: "Alta",
    // Misc
    saving: "Guardando…", done: "Listo",
    onShiftNow: "EN TURNO", nextUp: "PRÓXIMO", backup: "RESERVA",
    jacobDashboard: "JACOB · PANEL FAMILIAR",
    jacobSleeping: "JACOB ESTÁ DURMIENDO", jacobAwake: "JACOB ESTÁ DESPIERTO",
    heWokeUp: "SE DESPERTÓ", putDownBy: (name) => `Puesto a dormir por ${name}`,
    sleptFor: (d) => `Durmió ${d}`, wokeAgo: (t) => `despertó ${t}`,
    awakenFor: (d) => `${d} despierto`, noSleepsYet: "Sin sueños registrados",
    // Routine configuration
    routineSettings: "RUTINA", routineMenuLabel: "Rutina", routineMenuSub: "Objetivos de toma y sueño",
    feedEvery: "Toma cada", targetVolume: "Volumen objetivo",
    feedType: "Tipo de toma", feedType_formula: "Fórmula", feedType_breast: "Pecho", feedType_combo: "Combinada",
    maxAwakeWindow: "Ventana máxima despierto", expectedNap: "Siesta esperada", phaseLabel: "Etapa",
    nextFeedDue: (time) => `Próxima toma ~${time}`, nextFeedDueUnknown: "Próxima toma — sin datos aún",
    // Smart check-in cards
    isJacobStillSleeping: "¿Jacob sigue durmiendo?",
    yesStillSleeping: "Sí, sigue durmiendo",
    heIsAwake: "Ya se despertó",
    timeForAFeed: "¿Es hora de una toma?",
    startingNow: "Empezamos ahora",
    snooze20: "Posponer 20 min",
    tempCheck: "Recordatorio de temperatura",
    logTempNow: "Registrar temperatura",
    skipForNow: "Omitir por ahora",
    dismissCard: "Descartar",
    // Ambient mode
    ambientSettings: "MODO AMBIENTE", idleBeforeAmbient: "Inactividad antes del modo ambiente",
    showInsightsAmbient: "Mostrar datos en modo ambiente", showTipsAmbient: "Mostrar consejos en modo ambiente",
    insightLongestSleep: (d) => `El sueño más largo de Jacob esta semana: ${d} 🌙`,
    insightFeedsToday: (n) => `${n} toma${n === 1 ? "" : "s"} registrada${n === 1 ? "" : "s"} hoy. Vas muy bien 🍼`,
    insightAvgInterval: (d) => `Intervalo promedio entre tomas hoy: ${d} 📊`,
    insightHolderHours: (name, d) => `${name} ha tenido a Jacob por ${d} hoy 💙`,
    // "What's Jacob doing?" prompt (tablet)
    whatsJacobDoing: "¿Qué está haciendo Jacob ahora?",
    justWentToSleep: "😴 Se acaba de dormir",
    startedAFeedBtn: "🍼 Empezó una toma",
    awakeAndHappy: "☀️ Despierto y contento",
    bitUnsettled: "😭 Un poco inquieto",
    // "How's today been?" prompt (tablet)
    howsTodayBeen: "☀️ ¿Cómo ha ido el día en general?",
    reallyGood: "🌟 Muy bien",
    prettyGood: "😊 Bastante bien",
    upsAndDowns: "😐 Altibajos",
    honestlyExhausting: "😴 La verdad, agotador",
    // Baby Metrics
    babyMetrics: "Medidas de Jacob", logMeasurement: "Registrar medida",
    weightKg: "Peso (kg)", lengthCm: "Talla (cm)", headCm: "Cir. cabeza (cm)",
    measuredAgo: (t) => `medido ${t}`,
    noMetricsYet: "Sin medidas aún",
    saveMetric: "Guardar medida",
    // Photos
    gallery: "Fotos", uploadPhoto: "Subir foto",
    addCaption: "Añadir un pie de foto (opcional)", uploading: "Subiendo…",
    noPhotosYet: "Sin fotos aún — toma una para empezar.",
    latestPhotos: "ÚLTIMAS FOTOS",
  },
};

const LangContext = createContext({ lang: "en", t: (k) => STRINGS.en[k] ?? k, setLang: () => {}, darkMode: true, toggleTheme: () => {} });
const useLang = () => useContext(LangContext);

// ============================================================
// REASSURANCE / HINT CONTENT (verbatim — not machine-translated)
// ============================================================
const REASSURANCE = {
  en: [
    "You're doing an incredible job. New parenthood is hard and you're showing up every single time.",
    "Every feed logged is one more data point keeping Jacob safe. Keep going.",
    "Exhaustion is real. If you get 20 minutes — sleep. The log will be here when you're back.",
    "Jacob doesn't need perfect parents. He needs you. You're enough.",
    "Three weeks of this and you're already a pro. It doesn't feel like it, but you are.",
  ],
  es: [
    "Estás haciendo un trabajo increíble. La paternidad es difícil y tú apareces cada vez.",
    "Cada toma registrada es un dato más que mantiene a Jacob seguro. Sigue así.",
    "El agotamiento es real. Si tienes 20 minutos — duerme. El registro estará aquí cuando vuelvas.",
    "Jacob no necesita padres perfectos. Te necesita a ti. Eres suficiente.",
    "Tres semanas con esto y ya eres un profesional. No lo parece, pero lo eres.",
  ],
};

const HINTS = {
  en: [
    "Swaddle tighter than feels comfortable — newborns like the squeeze.",
    "If he's cluster feeding, that's normal. Growth spurts hit hard in weeks 2–3.",
    "White noise as loud as a shower works better than soft music for most newborns.",
    "Skin to skin for 20 minutes resets a fussy baby better than almost anything else.",
    "If you're not sure if he's hungry, try a feed. Overfeeding a newborn is very hard to do.",
  ],
  es: [
    "Envuelve más apretado de lo que parece cómodo — a los recién nacidos les gusta la presión.",
    "Si está en tomas agrupadas, es normal. Los brotes de crecimiento golpean fuerte en las semanas 2–3.",
    "El ruido blanco tan fuerte como una ducha funciona mejor que la música suave para la mayoría.",
    "Piel con piel durante 20 minutos calma a un bebé inquieto mejor que casi cualquier otra cosa.",
    "Si no estás seguro de si tiene hambre, intenta una toma. Sobrealimentar a un recién nacido es muy difícil.",
  ],
};

const fonts = {
  display: "'Bebas Neue', sans-serif",
  mono: "'Space Mono', monospace",
  body: "'DM Sans', sans-serif",
};


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
      @keyframes alarmPulse { 0%,100%{opacity:0;} 40%,60%{opacity:0.75;} }
      @keyframes ambientFadeIn { from { opacity:0; } to { opacity:1; } }
    `;
    document.head.appendChild(style);
  }, []);
}

// ---- Helpers ----
const now = () => new Date();
const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
function fmtDuration(mins) {
  if (mins < 1) return "< 1m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
function daysUntil(d) {
  return Math.ceil((d - now()) / 86400000);
}

// ============================================================
// MAIN APP
// ============================================================
function useIsTablet() {
  const [isTablet, setIsTablet] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  useEffect(() => {
    const onResize = () => setIsTablet(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isTablet;
}

// ============================================================
// PEOPLE HOOK
// ============================================================
const PEOPLE_DEFAULTS = [
  { id: "d-matt",     name: "Matt",     color: "#4ade9a", role: "household", active: true, display_order: 1 },
  { id: "d-jhomaira", name: "Jhomaira", color: "#60a5fa", role: "household", active: true, display_order: 2 },
  { id: "d-omaira",   name: "Omaira",   color: "#c084fc", role: "helper",    active: true, display_order: 3 },
];

function usePeople() {
  const [people, setPeople] = useState(PEOPLE_DEFAULTS);

  useEffect(() => {
    if (!supabase) return;
    const load = () =>
      supabase.from("people").select("*").order("display_order").then(({ data }) => {
        if (data && data.length > 0) setPeople(data);
      });
    load();
    const ch = supabase.channel("people-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const addPerson = async (name, color, role) => {
    const row = { name, color, role: role || "household", display_order: people.length + 1, active: true };
    if (!supabase) { setPeople((p) => [...p, { id: `local-${Date.now()}`, ...row }]); return; }
    await supabase.from("people").insert(row);
  };

  const toggleActive = async (id, active) => {
    if (!supabase) { setPeople((p) => p.map((x) => x.id === id ? { ...x, active } : x)); return; }
    await supabase.from("people").update({ active }).eq("id", id);
  };

  return { people, addPerson, toggleActive };
}

// ============================================================
// LIVE STATUS HOOK — singleton row tracks who's in charge
// ============================================================
function useLiveStatus() {
  const [status, setStatus] = useState({ holder_name: null });

  useEffect(() => {
    if (!supabase) return;
    supabase.from("live_status").select("*").eq("id", 1).single()
      .then(({ data }) => { if (data) setStatus(data); });
    const ch = supabase.channel("live-status-ch")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_status" }, (p) => setStatus(p.new))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const setHolder = async (name) => {
    const prevName = status.holder_name;
    setStatus((s) => ({ ...s, holder_name: name }));
    if (!supabase) return;
    await supabase.from("live_status")
      .upsert({ id: 1, holder_name: name, updated_at: new Date().toISOString() });
    if (name && name !== prevName) {
      const nowIso = new Date().toISOString();
      await supabase.from("holder_log").update({ ended_at: nowIso }).is("ended_at", null);
      await supabase.from("holder_log").insert({ person_name: name, started_at: nowIso });
    }
  };

  const setActivity = async (actStatus, subType = null, note = null) => {
    const status = actStatus || "idle";
    const startedAt = status !== "idle" ? new Date().toISOString() : null;
    setStatus((s) => ({ ...s, status, sub_type: subType, started_at: startedAt, notes: note }));
    if (!supabase) return;
    await supabase.from("live_status")
      .upsert({ id: 1, status, sub_type: subType, started_at: startedAt, notes: note, updated_at: new Date().toISOString() });
  };

  return { status, setHolder, setActivity };
}

// ============================================================
// HANDOVER ALARM HOOK — fires when shift end_ts passes
// ============================================================
function useHandoverAlarm(shifts, shiftsT) {
  const [alarm, setAlarm] = useState(null); // { id, person } | null

  useEffect(() => {
    const check = () => {
      const n = new Date();
      const firing = shifts.find(
        (s) =>
          s.end &&
          s.end <= n &&
          s.start <= n &&
          s.status !== "done" &&
          n - s.end < 3600000 // ignore stale (>1h old)
      );
      setAlarm(firing ? { id: firing.id, person: firing.person } : null);
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [shifts]);

  const dismiss = async () => {
    if (!alarm) return;
    await shiftsT.update(alarm.id, { status: "done" });
    setAlarm(null);
  };

  return { alarm, dismiss };
}

export default function DadOps() {
  useGlobalStyle();
  const isTablet = useIsTablet();
  useWakeLock(isTablet);
  const [lang, setLang] = useState(() => localStorage.getItem("dadops-lang") || "en");
  const t = (k, ...args) => {
    const val = STRINGS[lang]?.[k] ?? STRINGS.en[k] ?? k;
    return typeof val === "function" ? val(...args) : val;
  };
  const switchLang = (l) => { setLang(l); localStorage.setItem("dadops-lang", l); };

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("dadops-theme") !== "light");
  C = darkMode ? DARK : LIGHT;
  const toggleTheme = () => {
    setDarkMode((d) => {
      localStorage.setItem("dadops-theme", d ? "light" : "dark");
      return !d;
    });
  };

  const { people, addPerson, toggleActive } = usePeople();
  const { status: liveStatus, setHolder, setActivity } = useLiveStatus();

  const [currentPersonName, setCurrentPersonName] = useState(() => localStorage.getItem("dadops-person") || null);
  const switchPerson = (name) => { setCurrentPersonName(name); localStorage.setItem("dadops-person", name); };
  const activePeople = people.filter((p) => p.active !== false);
  const currentPerson = people.find((p) => p.name === currentPersonName) || activePeople[0] || people[0] || PEOPLE_DEFAULTS[0];

  const ctx = { lang, t, setLang: switchLang, darkMode, toggleTheme };

  if (isTablet) {
    return (
      <LangContext.Provider value={ctx}>
        <MainApp currentPerson={currentPerson} people={people} liveStatus={liveStatus} setHolder={setHolder} setActivity={setActivity} addPerson={addPerson} toggleActive={toggleActive} switchPerson={switchPerson} isTablet={true} />
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={ctx}>
      <MainApp currentPerson={currentPerson} people={people} liveStatus={liveStatus} setHolder={setHolder} setActivity={setActivity} addPerson={addPerson} toggleActive={toggleActive} switchPerson={switchPerson} isTablet={false} />
    </LangContext.Provider>
  );
}

// ============================================================
// MAIN APP (phone + tablet data layer)
// ============================================================
function MainApp({ currentPerson, people, liveStatus, setHolder, setActivity, addPerson, toggleActive, switchPerson, isTablet }) {
  const [tab, setTab] = useState("shift");
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreScreen, setMoreScreen] = useState(null);

  const user = currentPerson;

  const feedsT = useLiveTable("feeds", {
    mapRow: (r) => ({ id: r.id, type: r.type, side: r.side, vol: r.vol_ml, breastDurationMins: r.breast_duration_mins, bottleVolMl: r.bottle_vol_ml, at: new Date(r.at), by: r.by_person }),
  });
  const sleepsT = useLiveTable("sleeps", {
    orderBy: "start_ts",
    mapRow: (r) => ({ id: r.id, start: new Date(r.start_ts), end: r.end_ts ? new Date(r.end_ts) : null, by: r.by_person }),
  });
  const nappiesT = useLiveTable("nappies", {
    mapRow: (r) => ({ id: r.id, type: r.type, urineLevel: r.urine_level, stool: r.stool, at: new Date(r.at), by: r.by_person }),
  });
  const tempsT = useLiveTable("temps", {
    mapRow: (r) => ({ id: r.id, c: Number(r.c), at: new Date(r.at), by: r.by_person }),
  });

  const feeds = feedsT.rows, sleeps = sleepsT.rows, nappies = nappiesT.rows, temps = tempsT.rows;
  const shiftsT = useLiveTable("shifts", {
    orderBy: "start_ts",
    ascending: true,
    mapRow: (r) => ({ id: r.id, person: r.person_name || r.person_id, start: new Date(r.start_ts), end: r.end_ts ? new Date(r.end_ts) : null, label: r.label || null, status: r.status }),
  });
  const shifts = shiftsT.rows;
  const { alarm: handoverAlarm, dismiss: dismissAlarm } = useHandoverAlarm(shifts, shiftsT);

  const lastFeed = feeds[0];
  const lastNappy = nappies[0];

  const addFeed = (f) => {
    const type = f.breastDurationMins && f.bottleVolMl ? "combo" : f.breastDurationMins ? "breast" : "bottle";
    return feedsT.add({
      at: (f.at || now()).toISOString(),
      by_person: user.name,
      type: f.type || type,
      side: f.side || null,
      vol_ml: f.bottleVolMl || f.vol || null,
      breast_duration_mins: f.breastDurationMins || null,
      bottle_vol_ml: f.bottleVolMl || f.vol || null,
    });
  };
  const addNappy = (n) => {
    const obj = typeof n === "string" ? { urineLevel: n !== "dirty" ? "normal" : null, stool: n === "dirty" || n === "both" } : n;
    const type = obj.stool && obj.urineLevel ? "both" : obj.stool ? "dirty" : "wet";
    return nappiesT.add({ at: now().toISOString(), by_person: user.name, type, urine_level: obj.urineLevel || null, stool: !!obj.stool });
  };
  const addSleep = (s) => sleepsT.add({ start_ts: (s.start || now()).toISOString(), end_ts: s.end ? s.end.toISOString() : null, by_person: user.name });
  const addTemp = (c) => tempsT.add({ at: now().toISOString(), by_person: user.name, c });
  const lastTemp = temps[0];
  const tempAlert = lastTemp && lastTemp.c >= 38;
  const { metrics, addMetric, deleteMetric } = useBabyMetrics();
  const { photos, uploadPhoto, deletePhoto, getUrl } = usePhotos();
  const { config: routineConfig, saveConfig: saveRoutineConfig } = useRoutineConfig();
  const { rows: holderLog, clearOld: clearOldHolderLog } = useHolderLog();

  const [dailyLogs, setDailyLogs] = useState({});
  useEffect(() => {
    if (!supabase || !user?.name) return;
    supabase
      .from("daily_log")
      .select("*")
      .eq("person_id", user.name)
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setDailyLogs((prev) => ({
            ...prev,
            [user.name]: data.map((r) => ({
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
  }, [user?.name]);

  const addDailyLog = async (personName, entry) => {
    const local = { id: `local-${Date.now()}`, date: now(), ...entry };
    setDailyLogs((prev) => ({ ...prev, [personName]: [local, ...(prev[personName] || [])] }));
    if (!supabase) return;
    await supabase.from("daily_log").insert({
      person_id: personName,
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

  const shared = { feeds, sleeps, nappies, temps, feedsT, sleepsT, nappiesT, tempsT, lastTemp, tempAlert, shifts, shiftsT, lastFeed, lastNappy, user, people, liveStatus, setHolder, setActivity, addFeed, addNappy, addSleep, addTemp, setTab, metrics, photos, getUrl, routineConfig, saveRoutineConfig, holderLog, clearOldHolderLog };

  if (isTablet) return <TabletDashboard shared={shared} />;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: fonts.body, color: C.text, position: "relative", maxWidth: 480, margin: "0 auto", overflow: "hidden" }}>
      {handoverAlarm && <HandoverAlarmOverlay alarm={handoverAlarm} dismiss={dismissAlarm} />}
      <TopBar user={user} people={people} switchPerson={switchPerson} />

      <div style={{ padding: "0 16px 120px", minHeight: "100vh" }}>
        {tab === "shift" && <Shift {...shared} />}
        {tab === "protocols" && <Protocols {...shared} />}
        {tab === "insights" && <Insights {...shared} />}
        {tab === "library" && <Library {...shared} />}
      </div>

      <QuickLogFab open={fabOpen} setOpen={setFabOpen} addFeed={addFeed} addNappy={addNappy} addSleep={addSleep} addTemp={addTemp} liveStatus={liveStatus} setActivity={setActivity} />

      {moreOpen && <MoreSheet close={() => setMoreOpen(false)} open={(s) => { setMoreScreen(s); setMoreOpen(false); }} />}
      {moreScreen && <MoreScreen screen={moreScreen} close={() => setMoreScreen(null)} user={user} dailyLogs={dailyLogs} addDailyLog={addDailyLog} people={people} addPerson={addPerson} toggleActive={toggleActive} metrics={metrics} addMetric={addMetric} deleteMetric={deleteMetric} photos={photos} uploadPhoto={uploadPhoto} deletePhoto={deletePhoto} getUrl={getUrl} {...shared} />}

      <BottomNav tab={tab} setTab={setTab} openMore={() => setMoreOpen(true)} />
    </div>
  );
}





// ============================================================
// HANDOVER ALARM OVERLAY
// ============================================================
function HandoverAlarmOverlay({ alarm, dismiss }) {
  const { t } = useLang();
  const flashOp = parseFloat(localStorage.getItem("dadops-flash-intensity") || "0.6");
  const [pulsing, setPulsing] = useState(true);

  useEffect(() => {
    const soundOn = localStorage.getItem("dadops-alarm-sound") === "true";
    if (soundOn) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch (_) {}
    }
    const timer = setTimeout(() => setPulsing(false), 3600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: C.accent,
        animation: pulsing ? "alarmPulse 1.2s ease-in-out 3 forwards" : "none",
        opacity: pulsing ? 0 : flashOp * 0.3,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "relative", zIndex: 1,
        background: C.bg, borderTop: `3px solid ${C.accent}`,
        width: "100%", maxWidth: 480,
        padding: "28px 24px 44px",
        animation: "slideIn 0.3s",
      }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 3, color: C.accent, marginBottom: 10 }}>{t("shiftEnding")}</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{alarm.person}</div>
        <div style={{ fontSize: 15, color: C.muted2, marginBottom: 24 }}>{t("handoverBody", alarm.person)}</div>
        <button onClick={dismiss} style={{ ...bigBtn(), marginTop: 0, fontSize: 14, letterSpacing: 2, padding: 18 }}>
          {t("gotIt")}
        </button>
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
  const { lang, t, setLang } = useLang();
  const { shifts, lastFeed, lastNappy, feeds, sleeps, sleepsT, temps, lastTemp, tempAlert, addTemp, addSleep, people, metrics, photos, getUrl, routineConfig, liveStatus, setHolder, setActivity, holderLog } = shared;
  const [clock, setClock] = useState(now());
  const [tempOpen, setTempOpen] = useState(false);
  const [smartCardActive, setSmartCardActive] = useState(false);
  const [step8Active, setStep8Active] = useState(false);
  const [step9Active, setStep9Active] = useState(false);
  const [ambientMode, setAmbientMode] = useState(false);
  const { summaries: dailySummaries, addSummary } = useDailySummary();
  const lastInteractionRef = useRef(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(now()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const idleMins = Number(localStorage.getItem("dadops-ambient-idle-mins")) || 3;
    const check = () => {
      if (!ambientMode && Date.now() - lastInteractionRef.current > idleMins * 60000) setAmbientMode(true);
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [ambientMode]);
  const onRootPointerDown = () => {
    lastInteractionRef.current = Date.now();
    if (ambientMode) setAmbientMode(false);
  };

  return (
    <div onPointerDown={onRootPointerDown} style={{ background: C.bg, minHeight: "100vh", fontFamily: fonts.body, color: C.text, padding: "28px 36px" }}>
      <style>{`@media (min-width: 1400px) { .dadops-dashpanel { padding: 34px !important; } }`}</style>
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
      {/* Header strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontFamily: fonts.display, fontSize: 44, letterSpacing: 2, color: C.accent }}>DADOPS</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 19, color: C.muted2, letterSpacing: 1 }}>JACOB · FAMILY DASHBOARD</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {(() => {
            const latestWeight = (metrics || []).find((m) => m.weight != null);
            const latestLength = (metrics || []).find((m) => m.length != null);
            if (!latestWeight && !latestLength) return null;
            const parts = [latestWeight ? `${latestWeight.weight.toFixed(2)} kg` : null, latestLength ? `${latestLength.length.toFixed(1)} cm` : null].filter(Boolean);
            return (
              <div style={{ fontFamily: fonts.mono, fontSize: 18, color: C.muted2, letterSpacing: 1 }}>
                JACOB · {parts.join(" · ")}
              </div>
            );
          })()}
          {routineConfig && (
            <div style={{ fontFamily: fonts.mono, fontSize: 18, color: C.muted2, letterSpacing: 1 }}>
              🍼 {lastFeed ? t("nextFeedDue", fmtTime(nextFeedDue(lastFeed, routineConfig))) : t("nextFeedDueUnknown")}
            </div>
          )}
          <button onClick={() => setTempOpen(true)} style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 28px", color: C.text, fontSize: 22, fontWeight: 600, cursor: "pointer", minHeight: 56 }}>
            🌡️ Add Temp
          </button>
          <div style={{ display: "flex", borderRadius: 24, overflow: "hidden", border: `1px solid ${C.border}`, minHeight: 48 }}>
            {["en", "es"].map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "0 18px", minHeight: 48, background: lang === l ? C.accentDim : "transparent", border: "none", color: lang === l ? C.accent : C.muted, fontFamily: fonts.mono, fontSize: 16, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <ThemeToggleButton />
          <div style={{ fontFamily: fonts.mono, fontSize: 40, color: C.text, letterSpacing: 1 }}>{fmtTime(clock)}</div>
        </div>
      </div>

      <WhoInChargeCard liveStatus={liveStatus} people={people} setHolder={setHolder} large />

      {tempAlert && (
        <div style={{ background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 14, padding: "16px 20px", marginBottom: 22, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 12, letterSpacing: 2, color: C.danger, whiteSpace: "nowrap" }}>ACTION NEEDED</span>
          <span style={{ fontSize: 16, color: C.danger }}>Last temp {lastTemp.c.toFixed(1)}°C ({agoStr(lastTemp.at)}) — call your provider or Pregnancy, Birth & Baby 1800 882 436.</span>
        </div>
      )}

      {/* Four-panel grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Panel 1 — Shifts */}
        <DashPanel title="SHIFTS">
          {(() => {
            const visible = shifts
              .map((s) => ({ ...s, state: s.start <= clock && (!s.end || s.end > clock) ? "active" : s.start > clock ? "next" : "past" }))
              .filter((s) => s.state !== "past");
            if (visible.length === 0)
              return <div style={{ fontSize: 19, color: C.muted2, textAlign: "center", padding: "30px 10px" }}>No shifts scheduled</div>;
            return visible.map((s) => {
              const person = people.find((p) => p.name.toLowerCase() === (s.person || "").toLowerCase());
              const active = s.state === "active";
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 16, background: active ? C.accentDim : C.card, border: `1px solid ${active ? C.accentBorder : C.border}`, borderRadius: 14, padding: "15px 18px", marginBottom: 10, minHeight: 48 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: person?.color || C.muted, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{person?.name}</div>
                    <div style={{ fontSize: 18, color: C.muted2, fontFamily: fonts.mono, marginTop: 2 }}>{fmtTime(s.start)}{s.end ? ` – ${fmtTime(s.end)}` : s.label ? ` · ${s.label}` : ""}</div>
                  </div>
                  {active && <span style={{ fontFamily: fonts.mono, fontSize: 15, letterSpacing: 1, color: C.accent, background: C.accentDim, border: `1px solid ${C.accentBorder}`, padding: "5px 10px", borderRadius: 11, whiteSpace: "nowrap" }}>ON NOW</span>}
                </div>
              );
            });
          })()}
        </DashPanel>

        {/* Panel 2 — Live status */}
        <DashPanel title="LIVE STATUS">
          {(() => {
            const activeSleep = sleeps.find((s) => !s.end);
            const lastSleep = sleeps.find((s) => s.end);
            const sleepMins = activeSleep ? Math.floor((clock - activeSleep.start) / 60000) : null;
            const lastSleepMins = lastSleep ? Math.round((lastSleep.end - lastSleep.start) / 60000) : null;
            const awakeMins = !activeSleep && lastSleep ? Math.floor((clock - lastSleep.end) / 60000) : null;
            const forecastMins = awakeMins !== null ? Math.max(0, 90 - awakeMins) : null;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <BigStat icon="🍼" label="Last feed" value={lastFeed ? agoStr(lastFeed.at) : "—"} sub={lastFeed ? (lastFeed.type === "bottle" ? `Bottle · ${lastFeed.vol}ml` : `Breast · ${lastFeed.side}`) : ""} />
                <BigStat icon="💧" label="Last nappy" value={lastNappy ? agoStr(lastNappy.at) : "—"} sub={lastNappy ? lastNappy.type : ""} />
                <BigStat
                  icon={activeSleep ? "😴" : "☀️"}
                  label={activeSleep ? "Sleeping now" : "Awake"}
                  value={activeSleep ? fmtDuration(sleepMins) : awakeMins !== null ? fmtDuration(awakeMins) : "—"}
                  sub={activeSleep ? `Started ${agoStr(activeSleep.start)}` : lastSleep ? `Slept ${fmtDuration(lastSleepMins)}` : "No sleeps yet"}
                />
                <BigStat
                  icon="🌙"
                  label="Wake forecast"
                  value={activeSleep ? "—" : forecastMins !== null ? (forecastMins > 0 ? `~${forecastMins}m` : "Any time") : "—"}
                  sub={activeSleep ? "Sleeping" : "Often tired after ~90 min awake"}
                />
              </div>
            );
          })()}
        </DashPanel>

        {/* Panel 3 — Temperature */}
        <DashPanel title="TEMPERATURE">
          {lastTemp ? (
            <>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontFamily: fonts.display, fontSize: 74, color: tempAlert ? C.danger : C.accent, lineHeight: 1 }}>{lastTemp.c.toFixed(1)}°C</div>
                <div style={{ fontSize: 17, color: C.muted2, marginTop: 6 }}>{agoStr(lastTemp.at)}</div>
              </div>
              {temps.length > 1 && <TempChart temps={temps} />}
            </>
          ) : (
            <div style={{ fontSize: 19, color: C.muted2, textAlign: "center", padding: "40px 10px" }}>No readings yet</div>
          )}
        </DashPanel>

        {/* Panel 4 — Latest insight */}
        <DashPanel title="LATEST INSIGHT">
          <div style={{ background: tempAlert ? "rgba(255,90,90,0.08)" : C.accentDim, border: `1px solid ${tempAlert ? "rgba(255,90,90,0.3)" : C.accentBorder}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 20, lineHeight: 1.6, color: tempAlert ? C.danger : C.text }}>
              {tempAlert
                ? "Last temperature reading was 38°C or higher. Call your provider's advice line now."
                : "Feeds have been steady through the day — nappy output is on track. Nothing needs action right now."}
            </div>
          </div>
          <div style={{ marginTop: 18, fontFamily: fonts.mono, fontSize: 16, letterSpacing: 1.5, color: C.muted, textAlign: "center" }}>
            No personal mood or journal data is shown here
          </div>
        </DashPanel>
      </div>

      {/* Latest Photos strip */}
      {(photos || []).length > 0 && (() => {
        const recent = (photos || []).slice(0, 3);
        return (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 13, letterSpacing: 2, color: C.accent, marginBottom: 14 }}>LATEST PHOTOS</div>
            <div style={{ display: "flex", gap: 16 }}>
              {recent.map((p) => {
                const url = getUrl?.(p.storage_path);
                return url ? (
                  <div key={p.id} style={{ flex: 1, maxWidth: 200 }}>
                    <div style={{ aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: C.card }}>
                      <img src={url} alt={p.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    </div>
                    {p.caption && <div style={{ fontSize: 12, color: C.muted2, marginTop: 6, fontFamily: fonts.body, textAlign: "center" }}>{p.caption}</div>}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        );
      })()}
      </div>

      {tempOpen && (
        <div onClick={() => setTempOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, padding: 32, width: 440, border: `1px solid ${C.border}` }}>
            <TempLog onSave={(c) => { addTemp(c); setTempOpen(false); }} back={() => setTempOpen(false)} />
          </div>
        </div>
      )}

      {!ambientMode && (
        <SmartCheckInCards
          clock={clock}
          liveStatus={liveStatus}
          routineConfig={routineConfig}
          lastFeed={lastFeed}
          lastTemp={lastTemp}
          sleeps={sleeps}
          sleepsT={sleepsT}
          setActivity={setActivity}
          onStartFeed={() => setActivity("feeding", "breast")}
          onLogTemp={() => setTempOpen(true)}
          onActiveChange={setSmartCardActive}
        />
      )}

      {!ambientMode && (
        <Step8Prompt
          clock={clock}
          liveStatus={liveStatus}
          lastInteractionRef={lastInteractionRef}
          addSleep={addSleep}
          setActivity={setActivity}
          suppressed={smartCardActive}
          onActiveChange={setStep8Active}
        />
      )}

      {!ambientMode && (
        <Step9Prompt
          clock={clock}
          dailySummaries={dailySummaries}
          addSummary={addSummary}
          suppressed={smartCardActive || step8Active}
          onActiveChange={setStep9Active}
        />
      )}

      {!ambientMode && <ReassuranceHintCard suppressed={smartCardActive || step8Active || step9Active} />}

      {ambientMode && (
        <AmbientMode
          clock={clock}
          liveStatus={liveStatus}
          photos={photos}
          getUrl={getUrl}
          feeds={feeds}
          sleeps={sleeps}
          holderLog={holderLog}
          people={people}
        />
      )}
    </div>
  );
}

// ============================================================
// SMART CHECK-IN CARDS (tablet only)
// ============================================================
function SmartCheckInCards({ clock, liveStatus, routineConfig, lastFeed, lastTemp, sleeps, sleepsT, setActivity, onStartFeed, onLogTemp, onActiveChange }) {
  const { t } = useLang();
  const [snooze, setSnooze] = useState({ card1: null, card2: null, card3: null });
  const hour = clock.getHours();

  const napping = routineConfig && liveStatus?.status === "napping" && liveStatus?.started_at;
  const napMins = napping ? Math.floor((clock - new Date(liveStatus.started_at)) / 60000) : 0;
  const napThreshold = ((routineConfig && routineConfig.expectedNapMins) || 45) + 15;
  const card1Ready = !!napping && napMins > napThreshold && !(snooze.card1 && clock < snooze.card1);

  const feedMins = lastFeed ? Math.floor((clock - lastFeed.at) / 60000) : null;
  const card2Ready = !!routineConfig && lastFeed != null && feedMins > (routineConfig.feedIntervalMins || 180)
    && liveStatus?.status !== "feeding" && hour >= 6 && hour < 23
    && !(snooze.card2 && clock < snooze.card2);

  const tempHours = lastTemp ? (clock - lastTemp.at) / 3600000 : Infinity;
  const card3Ready = tempHours > 6 && !(snooze.card3 && clock < snooze.card3);

  const active = card2Ready ? "card2" : card1Ready ? "card1" : card3Ready ? "card3" : null;

  useEffect(() => { onActiveChange?.(active); }, [active]);

  if (!active) return null;

  const snoozeFor = (card, mins) => setSnooze((s) => ({ ...s, [card]: new Date(clock.getTime() + mins * 60000) }));

  const heIsAwake = () => {
    const activeSleep = sleeps.find((s) => !s.end);
    if (activeSleep) sleepsT.update(activeSleep.id, { end_ts: new Date().toISOString() });
    setActivity("idle");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 260, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeUp 0.2s" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 24, padding: 32, width: 440, textAlign: "center" }}>
        {active === "card1" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😴</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>{t("isJacobStillSleeping")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => snoozeFor("card1", 15)} style={{ ...bigBtn(), flex: 1, marginTop: 0, minHeight: 48, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("yesStillSleeping")}</button>
              <button onClick={heIsAwake} style={{ ...bigBtn(), flex: 1, marginTop: 0, minHeight: 48 }}>{t("heIsAwake")}</button>
            </div>
          </>
        )}
        {active === "card2" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🍼</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>{t("timeForAFeed")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => snoozeFor("card2", 20)} style={{ ...bigBtn(), flex: 1, marginTop: 0, minHeight: 48, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("snooze20")}</button>
              <button onClick={onStartFeed} style={{ ...bigBtn(), flex: 1, marginTop: 0, minHeight: 48 }}>{t("startingNow")}</button>
            </div>
          </>
        )}
        {active === "card3" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌡️</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>{t("tempCheck")}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => snoozeFor("card3", 360)} style={{ ...bigBtn(), flex: 1, marginTop: 0, minHeight: 48, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("skipForNow")}</button>
              <button onClick={onLogTemp} style={{ ...bigBtn(), flex: 1, marginTop: 0, minHeight: 48 }}>{t("logTempNow")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// REASSURANCE / HINT CARDS (tablet only)
// ============================================================
function shuffledOrder(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ReassuranceHintCard({ suppressed }) {
  const { lang, t } = useLang();
  const [deck, setDeck] = useState(() => ({
    reassuranceOrder: shuffledOrder(REASSURANCE.en.length),
    reassuranceIdx: 0,
    hintOrder: shuffledOrder(HINTS.en.length),
    hintIdx: 0,
    lastKind: null,
  }));
  const [current, setCurrent] = useState(null); // { kind: 'reassurance'|'hint', i: number } | null

  useEffect(() => {
    const showNext = () => {
      setDeck((d) => {
        const turn = d.lastKind === "reassurance" ? "hint" : "reassurance";
        if (turn === "reassurance") {
          let { reassuranceOrder, reassuranceIdx } = d;
          if (reassuranceIdx >= reassuranceOrder.length) { reassuranceOrder = shuffledOrder(REASSURANCE.en.length); reassuranceIdx = 0; }
          setCurrent({ kind: "reassurance", i: reassuranceOrder[reassuranceIdx] });
          return { ...d, reassuranceOrder, reassuranceIdx: reassuranceIdx + 1, lastKind: "reassurance" };
        } else {
          let { hintOrder, hintIdx } = d;
          if (hintIdx >= hintOrder.length) { hintOrder = shuffledOrder(HINTS.en.length); hintIdx = 0; }
          setCurrent({ kind: "hint", i: hintOrder[hintIdx] });
          return { ...d, hintOrder, hintIdx: hintIdx + 1, lastKind: "hint" };
        }
      });
    };
    const firstTimer = setTimeout(showNext, 15000);
    const interval = setInterval(showNext, 30 * 60000);
    return () => { clearTimeout(firstTimer); clearInterval(interval); };
  }, []);

  if (!current || suppressed) return null;
  const list = current.kind === "reassurance" ? REASSURANCE : HINTS;
  const text = list[lang]?.[current.i] ?? list.en[current.i];

  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 240, width: "min(560px, 90vw)", animation: "fadeUp 0.3s" }}>
      <div style={{ background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 18, padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: 14, boxShadow: "0 10px 40px rgba(0,0,0,0.35)" }}>
        <div style={{ fontSize: 24, flexShrink: 0 }}>{current.kind === "reassurance" ? "💚" : "💡"}</div>
        <div style={{ flex: 1, fontSize: 15, lineHeight: 1.55, color: C.text }}>{text}</div>
        <button onClick={() => setCurrent(null)} aria-label={t("dismissCard")} title={t("dismissCard")}
          style={{ width: 48, height: 48, display: "grid", placeItems: "center", background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", flexShrink: 0, lineHeight: 1, marginTop: -12, marginRight: -14, marginBottom: -12 }}>✕</button>
      </div>
    </div>
  );
}

// ============================================================
// AMBIENT / SCREENSAVER MODE (tablet only)
// ============================================================
function computeAmbientInsights({ feeds, sleeps, holderLog, people, clock, t }) {
  const insights = [];
  const weekAgo = new Date(clock.getTime() - 7 * 86400000);
  const weekSleeps = sleeps.filter((s) => s.end && s.start >= weekAgo);
  if (weekSleeps.length) {
    const longestMs = weekSleeps.reduce((max, s) => Math.max(max, s.end - s.start), 0);
    insights.push(t("insightLongestSleep", fmtDuration(Math.round(longestMs / 60000))));
  }
  const startOfDay = new Date(clock);
  startOfDay.setHours(0, 0, 0, 0);
  const todaysFeeds = feeds.filter((f) => f.at >= startOfDay);
  if (todaysFeeds.length) {
    insights.push(t("insightFeedsToday", todaysFeeds.length));
  }
  if (todaysFeeds.length >= 2) {
    const sorted = [...todaysFeeds].sort((a, b) => a.at - b.at);
    let totalGap = 0;
    for (let i = 1; i < sorted.length; i++) totalGap += sorted[i].at - sorted[i - 1].at;
    const avgMins = Math.round(totalGap / (sorted.length - 1) / 60000);
    insights.push(t("insightAvgInterval", fmtDuration(avgMins)));
  }
  if (holderLog && holderLog.length) {
    const todaysTotals = {};
    (holderLog || []).forEach((r) => {
      const start = r.start < startOfDay ? startOfDay : r.start;
      const end = r.end || clock;
      if (end <= startOfDay || end <= start) return;
      todaysTotals[r.person] = (todaysTotals[r.person] || 0) + (end - start);
    });
    const top = Object.entries(todaysTotals).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const [name, ms] = top;
      const person = (people || []).find((p) => p.name === name);
      insights.push(t("insightHolderHours", person?.name || name, fmtDuration(Math.round(ms / 60000))));
    }
  }
  return insights;
}

function AmbientMode({ clock, liveStatus, photos, getUrl, feeds, sleeps, holderLog, people }) {
  const { lang, t } = useLang();
  const showInsights = localStorage.getItem("dadops-ambient-insights") !== "false";
  const showTips = localStorage.getItem("dadops-ambient-tips") !== "false";

  const order = useMemo(() => {
    const seq = ["photo", "insight", "photo", "tip"].filter((k) => (k === "insight" ? showInsights : k === "tip" ? showTips : true));
    return seq.length ? seq : ["photo"];
  }, [showInsights, showTips]);

  const [slotIdx, setSlotIdx] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setSlotIdx((i) => (i + 1) % order.length);
      setTick((n) => n + 1);
    }, 8000);
    return () => clearInterval(id);
  }, [order.length]);

  const validPhotos = (photos || []).filter((p) => getUrl?.(p.storage_path));
  const insights = useMemo(() => computeAmbientInsights({ feeds, sleeps, holderLog, people, clock, t }), [feeds, sleeps, holderLog, people, clock, t]);

  const available = { photo: validPhotos.length > 0, insight: showInsights && insights.length > 0, tip: showTips };
  let kind = order[slotIdx % order.length];
  if (!available[kind]) kind = ["photo", "insight", "tip"].find((k) => available[k]) || null;

  const photo = useMemo(() => (validPhotos.length ? validPhotos[Math.floor(Math.random() * validPhotos.length)] : null), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const insightText = useMemo(() => (insights.length ? insights[Math.floor(Math.random() * insights.length)] : null), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const tipText = useMemo(() => {
    const pool = [...REASSURANCE[lang], ...HINTS[lang]];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [tick, lang]);

  const statusMins = liveStatus?.started_at ? Math.floor((clock - new Date(liveStatus.started_at)) / 60000) : null;
  const statusLabel = liveStatus?.status === "napping"
    ? `😴 ${t("jacobSleeping")}${statusMins !== null ? ` · ${fmtDuration(statusMins)}` : ""}`
    : liveStatus?.status === "feeding"
    ? `🍼 ${t("feedingNow")}${statusMins !== null ? ` · ${fmtDuration(statusMins)}` : ""}`
    : `☀️ ${t("jacobAwake")}`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#000", animation: "ambientFadeIn 1.5s ease" }}>
      {kind === "photo" && photo && (
        <div key={`p-${tick}`} style={{ position: "fixed", inset: 0, animation: "fadeUp 0.6s" }}>
          <img src={getUrl(photo.storage_path)} alt={photo.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 40%)" }} />
          {photo.caption && (
            <div style={{ position: "absolute", bottom: 40, left: 40, right: 40, color: "#fff", fontSize: 28, fontWeight: 600, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{photo.caption}</div>
          )}
        </div>
      )}
      {kind === "insight" && insightText && (
        <div key={`i-${tick}`} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 60, animation: "fadeUp 0.6s" }}>
          <div style={{ background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 28, padding: 60, maxWidth: 800, textAlign: "center" }}>
            <div style={{ fontSize: 32, lineHeight: 1.5, color: C.text, fontWeight: 600 }}>{insightText}</div>
          </div>
        </div>
      )}
      {kind === "tip" && tipText && (
        <div key={`t-${tick}`} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 60, animation: "fadeUp 0.6s" }}>
          <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 28, padding: 60, maxWidth: 800, textAlign: "center" }}>
            <div style={{ fontSize: 32, lineHeight: 1.5, color: C.text, fontWeight: 600 }}>{tipText}</div>
          </div>
        </div>
      )}
      <div style={{ position: "fixed", top: 30, left: 40, color: "#fff", fontFamily: fonts.mono, fontSize: 26, letterSpacing: 1, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>{fmtTime(clock)}</div>
      <div style={{ position: "fixed", top: 30, right: 40, color: "#fff", fontFamily: fonts.mono, fontSize: 14, letterSpacing: 1, background: "rgba(0,0,0,0.35)", padding: "8px 14px", borderRadius: 20 }}>{statusLabel}</div>
    </div>
  );
}

// ============================================================
// "WHAT'S JACOB DOING?" PROMPT (tablet only)
// ============================================================
function Step8Prompt({ clock, liveStatus, lastInteractionRef, addSleep, setActivity, suppressed, onActiveChange }) {
  const { t } = useLang();
  const [snoozeUntil, setSnoozeUntil] = useState(null);
  const hour = clock.getHours();
  const idleMs = clock.getTime() - lastInteractionRef.current;
  const updatedMs = liveStatus?.updated_at ? clock.getTime() - new Date(liveStatus.updated_at).getTime() : Infinity;
  const ready = !suppressed
    && hour >= 6 && hour < 22
    && liveStatus?.status === "idle"
    && idleMs > 20 * 60000
    && updatedMs > 20 * 60000
    && !(snoozeUntil && clock < snoozeUntil);

  useEffect(() => { onActiveChange?.(ready); }, [ready]);

  if (!ready) return null;

  const choose = (status, subType, note) => {
    setActivity(status, subType, note);
    setSnoozeUntil(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 255, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeUp 0.2s" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 24, padding: 32, width: 480, textAlign: "center", position: "relative" }}>
        <button onClick={() => setSnoozeUntil(new Date(clock.getTime() + 20 * 60000))} aria-label={t("dismissCard")} title={t("dismissCard")}
          style={{ position: "absolute", top: 8, right: 8, width: 48, height: 48, display: "grid", placeItems: "center", background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 22 }}>{t("whatsJacobDoing")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => { addSleep({ start: clock }); choose("napping"); }} style={{ ...bigBtn(), marginTop: 0, minHeight: 56, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("justWentToSleep")}</button>
          <button onClick={() => choose("feeding", "breast")} style={{ ...bigBtn(), marginTop: 0, minHeight: 56, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("startedAFeedBtn")}</button>
          <button onClick={() => choose("idle", null, "Awake & happy")} style={{ ...bigBtn(), marginTop: 0, minHeight: 56 }}>{t("awakeAndHappy")}</button>
          <button onClick={() => choose("idle", null, "Unsettled")} style={{ ...bigBtn(), marginTop: 0, minHeight: 56 }}>{t("bitUnsettled")}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// "HOW'S TODAY BEEN?" PROMPT (tablet only)
// ============================================================
function Step9Prompt({ clock, dailySummaries, addSummary, suppressed, onActiveChange }) {
  const { t } = useLang();
  const hour = clock.getHours();
  const todayStr = localDateStr(clock);
  const alreadyLogged = (dailySummaries || []).some((s) => s.date === todayStr);
  const ready = !suppressed && hour >= 19 && hour < 21 && !alreadyLogged;

  useEffect(() => { onActiveChange?.(ready); }, [ready]);

  if (!ready) return null;

  const choose = (mood) => addSummary(todayStr, mood);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 254, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeUp 0.2s" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 24, padding: 32, width: 480, textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 22 }}>{t("howsTodayBeen")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => choose("great")} style={{ ...bigBtn(), marginTop: 0, minHeight: 56 }}>{t("reallyGood")}</button>
          <button onClick={() => choose("good")} style={{ ...bigBtn(), marginTop: 0, minHeight: 56, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("prettyGood")}</button>
          <button onClick={() => choose("mixed")} style={{ ...bigBtn(), marginTop: 0, minHeight: 56, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("upsAndDowns")}</button>
          <button onClick={() => choose("exhausting")} style={{ ...bigBtn(), marginTop: 0, minHeight: 56, background: C.surface, color: C.text, border: `1px solid ${C.border}` }}>{t("honestlyExhausting")}</button>
        </div>
      </div>
    </div>
  );
}

function DashPanel({ title, children }) {
  return (
    <div className="dadops-dashpanel" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, minHeight: 380 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 18, letterSpacing: 2, color: C.accent, marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  );
}

function BigStat({ icon, label, value, sub }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
      <div style={{ fontSize: 38, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 15, letterSpacing: 1, color: C.muted2, marginBottom: 6 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 18, color: C.muted2 }}>{sub}</div>}
    </div>
  );
}

// ============================================================
// TOP BAR
// ============================================================
function ThemeToggleButton({ size = 48 }) {
  const { darkMode, toggleTheme, t } = useLang();
  return (
    <button
      onClick={toggleTheme}
      aria-label={darkMode ? t("lightMode") : t("darkModeLabel")}
      title={darkMode ? t("lightMode") : t("darkModeLabel")}
      style={{ width: size, height: size, display: "grid", placeItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: "50%", cursor: "pointer", fontSize: Math.round(size * 0.45), flexShrink: 0 }}
    >
      {darkMode ? "☀️" : "🌙"}
    </button>
  );
}

function TopBar({ user, people, switchPerson }) {
  const { lang, t, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const active = (people || []).filter((p) => p.active !== false);
  return (
    <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 50 }}>
      <div style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 3 }}>
        DAD<span style={{ color: C.accent }}>OPS</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <ThemeToggleButton size={36} />
        <div style={{ display: "flex", borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}` }}>
          {["en", "es"].map((l) => (
            <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 12px", background: lang === l ? C.accentDim : "transparent", border: "none", color: lang === l ? C.accent : C.muted, fontFamily: fonts.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px 5px 6px", cursor: "pointer" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: user.color || C.accent, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 12 }}>
              {user.name[0]}
            </div>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>{user.name}</span>
            <span style={{ color: C.muted, fontSize: 10, marginLeft: 2 }}>▾</span>
          </button>
          {open && (
            <div style={{ position: "absolute", right: 0, top: 42, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", minWidth: 200, zIndex: 100, animation: "scaleIn 0.12s" }}>
              <div style={{ padding: "10px 14px 6px", fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.5, color: C.muted }}>
                {t("switchPerson")}
              </div>
              {active.map((p) => (
                <button key={p.id || p.name} onClick={() => { switchPerson(p.name); setOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: p.name === user.name ? C.accentDim : "transparent", border: "none", cursor: "pointer", color: C.text, fontSize: 13, fontFamily: fonts.body }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: p.color, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                    {p.name[0]}
                  </div>
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
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
// WHO'S IN CHARGE CARD
// ============================================================
function WhoInChargeCard({ liveStatus, people, setHolder, large }) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const activePeople = (people || []).filter((p) => p.active !== false);
  const holder = liveStatus?.holder_name
    ? (people || []).find((p) => p.name === liveStatus.holder_name) || { name: liveStatus.holder_name, color: C.accent }
    : null;

  const avatarSize = large ? 64 : 44;
  const nameSize = large ? 34 : 22;
  const labelSize = large ? 14 : 10;

  return (
    <div style={{ background: holder ? `${holder.color}18` : C.card, border: `1px solid ${holder ? holder.color + "44" : C.border}`, borderRadius: 16, padding: large ? "22px 26px" : "18px 20px", marginBottom: large ? 20 : 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", background: holder?.color || C.muted, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: Math.round(avatarSize * 0.43), flexShrink: 0 }}>
          {holder ? holder.name[0] : "?"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: labelSize, letterSpacing: 2, color: holder?.color || C.muted2, marginBottom: 3 }}>{t("inCharge")}</div>
          <div style={{ fontSize: nameSize, fontWeight: 700 }}>{holder?.name || t("noOneSet")}</div>
        </div>
        <div style={{ color: C.muted, fontSize: large ? 26 : 18, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</div>
      </div>
      {expanded && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", flexWrap: "wrap", gap: 8, animation: "fadeUp 0.15s" }}>
          {activePeople.map((p) => (
            <button key={p.id || p.name} onClick={() => { setHolder(p.name); setExpanded(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: liveStatus?.holder_name === p.name ? `${p.color}22` : C.surface, border: `1px solid ${liveStatus?.holder_name === p.name ? p.color : C.border}`, borderRadius: 11, padding: large ? "13px 20px" : "9px 14px", minHeight: large ? 48 : undefined, cursor: "pointer", color: C.text }}>
              <div style={{ width: large ? 30 : 22, height: large ? 30 : 22, borderRadius: "50%", background: p.color, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: large ? 15 : 11 }}>{p.name[0]}</div>
              <span style={{ fontSize: large ? 18 : 14, fontWeight: 500 }}>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TONIGHT
// ============================================================
function Shift({ shifts, shiftsT, lastFeed, lastNappy, user, feeds, nappies, sleeps, temps, feedsT, nappiesT, sleepsT, tempsT, people, liveStatus, setHolder, setActivity, addFeed, routineConfig, holderLog }) {
  const { t } = useLang();
  const [manageOpen, setManageOpen] = useState(false);
  const nameOf = (n) => people.find((p) => p.name.toLowerCase() === (n || "").toLowerCase())?.name || n || "—";

  const n = useMemo(() => new Date(), []);
  const withState = useMemo(() => shifts.map((s) => ({
    ...s,
    state: s.start <= n && (!s.end || s.end > n) ? "active"
         : s.start > n ? "next"
         : "past",
  })), [shifts, n]);

  const activeShift = withState.find((s) => s.state === "active");
  const nextShift = withState.find((s) => s.state === "next");
  const visibleShifts = withState.filter((s) => s.state !== "past");

  const sinceFeed = lastFeed ? Math.floor((new Date() - lastFeed.at) / 60000) : null;
  const predict = sinceFeed === null ? null : Math.max(0, 165 - sinceFeed);

  const handOff = async () => {
    if (!activeShift) return;
    await shiftsT.update(activeShift.id, { status: "done", end_ts: new Date().toISOString() });
  };

  return (
    <div style={{ animation: "fadeUp 0.3s" }}>
      <Label>{t("inCharge")}</Label>
      <WhoInChargeCard liveStatus={liveStatus} people={people} setHolder={setHolder} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "22px 2px 12px" }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted }}>{t("shiftPlan")}</div>
        <button onClick={() => setManageOpen(true)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "5px 12px", color: C.muted2, fontSize: 10, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
          MANAGE
        </button>
      </div>

      <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontSize: 22 }}>🔮</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
          {lastFeed
            ? <>Jacob last fed <b>{agoStr(lastFeed.at)}</b>. Expect a wake in roughly <b style={{ color: C.accent }}>{predict > 0 ? `${predict} min` : "any time now"}</b>.</>
            : "No feeds logged yet — use + to start the wake forecast."}
        </div>
      </div>

      {routineConfig && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.muted2, marginBottom: 16, fontFamily: fonts.mono }}>
          🍼 {lastFeed ? t("nextFeedDue", fmtTime(nextFeedDue(lastFeed, routineConfig))) : t("nextFeedDueUnknown")}
        </div>
      )}

      {visibleShifts.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, textAlign: "center", color: C.muted2, fontSize: 13.5, marginBottom: 10 }}>
          No shifts scheduled yet.{" "}
          <button onClick={() => setManageOpen(true)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13.5, padding: 0 }}>Add one →</button>
        </div>
      ) : visibleShifts.map((s, i) => {
        const p = people.find((x) => x.name.toLowerCase() === (s.person || "").toLowerCase());
        const active = s.state === "active";
        return (
          <div key={s.id} style={{ background: active ? C.accentDim : C.card, border: `1px solid ${active ? C.accentBorder : C.border}`, borderRadius: 14, padding: 16, marginBottom: 10, animation: `fadeUp 0.3s ${i * 0.06}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: active ? C.accent : C.muted2, marginBottom: 5 }}>
                  {active ? t("onShiftNow") : t("nextUp")}
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: p?.color || C.muted, display: "inline-block" }} />
                  {p?.name || s.person}
                </div>
                <div style={{ fontFamily: fonts.mono, fontSize: 12, color: C.muted2, marginTop: 3 }}>
                  {fmtTime(s.start)}{s.end ? ` → ${fmtTime(s.end)}` : s.label ? ` · ${s.label}` : ""}
                </div>
              </div>
              {active && <div style={{ fontSize: 11, fontFamily: fonts.mono, color: C.accent, animation: "pulse 2s infinite" }}>● LIVE</div>}
            </div>
          </div>
        );
      })}

      {activeShift && (
        <button onClick={handOff} style={bigBtn()}>
          {nextShift ? t("handoffTo", nameOf(nextShift.person)) : "End shift"}
        </button>
      )}

      {holderLog && holderLog.length > 0 && (
        <>
          <Label>{t("holderAttribution")}</Label>
          <HolderAttributionBar rows={holderLog} people={people} clock={new Date()} />
        </>
      )}

      <Label>{t("liveStatus")}</Label>
      <LiveStatusCard sleeps={sleeps} sleepsT={sleepsT} lastFeed={lastFeed} lastNappy={lastNappy} people={people} liveStatus={liveStatus} setActivity={setActivity} addFeed={addFeed} />

      <Label>{t("activityLog")}</Label>
      <ActivityLog
        feeds={feeds} nappies={nappies} sleeps={sleeps} temps={temps}
        feedsT={feedsT} nappiesT={nappiesT} sleepsT={sleepsT} tempsT={tempsT} people={people}
      />

      {manageOpen && <ShiftManager shiftsT={shiftsT} people={people} close={() => setManageOpen(false)} />}
    </div>
  );
}

function toDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ShiftManager({ shiftsT, people, close }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const n = now();
  const upcoming = shiftsT.rows.filter((s) => !s.end || s.end > n);

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: "22px 22px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", borderTop: `1px solid ${C.border}`, animation: "slideIn 0.25s" }}>
        <div style={{ width: 40, height: 4, background: C.cardHi, borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, marginBottom: 6 }}>MANAGE SHIFTS</div>
        <div style={{ fontSize: 12.5, color: C.muted2, marginBottom: 18 }}>Set who's on tonight and when.</div>

        {upcoming.length === 0 && !adding && (
          <div style={{ color: C.muted2, fontSize: 13, textAlign: "center", padding: "16px 0 8px" }}>No upcoming shifts. Add one below.</div>
        )}

        {upcoming.map((s) => {
          const p = people.find((x) => x.name.toLowerCase() === (s.person || "").toLowerCase());
          const isEditing = editingId === s.id;
          return isEditing ? (
            <ShiftForm key={s.id}
              initial={s}
              people={people}
              onSave={async (data) => { await shiftsT.update(s.id, data); setEditingId(null); }}
              cancel={() => setEditingId(null)}
            />
          ) : (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 9 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: p?.color || C.muted, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p?.name || s.person}</div>
                <div style={{ fontSize: 11.5, color: C.muted2, fontFamily: fonts.mono, marginTop: 2 }}>
                  {fmtTime(s.start)}{s.end ? ` → ${fmtTime(s.end)}` : " · on call"}
                </div>
              </div>
              <button onClick={() => setEditingId(s.id)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", color: C.muted2, fontSize: 11, fontFamily: fonts.mono, cursor: "pointer" }}>EDIT</button>
              <button onClick={() => shiftsT.remove(s.id)} style={{ background: "none", border: "none", color: C.danger, fontSize: 16, cursor: "pointer", padding: "0 2px" }}>✕</button>
            </div>
          );
        })}

        {adding ? (
          <ShiftForm
            people={people}
            onSave={async (data) => { await shiftsT.add(data); setAdding(false); }}
            cancel={() => setAdding(false)}
          />
        ) : (
          <button onClick={() => setAdding(true)} style={bigBtn()}>+ Add shift</button>
        )}
      </div>
    </div>
  );
}

function ShiftForm({ initial, people, onSave, cancel }) {
  const n = now();
  const activePeople = (people || []).filter((p) => p.active !== false);
  const [personName, setPersonName] = useState(initial?.person || activePeople[0]?.name || "");
  const [startVal, setStartVal] = useState(toDatetimeLocal(initial?.start || n));
  const [endVal, setEndVal] = useState(initial?.end ? toDatetimeLocal(initial.end) : "");

  const save = () => {
    onSave({
      person_name: personName,
      start_ts: new Date(startVal).toISOString(),
      end_ts: endVal ? new Date(endVal).toISOString() : null,
    });
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.accent, marginBottom: 12 }}>{initial ? "EDIT SHIFT" : "NEW SHIFT"}</div>

      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 8 }}>PERSON</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {activePeople.map((p) => (
          <button key={p.id || p.name} onClick={() => setPersonName(p.name)}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${personName === p.name ? p.color : C.border}`, background: personName === p.name ? `${p.color}22` : C.surface, color: personName === p.name ? p.color : C.muted2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}>
            {p.name}
          </button>
        ))}
      </div>

      {[["START", startVal, setStartVal], ["END (optional)", endVal, setEndVal]].map(([label, val, setter]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>{label}</div>
          <input type="datetime-local" value={val} onChange={(e) => setter(e.target.value)}
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: fonts.mono, outline: "none", colorScheme: "dark" }} />
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={cancel} style={{ ...bigBtn(), background: C.surface, color: C.muted2, border: `1px solid ${C.border}`, flex: 1, marginTop: 0 }}>Cancel</button>
        <button onClick={save} style={{ ...bigBtn(), flex: 2, marginTop: 0 }}>Save shift</button>
      </div>
    </div>
  );
}

function LiveStatusCard({ sleeps, sleepsT, lastFeed, lastNappy, people, liveStatus, setActivity, addFeed }) {
  const { t } = useLang();
  const [, setTick] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const n = new Date();
  const activeSleep = sleeps.find((s) => !s.end);
  const lastSleep = sleeps.find((s) => s.end);
  const sleepMins = activeSleep ? Math.floor((n - activeSleep.start) / 60000) : null;
  const lastSleepMins = lastSleep ? Math.round((lastSleep.end - lastSleep.start) / 60000) : null;
  const awakeMins = !activeSleep && lastSleep ? Math.floor((n - lastSleep.end) / 60000) : null;
  const sleepPerson = activeSleep ? (people || []).find((p) => p.name === activeSleep.by) : null;

  const isFeeding = liveStatus?.status === "feeding";
  const feedMins = isFeeding && liveStatus?.started_at
    ? Math.floor((n - new Date(liveStatus.started_at)) / 60000)
    : null;

  const wakeUp = async () => {
    if (!activeSleep) return;
    await sleepsT.update(activeSleep.id, { end_ts: new Date().toISOString() });
    setActivity("idle");
  };

  const feedLabel = (() => {
    if (!lastFeed) return t("noFeedsYet");
    if (lastFeed.type === "combo") return `Breast+Bottle · ${lastFeed.breastDurationMins || "?"}min · ${lastFeed.bottleVolMl || lastFeed.vol || "?"}ml`;
    if (lastFeed.type === "breast") return `Breast (${lastFeed.side || "—"})${lastFeed.breastDurationMins ? ` · ${lastFeed.breastDurationMins}min` : ""}`;
    return `Bottle ${lastFeed.bottleVolMl || lastFeed.vol || "?"}ml`;
  })();

  return (
    <>
      {/* Feeding status (if active) */}
      {isFeeding && !showFinish && (
        <div style={{ background: "rgba(0,210,110,0.08)", border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: "18px 20px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 36, flexShrink: 0 }}>🤱</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.accent, marginBottom: 4 }}>{t("feedingNow")}</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{feedMins !== null ? `${feedMins}m` : "—"}</div>
              <div style={{ fontSize: 12, color: C.muted2, marginTop: 3 }}>{liveStatus.sub_type === "breast" ? "Breast" : "Feeding"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              <button onClick={() => { /* no-op: side change is optional tracking */ }}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", color: C.muted2, fontSize: 10, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
                {t("changeSide")}
              </button>
              <button onClick={() => setShowFinish(true)}
                style={{ background: C.accent, color: "#000", border: "none", borderRadius: 10, padding: "8px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: fonts.mono, letterSpacing: 0.5 }}>
                {t("finishFeeding")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish feeding form */}
      {isFeeding && showFinish && (
        <div style={{ background: C.surface, border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <FeedLog liveStatus={liveStatus} onSave={(f) => { addFeed(f); setActivity("idle"); setShowFinish(false); }} back={() => setShowFinish(false)} />
        </div>
      )}

      {/* Sleep / awake status */}
      <div style={{ background: activeSleep ? "rgba(0,210,110,0.07)" : C.card, border: `1px solid ${activeSleep ? C.accentBorder : C.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>{activeSleep ? "😴" : "☀️"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: activeSleep ? C.accent : C.muted2, marginBottom: 4 }}>
              {activeSleep ? t("jacobSleeping") : t("jacobAwake")}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
              {activeSleep
                ? fmtDuration(sleepMins)
                : awakeMins !== null ? t("awakenFor", fmtDuration(awakeMins)) : "—"}
            </div>
            {activeSleep && sleepPerson && (
              <div style={{ fontSize: 12, color: C.muted2, marginTop: 4 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: sleepPerson.color, marginRight: 5, verticalAlign: "middle" }} />
                {t("putDownBy", sleepPerson.name)}
              </div>
            )}
            {!activeSleep && lastSleep && (
              <div style={{ fontSize: 12, color: C.muted2, marginTop: 4 }}>
                {t("sleptFor", fmtDuration(lastSleepMins))} · {t("wokeAgo", agoStr(lastSleep.end))}
              </div>
            )}
            {!activeSleep && !lastSleep && (
              <div style={{ fontSize: 12, color: C.muted2, marginTop: 4 }}>{t("noSleepsYet")}</div>
            )}
          </div>
          {activeSleep && (
            <button onClick={wakeUp} style={{ background: C.accent, color: "#000", border: "none", borderRadius: 12, padding: "10px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: fonts.mono, letterSpacing: 0.5, whiteSpace: "nowrap", flexShrink: 0 }}>
              {t("heWokeUp")}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatTile icon="🍼" label={t("lastFeed")} value={lastFeed ? agoStr(lastFeed.at) : "—"} sub={feedLabel} />
        <StatTile icon="👶" label={t("lastNappy")} value={lastNappy ? agoStr(lastNappy.at) : "—"}
          sub={lastNappy ? ([lastNappy.urineLevel ? `Wet · ${lastNappy.urineLevel}` : null, lastNappy.stool ? "Soiled" : null].filter(Boolean).join(" · ") || lastNappy.type) : t("noNappiesYet")} />
      </div>
    </>
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
function ActivityLog({ feeds, nappies, sleeps, temps, feedsT, nappiesT, sleepsT, tempsT, people }) {
  const [editing, setEditing] = useState(null);

  const nameOf = (name) => {
    if (!name) return "—";
    const p = (people || []).find((x) => x.name === name || x.id === name);
    return p?.name || name;
  };

  const tableFor = (kind) => ({ feed: feedsT, nappy: nappiesT, sleep: sleepsT, temp: tempsT }[kind]);
  const timeColFor = (kind) => (kind === "sleep" ? "start_ts" : "at");

  const events = useMemo(() => [
    ...feeds.map((f) => ({
      id: f.id, kind: "feed", at: f.at, by: f.by,
      icon: "🍼",
      label: f.type === "combo"
        ? `Breast+Bottle · ${f.breastDurationMins || "?"}min · ${f.bottleVolMl || f.vol || "?"}ml`
        : f.type === "breast"
        ? `Breast (${f.side || "—"})${f.breastDurationMins ? ` · ${f.breastDurationMins}min` : ""}`
        : `Bottle · ${f.bottleVolMl || f.vol || "?"}ml`,
    })),
    ...nappies.map((n) => ({
      id: n.id, kind: "nappy", at: n.at, by: n.by,
      icon: "👶",
      label: [
        n.urineLevel ? `Wet · ${n.urineLevel} urine` : null,
        n.stool ? "Soiled" : null,
      ].filter(Boolean).join(" · ") || (n.type ? n.type.charAt(0).toUpperCase() + n.type.slice(1) : "Nappy"),
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
        <div style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 0.5, marginBottom: 12, color: call ? C.danger : C.text }}>{outcome.title}</div>
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
function Insights({ feeds, sleeps, temps, tempAlert, lastTemp, user, people, holderLog }) {
  const { t } = useLang();
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
          <div style={{ fontSize: 14, lineHeight: 1.55, color: C.danger }}>
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

      {holderLog && holderLog.length > 0 && (
        <>
          <Label>{t("shiftBalance")}</Label>
          <HolderAttributionBar rows={holderLog} people={people} clock={new Date()} />
        </>
      )}
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
function QuickLogFab({ open, setOpen, addFeed, addNappy, addSleep, addTemp, liveStatus, setActivity }) {
  const { t } = useLang();
  const [view, setView] = useState(null);
  const [toast, setToast] = useState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };
  const close = () => { setOpen(false); setView(null); };

  const isFeedingNow = liveStatus?.status === "feeding";

  return (
    <>
      {toast && <div style={{ position: "fixed", bottom: 150, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#000", padding: "10px 18px", borderRadius: 30, fontWeight: 600, fontSize: 13.5, zIndex: 300, animation: "fadeUp 0.2s", boxShadow: "0 8px 30px rgba(0,210,110,0.4)" }}>✓ {toast}</div>}

      <button onClick={() => setOpen(true)} style={{ position: "fixed", bottom: 86, right: 18, width: 58, height: 58, borderRadius: "50%", background: C.accent, border: "none", color: "#000", fontSize: 28, fontWeight: 300, cursor: "pointer", zIndex: 200, boxShadow: "0 8px 30px rgba(0,210,110,0.45)", maxWidth: 480, display: "grid", placeItems: "center" }}>
        +
      </button>

      {open && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 250, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: "22px 22px 0 0", padding: 20, width: "100%", maxWidth: 480, borderTop: `1px solid ${C.border}`, animation: "slideIn 0.25s", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, background: C.cardHi, borderRadius: 2, margin: "0 auto 18px" }} />

            {!view && (
              <>
                <div style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, marginBottom: 16 }}>{t("quickLog")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <LogBtn icon="🍼" label={t("feed")} onClick={() => setView("feed")} />
                  <LogBtn icon="👶" label={t("nappy")} onClick={() => setView("nappy")} />
                  <LogBtn icon="😴" label={t("sleep")} onClick={() => setView("sleep")} />
                  <LogBtn icon="🌡️" label={t("addTemp")} onClick={() => setView("temp")} />
                </div>
                {!isFeedingNow && (
                  <button onClick={() => { setActivity("feeding", "breast"); flash(t("startBreastfeeding")); close(); }}
                    style={{ ...bigBtn(), marginTop: 14, background: C.accentDim, color: C.accent, border: `1px solid ${C.accentBorder}` }}>
                    ▶ {t("startBreastfeeding")}
                  </button>
                )}
              </>
            )}

            {view === "feed" && (
              <FeedLog liveStatus={liveStatus} onSave={(f) => { addFeed(f); if (isFeedingNow) setActivity("idle"); flash(t("feedLogged")); close(); }} back={() => setView(null)} />
            )}
            {view === "nappy" && (
              <NappyLog onSave={(n) => { addNappy(n); flash(t("nappyLogged")); close(); }} back={() => setView(null)} />
            )}
            {view === "sleep" && (
              <div>
                <SheetTitle back={() => setView(null)}>{t("sleep")}</SheetTitle>
                <button onClick={() => { addSleep({ start: now(), end: null }); setActivity("napping"); flash(t("sleepStarted")); close(); }} style={{ ...bigBtn(), marginTop: 4 }}>{t("startSleep")}</button>
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
  const { t } = useLang();
  const [c, setC] = useState(36.8);
  const high = c >= 38;
  return (
    <div>
      <SheetTitle back={back}>{t("addTemp")}</SheetTitle>
      <div style={{ textAlign: "center", margin: "10px 0 18px" }}>
        <div style={{ fontFamily: fonts.display, fontSize: 56, color: high ? C.danger : C.accent, lineHeight: 1 }}>{c.toFixed(1)}°C</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted2, marginTop: 6 }}>{t("tempRange")}</div>
      </div>
      <input type="range" min="35" max="40" step="0.1" value={c} onChange={(e) => setC(parseFloat(e.target.value))} style={{ width: "100%", accentColor: high ? C.danger : C.accent, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[36.5, 36.8, 37.2, 37.8, 38.2].map((v) => (
          <button key={v} onClick={() => setC(v)} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, color: C.muted2, fontSize: 12, fontFamily: fonts.mono, cursor: "pointer" }}>{v}</button>
        ))}
      </div>
      {high && (
        <div style={{ background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 12, padding: 13, fontSize: 13, lineHeight: 1.5, color: C.danger, marginBottom: 14 }}>
          {t("tempWarning")}
        </div>
      )}
      <button onClick={() => onSave(c)} style={bigBtn()}>{t("saveReading")}</button>
    </div>
  );
}

function FeedLog({ onSave, back, liveStatus }) {
  const { t } = useLang();
  const timerMins = liveStatus?.status === "feeding" && liveStatus?.started_at
    ? Math.floor((new Date() - new Date(liveStatus.started_at)) / 60000)
    : null;

  const [side, setSide] = useState("L");
  const [breastDuration, setBreastDuration] = useState(timerMins !== null ? String(timerMins) : "");
  const [breastOn, setBreastOn] = useState(timerMins !== null);
  const [bottleVol, setBottleVol] = useState(60);
  const [bottleOn, setBottleOn] = useState(false);

  const save = () => {
    const bd = breastOn && breastDuration ? parseInt(breastDuration, 10) : null;
    const bv = bottleOn ? bottleVol : null;
    if (!bd && !bv) return;
    onSave({ breastDurationMins: bd, side: breastOn ? side : null, bottleVolMl: bv });
  };

  return (
    <div>
      <SheetTitle back={back}>{t("feed")}</SheetTitle>
      {timerMins !== null && (
        <div style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.accent, fontFamily: fonts.mono }}>
          ▶ {t("durationFromTimer")}: {timerMins}min
        </div>
      )}
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 14 }}>{t("feedComboNote")}</div>

      {/* BREAST section */}
      <div style={{ background: C.card, border: `1px solid ${breastOn ? C.accentBorder : C.border}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: breastOn ? 12 : 0 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: breastOn ? C.accent : C.muted }}>{t("breastSection")}</div>
          <button onClick={() => setBreastOn(!breastOn)} style={{ background: breastOn ? C.accent : C.surface, border: `1px solid ${breastOn ? C.accent : C.border}`, borderRadius: 20, padding: "4px 14px", color: breastOn ? "#000" : C.muted, fontSize: 11, fontFamily: fonts.mono, cursor: "pointer" }}>
            {breastOn ? "ON" : "OFF"}
          </button>
        </div>
        {breastOn && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {["L", "R", "Both"].map((s) => (
                <button key={s} onClick={() => setSide(s)} style={{ ...logChoice(), background: side === s ? C.accentDim : C.card, borderColor: side === s ? C.accentBorder : C.border, color: side === s ? C.accent : C.text }}>{s}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, whiteSpace: "nowrap" }}>{t("durationMin")}</div>
              <input type="number" min="0" max="60" value={breastDuration} onChange={(e) => setBreastDuration(e.target.value)} placeholder="—"
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 15, fontFamily: fonts.mono, outline: "none", width: 70 }} />
            </div>
          </>
        )}
      </div>

      {/* BOTTLE section */}
      <div style={{ background: C.card, border: `1px solid ${bottleOn ? C.accentBorder : C.border}`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: bottleOn ? 12 : 0 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: bottleOn ? C.accent : C.muted }}>{t("bottleSection")}</div>
          <button onClick={() => setBottleOn(!bottleOn)} style={{ background: bottleOn ? C.accent : C.surface, border: `1px solid ${bottleOn ? C.accent : C.border}`, borderRadius: 20, padding: "4px 14px", color: bottleOn ? "#000" : C.muted, fontSize: 11, fontFamily: fonts.mono, cursor: "pointer" }}>
            {bottleOn ? "ON" : "OFF"}
          </button>
        </div>
        {bottleOn && (
          <>
            <div style={{ textAlign: "center", fontFamily: fonts.display, fontSize: 36, color: C.accent, marginBottom: 6 }}>{bottleVol}<span style={{ fontSize: 16, color: C.muted2 }}>ml</span></div>
            <input type="range" min="10" max="200" step="5" value={bottleVol} onChange={(e) => setBottleVol(+e.target.value)} style={{ width: "100%", accentColor: C.accent }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, fontFamily: fonts.mono, marginTop: 4 }}>
              <span>10ml</span><span>200ml</span>
            </div>
          </>
        )}
      </div>

      <button onClick={save} disabled={!breastOn && !bottleOn} style={{ ...bigBtn(), marginTop: 0, opacity: (breastOn || bottleOn) ? 1 : 0.4 }}>{t("saveFeed")}</button>
    </div>
  );
}

function NappyLog({ onSave, back }) {
  const { t } = useLang();
  const [urineLevel, setUrineLevel] = useState(null);
  const [stool, setStool] = useState(false);

  const urineLevels = [
    ["none", t("nappyNone")],
    ["light", t("nappyLight")],
    ["normal", t("nappyNormal")],
    ["heavy", t("nappyHeavy")],
  ];

  const save = () => {
    const ul = urineLevel === "none" ? null : urineLevel;
    onSave({ urineLevel: ul, stool });
  };

  const label = [
    urineLevel && urineLevel !== "none" ? `Wet · ${urineLevel} urine` : null,
    stool ? "Soiled" : null,
  ].filter(Boolean).join(" + ") || "Nothing selected";

  return (
    <div>
      <SheetTitle back={back}>{t("nappy")}</SheetTitle>

      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 10 }}>{t("nappyUrine").toUpperCase()}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {urineLevels.map(([k, lbl]) => (
          <button key={k} onClick={() => setUrineLevel(k)}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${urineLevel === k ? C.accentBorder : C.border}`, background: urineLevel === k ? C.accentDim : C.card, color: urineLevel === k ? C.accent : C.muted2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 10 }}>{t("nappyStool").toUpperCase()}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {[[false, t("nappyNone")], [true, t("nappySoiled")]].map(([v, lbl]) => (
          <button key={String(v)} onClick={() => setStool(v)}
            style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${stool === v ? C.accentBorder : C.border}`, background: stool === v ? C.accentDim : C.card, color: stool === v ? C.accent : C.muted2, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: fonts.body }}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "10px 14px", fontSize: 13, color: C.muted2, marginBottom: 16, fontFamily: fonts.mono }}>
        {label}
      </div>

      <button onClick={save} disabled={!urineLevel && !stool}
        style={{ ...bigBtn(), marginTop: 0, opacity: (urineLevel || stool) ? 1 : 0.4 }}>
        {t("nappyLogged")}
      </button>
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
// BABY METRICS
// ============================================================
function useBabyMetrics() {
  const [metrics, setMetrics] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("baby_metrics").select("*").is("deleted_at", null).order("measured_at", { ascending: false }).then(({ data }) => {
      if (data) setMetrics(data.map((r) => ({ id: r.id, at: new Date(r.measured_at), weight: r.weight_kg, length: r.length_cm, head: r.head_cm, notes: r.notes })));
    });
    const ch = supabase.channel("baby-metrics-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "baby_metrics" }, () => {
        supabase.from("baby_metrics").select("*").is("deleted_at", null).order("measured_at", { ascending: false }).then(({ data }) => {
          if (data) setMetrics(data.map((r) => ({ id: r.id, at: new Date(r.measured_at), weight: r.weight_kg, length: r.length_cm, head: r.head_cm, notes: r.notes })));
        });
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const addMetric = async (m) => {
    const row = { measured_at: (m.at || new Date()).toISOString(), weight_kg: m.weight || null, length_cm: m.length || null, head_cm: m.head || null, notes: m.notes || null };
    if (!supabase) { setMetrics((prev) => [{ id: `local-${Date.now()}`, at: new Date(), ...m }, ...prev]); return; }
    await supabase.from("baby_metrics").insert(row);
  };

  const deleteMetric = async (id) => {
    if (!supabase) { setMetrics((prev) => prev.filter((m) => m.id !== id)); return; }
    await supabase.from("baby_metrics").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  return { metrics, addMetric, deleteMetric };
}

// ============================================================
// DAILY SUMMARY ("How's today been?")
// ============================================================
function useDailySummary() {
  const [summaries, setSummaries] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    const load = () => supabase.from("daily_summary").select("*").then(({ data }) => { if (data) setSummaries(data); });
    load();
    const ch = supabase.channel("daily-summary-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_summary" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const addSummary = async (dateStr, mood) => {
    setSummaries((s) => [...s.filter((x) => x.date !== dateStr), { date: dateStr, mood }]);
    if (!supabase) return;
    await supabase.from("daily_summary").upsert({ date: dateStr, mood }, { onConflict: "date" });
  };

  return { summaries, addSummary };
}

// ============================================================
// HOLDER LOG (24h attribution)
// ============================================================
function useHolderLog() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    const load = () =>
      supabase.from("holder_log").select("*").is("deleted_at", null).order("started_at", { ascending: false }).limit(300)
        .then(({ data }) => {
          if (data) setRows(data.map((r) => ({ id: r.id, person: r.person_name, start: new Date(r.started_at), end: r.ended_at ? new Date(r.ended_at) : null })));
        });
    load();
    const ch = supabase.channel("holder-log-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "holder_log" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const clearOld = async () => {
    if (!supabase) return;
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    await supabase.from("holder_log").update({ deleted_at: new Date().toISOString() }).lt("started_at", cutoff).is("deleted_at", null);
  };

  return { rows, clearOld };
}

function computeHolderStats(rows, clock) {
  const windowStart = new Date(clock.getTime() - 24 * 3600000);
  const totals = {};
  (rows || []).forEach((r) => {
    const start = r.start < windowStart ? windowStart : r.start;
    const end = r.end || clock;
    if (end <= windowStart || end <= start) return;
    totals[r.person] = (totals[r.person] || 0) + (end - start);
  });
  const current = (rows || []).find((r) => !r.end) || null;
  return { totals, current };
}

function HolderAttributionBar({ rows, people, clock }) {
  const { t } = useLang();
  const c = clock || new Date();
  const { totals, current } = computeHolderStats(rows, c);
  const totalMs = 24 * 3600000;
  const entries = Object.entries(totals).filter(([, ms]) => ms > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const currentMs = current ? c - current.start : 0;
  const currentPerson = current ? (people || []).find((p) => p.name === current.person) : null;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", marginBottom: 14, background: C.bg }}>
        {entries.map(([name, ms]) => {
          const person = (people || []).find((p) => p.name === name);
          const pct = (ms / totalMs) * 100;
          return <div key={name} title={`${name} · ${Math.round(pct)}%`} style={{ width: `${pct}%`, background: person?.color || C.muted }} />;
        })}
      </div>
      {entries.map(([name, ms]) => {
        const person = (people || []).find((p) => p.name === name);
        const pct = Math.round((ms / totalMs) * 100);
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: person?.color || C.muted, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, flex: 1 }}>{name}</span>
            <span style={{ fontSize: 12.5, color: C.muted2, fontFamily: fonts.mono }}>{pct}%</span>
          </div>
        );
      })}
      {current && currentMs > 0 && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.muted2 }}>
          {t("longestStretch", currentPerson?.name || current.person, fmtDuration(Math.round(currentMs / 60000)))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ROUTINE CONFIGURATION
// ============================================================
const ROUTINE_DEFAULTS = { feedIntervalMins: 180, feedTargetMl: 60, feedType: "formula", maxAwakeMins: 90, expectedNapMins: 45, phaseLabel: "Newborn" };

function useRoutineConfig() {
  const routineT = useLiveTable("routine_config", {
    mapRow: (r) => ({
      id: r.id,
      feedIntervalMins: r.feed_interval_mins ?? ROUTINE_DEFAULTS.feedIntervalMins,
      feedTargetMl: r.feed_target_ml ?? ROUTINE_DEFAULTS.feedTargetMl,
      feedType: r.feed_type || ROUTINE_DEFAULTS.feedType,
      maxAwakeMins: r.max_awake_mins ?? ROUTINE_DEFAULTS.maxAwakeMins,
      expectedNapMins: r.expected_nap_mins ?? ROUTINE_DEFAULTS.expectedNapMins,
      phaseLabel: r.phase_label || ROUTINE_DEFAULTS.phaseLabel,
    }),
  });
  const config = routineT.rows[0] || ROUTINE_DEFAULTS;

  const saveConfig = async (patch) => {
    const next = { ...config, ...patch };
    if (!supabase) return;
    await supabase.from("routine_config").upsert({
      id: 1,
      feed_interval_mins: next.feedIntervalMins,
      feed_target_ml: next.feedTargetMl,
      feed_type: next.feedType,
      max_awake_mins: next.maxAwakeMins,
      expected_nap_mins: next.expectedNapMins,
      phase_label: next.phaseLabel,
      updated_at: new Date().toISOString(),
    });
  };

  return { config, saveConfig };
}

function nextFeedDue(lastFeed, config) {
  if (!lastFeed) return null;
  return new Date(lastFeed.at.getTime() + (config.feedIntervalMins || ROUTINE_DEFAULTS.feedIntervalMins) * 60000);
}

function Stepper({ label, value, onChange, min, max, step, fmt }) {
  const format = fmt || ((v) => String(v));
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
      <div style={{ fontSize: 14, color: C.muted2, marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => onChange(Math.max(min, value - step))} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 18, cursor: "pointer" }}>−</button>
        <div style={{ flex: 1, textAlign: "center", fontFamily: fonts.mono, fontSize: 16, color: C.accent }}>{format(value)}</div>
        <button onClick={() => onChange(Math.min(max, value + step))} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 18, cursor: "pointer" }}>+</button>
      </div>
    </div>
  );
}

function RoutineSettings({ config, saveConfig }) {
  const { t } = useLang();
  const fmtHrsMins = (mins) => (mins % 60 === 0 ? `${mins / 60}h` : `${Math.floor(mins / 60)}h ${mins % 60}m`);
  return (
    <div>
      <Label>{t("routineSettings")}</Label>
      <Stepper label={t("feedEvery")} value={config.feedIntervalMins} onChange={(v) => saveConfig({ feedIntervalMins: v })} min={60} max={360} step={30} fmt={fmtHrsMins} />
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <div style={{ fontSize: 14, color: C.muted2, marginBottom: 10 }}>{t("targetVolume")} — {config.feedTargetMl}ml</div>
        <input type="range" min={10} max={200} step={5} value={config.feedTargetMl} onChange={(e) => saveConfig({ feedTargetMl: Number(e.target.value) })} style={{ width: "100%", accentColor: C.accent }} />
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <div style={{ fontSize: 14, color: C.muted2, marginBottom: 10 }}>{t("feedType")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {["formula", "breast", "combo"].map((k) => (
            <button key={k} onClick={() => saveConfig({ feedType: k })}
              style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${config.feedType === k ? C.accentBorder : C.border}`, background: config.feedType === k ? C.accentDim : C.surface, color: config.feedType === k ? C.accent : C.muted2, fontSize: 12, fontFamily: fonts.mono, cursor: "pointer" }}>
              {t(`feedType_${k}`)}
            </button>
          ))}
        </div>
      </div>
      <Stepper label={t("maxAwakeWindow")} value={config.maxAwakeMins} onChange={(v) => saveConfig({ maxAwakeMins: v })} min={30} max={180} step={15} fmt={fmtHrsMins} />
      <Stepper label={t("expectedNap")} value={config.expectedNapMins} onChange={(v) => saveConfig({ expectedNapMins: v })} min={15} max={180} step={15} fmt={fmtHrsMins} />
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <div style={{ fontSize: 14, color: C.muted2, marginBottom: 10 }}>{t("phaseLabel")}</div>
        <input value={config.phaseLabel} onChange={(e) => saveConfig({ phaseLabel: e.target.value })} placeholder="Week 1"
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: fonts.body, outline: "none" }} />
      </div>
    </div>
  );
}

function MiniLineChart({ data, color, unit }) {
  if (data.length < 2) return null;
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 280, H = 60, pad = 8;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((d.v - min) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const last = data[data.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 60 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1)) * (W - pad * 2);
        const y = H - pad - ((d.v - min) / range) * (H - pad * 2);
        return <circle key={i} cx={x} cy={y} r="3" fill={i === data.length - 1 ? color : C.surface} stroke={color} strokeWidth="1.5" />;
      })}
    </svg>
  );
}

function BabyMetrics({ metrics, addMetric, deleteMetric }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [head, setHead] = useState("");
  const [notes, setNotes] = useState("");

  const save = async () => {
    const w = parseFloat(weight) || null;
    const l = parseFloat(length) || null;
    const h = parseFloat(head) || null;
    if (!w && !l && !h) return;
    await addMetric({ weight: w, length: l, head: h, notes: notes.trim() || null });
    setWeight(""); setLength(""); setHead(""); setNotes("");
    setShowForm(false);
  };

  const latest = (key) => metrics.find((m) => m[key] != null);
  const chartData = (key) => metrics.filter((m) => m[key] != null).slice().reverse().map((m) => ({ v: m[key], at: m.at }));

  const sections = [
    { key: "weight", label: t("weightKg"), unit: "kg", color: C.accent, fmt: (v) => v.toFixed(2) },
    { key: "length", label: t("lengthCm"), unit: "cm", color: "#60a5fa", fmt: (v) => v.toFixed(1) },
    { key: "head",   label: t("headCm"),   unit: "cm", color: "#c084fc", fmt: (v) => v.toFixed(1) },
  ];

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: 1, margin: "10px 0 4px" }}>{t("babyMetrics").toUpperCase()}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => setShowForm(!showForm)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "5px 14px", color: C.muted2, fontSize: 10, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
          {showForm ? "Cancel" : `+ ${t("logMeasurement")}`}
        </button>
      </div>

      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.accent, marginBottom: 14 }}>NEW MEASUREMENT</div>
          {[[t("weightKg"), weight, setWeight, "3.45"], [t("lengthCm"), length, setLength, "51.5"], [t("headCm"), head, setHead, "34.0"]].map(([lbl, val, setter, ph]) => (
            <div key={lbl} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 6 }}>{lbl.toUpperCase()}</div>
              <input type="number" step="0.01" value={val} onChange={(e) => setter(e.target.value)} placeholder={ph}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 15, fontFamily: fonts.mono, outline: "none" }} />
            </div>
          ))}
          <button onClick={save} disabled={!weight && !length && !head}
            style={{ ...bigBtn(), marginTop: 4, opacity: (weight || length || head) ? 1 : 0.4 }}>{t("saveMetric")}</button>
        </div>
      )}

      {sections.map(({ key, label, unit, color, fmt }) => {
        const data = chartData(key);
        const l = latest(key);
        return (
          <div key={key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color }}>{label.toUpperCase()}</div>
              {l ? (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color }}>{fmt(l[key])} {unit}</div>
                  <div style={{ fontSize: 11, color: C.muted2 }}>{t("measuredAgo", agoStr(l.at))}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: C.muted2 }}>{t("noMetricsYet")}</div>
              )}
            </div>
            {data.length >= 2 && <MiniLineChart data={data} color={color} unit={unit} />}
          </div>
        );
      })}

      {metrics.length > 0 && (
        <div>
          <Label>History</Label>
          {metrics.slice(0, 10).map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, padding: "11px 14px", marginBottom: 7 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: C.muted2 }}>{m.at.toLocaleDateString([], { day: "numeric", month: "short" })}</div>
                <div style={{ fontSize: 13.5, marginTop: 2 }}>
                  {[m.weight ? `${m.weight.toFixed(2)} kg` : null, m.length ? `${m.length.toFixed(1)} cm` : null, m.head ? `head ${m.head.toFixed(1)} cm` : null].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button onClick={() => deleteMetric(m.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", padding: "0 4px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {metrics.length === 0 && !showForm && (
        <div style={{ textAlign: "center", color: C.muted2, fontSize: 14, padding: "40px 20px" }}>{t("noMetricsYet")}</div>
      )}
    </div>
  );
}

// ============================================================
// PHOTOS / GALLERY
// ============================================================
async function compressImage(file, maxEdge = 1600, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxEdge || height > maxEdge) {
        if (width > height) { height = Math.round((height / width) * maxEdge); width = maxEdge; }
        else { width = Math.round((width / height) * maxEdge); height = maxEdge; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
    };
    img.src = url;
  });
}

function usePhotos() {
  const [photos, setPhotos] = useState([]);

  const load = () => {
    if (!supabase) return;
    supabase.from("photos").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setPhotos(data);
    });
  };

  useEffect(() => {
    load();
    if (!supabase) return;
    const ch = supabase.channel("photos-ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const uploadPhoto = async (file, caption, uploadedBy) => {
    if (!supabase) return;
    const compressed = await compressImage(file);
    const ext = "jpg";
    const path = `photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, compressed, { contentType: "image/jpeg" });
    if (upErr) { console.error("upload error", upErr); return null; }
    const { data } = await supabase.from("photos").insert({ storage_path: path, caption: caption || null, uploaded_by: uploadedBy || null }).select().single();
    return data;
  };

  const deletePhoto = async (id, storagePath) => {
    if (!supabase) { setPhotos((p) => p.filter((x) => x.id !== id)); return; }
    await supabase.from("photos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (storagePath) await supabase.storage.from("photos").remove([storagePath]);
    setPhotos((p) => p.filter((x) => x.id !== id));
  };

  const getUrl = (path) => {
    if (!supabase || !path) return null;
    return supabase.storage.from("photos").getPublicUrl(path).data?.publicUrl;
  };

  return { photos, uploadPhoto, deletePhoto, getUrl };
}

function Gallery({ photos, uploadPhoto, deletePhoto, getUrl, currentUser }) {
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadPhoto(file, caption, currentUser);
    setCaption("");
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 16px" }}>
        <div style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: 1 }}>{t("gallery").toUpperCase()}</div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ background: C.accentDim, border: `1px solid ${C.accentBorder}`, borderRadius: 12, padding: "8px 16px", color: C.accent, fontSize: 12, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer", opacity: uploading ? 0.5 : 1 }}>
          {uploading ? t("uploading") : `📷 ${t("uploadPhoto")}`}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

      {/* Caption field shown when file selected (before upload) */}
      <div style={{ marginBottom: 14 }}>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("addCaption")}
          style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 13, fontFamily: fonts.body, outline: "none" }} />
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted2, fontSize: 14, padding: "40px 20px" }}>{t("noPhotosYet")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {photos.map((p) => {
            const url = getUrl(p.storage_path);
            return url ? (
              <div key={p.id} onClick={() => setSelected(p)} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", cursor: "pointer", background: C.card }}>
                <img src={url} alt={p.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Full-size view */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: 480, width: "100%" }}>
            <img src={getUrl(selected.storage_path)} alt={selected.caption || ""} style={{ width: "100%", borderRadius: 14, display: "block" }} />
            {selected.caption && (
              <div style={{ color: C.text, fontSize: 14, marginTop: 12, textAlign: "center" }}>{selected.caption}</div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center" }}>
              <button onClick={() => setSelected(null)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 20px", color: C.text, fontSize: 13, cursor: "pointer" }}>Close</button>
              <button onClick={() => { deletePhoto(selected.id, selected.storage_path); setSelected(null); }}
                style={{ background: "rgba(255,90,90,0.12)", border: "1px solid rgba(255,90,90,0.3)", borderRadius: 10, padding: "10px 20px", color: C.danger, fontSize: 13, cursor: "pointer" }}>
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MORE SHEET
// ============================================================
function MoreSheet({ close, open }) {
  const { t } = useLang();
  const items = [
    { k: "daily3", icon: "🎯", label: "Daily 3", sub: "Today's three anchors" },
    { k: "log", icon: "📓", label: "Daily Log", sub: "Private — how are you doing?" },
    { k: "milestones", icon: "🌱", label: "Milestones", sub: "Jacob's growth & firsts" },
    { k: "metrics", icon: "📏", label: "Baby Metrics", sub: "Weight, length & head circ." },
    { k: "gallery", icon: "📷", label: "Gallery", sub: "Photos of Jacob" },
    { k: "routine", icon: "⏱️", label: t("routineMenuLabel"), sub: t("routineMenuSub") },
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
function MoreScreen({ screen, close, user, dailyLogs, addDailyLog, people, addPerson, toggleActive, metrics, addMetric, deleteMetric, photos, uploadPhoto, deletePhoto, getUrl, routineConfig, saveRoutineConfig, clearOldHolderLog }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 280, maxWidth: 480, margin: "0 auto", overflowY: "auto", animation: "fadeUp 0.2s" }}>
      <div style={{ padding: "16px 16px 100px" }}>
        <button onClick={close} style={backBtn()}>← Close</button>
        {screen === "daily3" && <Daily3 user={user} />}
        {screen === "log" && <DailyLog user={user} entries={dailyLogs[user.name] || []} addEntry={(e) => addDailyLog(user.name, e)} />}
        {screen === "milestones" && <Milestones />}
        {screen === "metrics" && <BabyMetrics metrics={metrics || []} addMetric={addMetric} deleteMetric={deleteMetric} />}
        {screen === "gallery" && <Gallery photos={photos || []} uploadPhoto={uploadPhoto} deletePhoto={deletePhoto} getUrl={getUrl} currentUser={user?.name} />}
        {screen === "routine" && <RoutineSettings config={routineConfig} saveConfig={saveRoutineConfig} />}
        {screen === "settings" && <Settings people={people} addPerson={addPerson} toggleActive={toggleActive} clearOldHolderLog={clearOldHolderLog} />}
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
const PERSON_COLORS = ["#4ade9a", "#60a5fa", "#c084fc", "#f97316", "#f43f5e", "#facc15", "#22d3ee", "#a3e635"];

function Settings({ people, addPerson, toggleActive, clearOldHolderLog }) {
  const { t } = useLang();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PERSON_COLORS[0]);
  const [newRole, setNewRole] = useState("household");
  const [alarmSound, setAlarmSound] = useState(() => localStorage.getItem("dadops-alarm-sound") === "true");
  const [flashIntensity, setFlashIntensity] = useState(() => {
    const v = localStorage.getItem("dadops-flash-intensity");
    return v === "0.3" ? "low" : v === "0.9" ? "high" : "medium";
  });

  const setFlash = (level) => {
    const opMap = { low: "0.3", medium: "0.6", high: "0.9" };
    localStorage.setItem("dadops-flash-intensity", opMap[level]);
    setFlashIntensity(level);
  };

  const toggleSound = () => {
    const next = !alarmSound;
    localStorage.setItem("dadops-alarm-sound", String(next));
    setAlarmSound(next);
  };

  const [ambientIdleMins, setAmbientIdleMins] = useState(() => Number(localStorage.getItem("dadops-ambient-idle-mins")) || 3);
  const [ambientInsights, setAmbientInsights] = useState(() => localStorage.getItem("dadops-ambient-insights") !== "false");
  const [ambientTips, setAmbientTips] = useState(() => localStorage.getItem("dadops-ambient-tips") !== "false");
  const [clearedMsg, setClearedMsg] = useState(false);

  const setIdleMins = (v) => { localStorage.setItem("dadops-ambient-idle-mins", String(v)); setAmbientIdleMins(v); };
  const toggleAmbientInsights = () => { const next = !ambientInsights; localStorage.setItem("dadops-ambient-insights", String(next)); setAmbientInsights(next); };
  const toggleAmbientTips = () => { const next = !ambientTips; localStorage.setItem("dadops-ambient-tips", String(next)); setAmbientTips(next); };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addPerson(newName.trim(), newColor, newRole);
    setNewName(""); setNewColor(PERSON_COLORS[0]); setNewRole("household"); setShowAddForm(false);
  };

  return (
    <div>
      <div style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: 1, margin: "10px 0 18px" }}>SETTINGS</div>
      <Label>Baby</Label>
      <SetRow label="Name" value="Jacob" />
      <SetRow label="Born" value="26 June 2026" />
      <SetRow label="Feeding" value="Breast + Bottle" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 2px 8px" }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted }}>{t("managePeople")}</div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "5px 12px", color: C.muted2, fontSize: 10, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
            {t("addPersonBtn")}
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, fontFamily: fonts.mono }}>{t("deactivatingNote")}</div>

      {(people || []).map((p) => (
        <div key={p.id || p.name} style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 8, opacity: p.active === false ? 0.5 : 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.color, display: "grid", placeItems: "center", color: "#000", fontWeight: 700, fontSize: 13 }}>{p.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: C.muted2, fontFamily: fonts.mono }}>{(p.role === "household" ? t("householdRole") : t("helperRole")).toUpperCase()}</div>
          </div>
          <button onClick={() => toggleActive(p.id, p.active === false)}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 10, padding: "5px 10px", color: p.active !== false ? C.accent : C.muted, fontSize: 10, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
            {p.active !== false ? t("activeStatus") : t("inactiveStatus")}
          </button>
        </div>
      ))}

      {showAddForm && (
        <div style={{ background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: C.accent, marginBottom: 12 }}>NEW PERSON</div>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name"
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, fontFamily: fonts.body, outline: "none", marginBottom: 12 }} />
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 8 }}>COLOR</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {PERSON_COLORS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)}
                style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: newColor === c ? `3px solid ${C.text}` : "3px solid transparent", cursor: "pointer", padding: 0 }} />
            ))}
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5, color: C.muted, marginBottom: 8 }}>ROLE</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["household", "helper"].map((r) => (
              <button key={r} onClick={() => setNewRole(r)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${newRole === r ? C.accentBorder : C.border}`, background: newRole === r ? C.accentDim : C.surface, color: newRole === r ? C.accent : C.muted2, fontSize: 12, fontFamily: fonts.mono, cursor: "pointer" }}>
                {r === "household" ? t("householdRole") : t("helperRole")}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowAddForm(false)} style={{ ...bigBtn(), background: C.surface, color: C.muted2, border: `1px solid ${C.border}`, flex: 1, marginTop: 0 }}>Cancel</button>
            <button onClick={handleAdd} disabled={!newName.trim()} style={{ ...bigBtn(), flex: 2, marginTop: 0, opacity: newName.trim() ? 1 : 0.5 }}>{t("savePerson")}</button>
          </div>
        </div>
      )}

      <Label>{t("alarmSettings")}</Label>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: C.muted2 }}>{t("alarmSound")}</span>
        <button onClick={toggleSound} style={{ background: alarmSound ? C.accentDim : C.surface, border: `1px solid ${alarmSound ? C.accentBorder : C.border}`, borderRadius: 20, padding: "5px 16px", color: alarmSound ? C.accent : C.muted, fontSize: 11, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
          {alarmSound ? "ON" : "OFF"}
        </button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <div style={{ fontSize: 14, color: C.muted2, marginBottom: 10 }}>{t("flashIntensity")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["low", t("flashLow")], ["medium", t("flashMed")], ["high", t("flashHigh")]].map(([k, lbl]) => (
            <button key={k} onClick={() => setFlash(k)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${flashIntensity === k ? C.accentBorder : C.border}`, background: flashIntensity === k ? C.accentDim : C.surface, color: flashIntensity === k ? C.accent : C.muted2, fontSize: 12, fontFamily: fonts.mono, cursor: "pointer" }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <Label>{t("ambientSettings")}</Label>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <div style={{ fontSize: 14, color: C.muted2, marginBottom: 10 }}>{t("idleBeforeAmbient")} — {ambientIdleMins} min</div>
        <input type="range" min={1} max={10} step={1} value={ambientIdleMins} onChange={(e) => setIdleMins(Number(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: C.muted2 }}>{t("showInsightsAmbient")}</span>
        <button onClick={toggleAmbientInsights} style={{ background: ambientInsights ? C.accentDim : C.surface, border: `1px solid ${ambientInsights ? C.accentBorder : C.border}`, borderRadius: 20, padding: "5px 16px", color: ambientInsights ? C.accent : C.muted, fontSize: 11, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
          {ambientInsights ? "ON" : "OFF"}
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: C.muted2 }}>{t("showTipsAmbient")}</span>
        <button onClick={toggleAmbientTips} style={{ background: ambientTips ? C.accentDim : C.surface, border: `1px solid ${ambientTips ? C.accentBorder : C.border}`, borderRadius: 20, padding: "5px 16px", color: ambientTips ? C.accent : C.muted, fontSize: 11, fontFamily: fonts.mono, letterSpacing: 1, cursor: "pointer" }}>
          {ambientTips ? "ON" : "OFF"}
        </button>
      </div>

      {clearOldHolderLog && (
        <>
          <Label>{t("holderAttribution")}</Label>
          <button onClick={async () => { await clearOldHolderLog(); setClearedMsg(true); setTimeout(() => setClearedMsg(false), 2500); }}
            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", color: C.muted2, fontSize: 13, cursor: "pointer", fontFamily: fonts.body }}>
            {clearedMsg ? t("holderHistoryCleared") : t("clearHolderHistory")}
          </button>
        </>
      )}

      <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 20, fontFamily: fonts.mono, lineHeight: 1.8 }}>
        DADOPS · v5 · SUPABASE
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
  const { t } = useLang();
  const items = [
    ["shift", "🔄", t("shift")],
    ["protocols", "⚡", t("protocols")],
    ["insights", "📊", t("insights")],
    ["library", "📚", t("library")],
    ["more", "☰", t("more")],
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
