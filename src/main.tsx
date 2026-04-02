import { createRoot } from "react-dom/client";
import { initPlatformTheme } from "./hooks/use-platform-theme";
import App from "./App.tsx";
import "./styles/fonts.css";
import "./styles/platform.css";
import "./index.css";

// Apply theme before first paint to prevent flash
initPlatformTheme();

createRoot(document.getElementById("root")!).render(<App />);
