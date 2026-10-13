import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App";

// A page loaded before a deploy can import chunks the deploy removed, which
// fails and leaves a blank page. Reload to get the new build, at most once
// every 10 seconds so a real network failure can't loop.
const PRELOAD_RELOAD_KEY = "blorp-preload-error-reload";
window.addEventListener("vite:preloadError", (event) => {
  try {
    const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY)) || 0;
    if (Date.now() - lastReload < 10_000) {
      return;
    }
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  } catch {
    // Without sessionStorage we can't tell a reload loop apart, so don't
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
