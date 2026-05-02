import { Link } from "react-router-dom";

const MadeWithBanner = () => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:scale-105"
        style={{
          backgroundColor: "hsl(var(--foreground) / 0.85)",
          color: "hsl(var(--background))",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px hsl(var(--foreground) / 0.15)",
        }}
      >
        Made with <span className="font-semibold">0docs</span>
      </Link>
    </div>
  );
};

export default MadeWithBanner;
