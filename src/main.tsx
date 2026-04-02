import { createRoot } from "react-dom/client";
import { initPlatformTheme } from "./hooks/use-platform-theme";
import App from "./App.tsx";
import "./styles/fonts.css";
import "./index.css";
import "./styles/platform.css";

// Apply theme before first paint to prevent flash
initPlatformTheme();

createRoot(document.getElementById("root")!).render(<App />);
