import "../src/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// ✅ Register service worker for PWA
// import { registerSW } from "virtual:pwa-register";

// const updateSW = registerSW({
//   immediate: true,
//   onNeedRefresh() {
//     if (confirm("New version available. Reload?")) {
//       updateSW(true);
//     }
//   },
//   onOfflineReady() {
//     console.log("App is ready to work offline");
//   },
// });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
