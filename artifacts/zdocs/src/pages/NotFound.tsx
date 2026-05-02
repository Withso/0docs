import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-platform-accent-soft flex items-center justify-center mx-auto mb-6">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">404</h1>
        <p className="text-[15px] text-muted-foreground mb-8">This page doesn't exist or has been moved.</p>
        <Button asChild className="h-11 px-6 rounded-xl">
          <a href="/">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
