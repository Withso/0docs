import { createRoot } from "react-dom/client";
import { initPlatformTheme } from "./hooks/use-platform-theme";
import { loadRuntimeConfig } from "./app/runtime-config";
import App from "./App.tsx";
import "./index.css";

// Apply theme before first paint to prevent flash
initPlatformTheme();

loadRuntimeConfig().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
