import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { supabase } from "./supabaseClient";

function Root() {
  if (!supabase) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080f0d", color: "#fff",
        fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24, textAlign: "center",
      }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 32, color: "#00D26E", marginBottom: 12, letterSpacing: 1 }}>
            DADOPS NEEDS SETUP
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "#a8c2b3" }}>
            No Supabase connection found. Copy <code>.env.example</code> to <code>.env</code>,
            paste in your Project URL and anon key from the Supabase dashboard
            (Project Settings → API), then restart <code>npm run dev</code>.
          </div>
        </div>
      </div>
    );
  }
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
