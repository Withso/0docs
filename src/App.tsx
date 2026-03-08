import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import GettingStarted from "./pages/GettingStarted";
import Installation from "./pages/Installation";
import Configuration from "./pages/Configuration";
import Architecture from "./pages/Architecture";
import Components from "./pages/Components";
import Theming from "./pages/Theming";
import ApiReference from "./pages/ApiReference";
import Changelog from "./pages/Changelog";
import Examples from "./pages/Examples";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/getting-started" element={<GettingStarted />} />
          <Route path="/installation" element={<Installation />} />
          <Route path="/configuration" element={<Configuration />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/components" element={<Components />} />
          <Route path="/components/*" element={<Components />} />
          <Route path="/theming" element={<Theming />} />
          <Route path="/api" element={<ApiReference />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
