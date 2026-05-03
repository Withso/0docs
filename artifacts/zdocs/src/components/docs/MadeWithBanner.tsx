import { Link } from "react-router-dom";

const MadeWithBanner = () => {
  return (
    <div
      className="w-full mt-12"
      style={{
        borderTop: "1px solid hsl(var(--border))",
        backgroundColor: "hsl(var(--background))",
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-5 flex items-center justify-center sm:justify-end">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] transition-colors"
          style={{
            color: "hsl(var(--muted-foreground))",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--foreground))")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
        >
          Made with <span className="font-semibold">0docs</span>
        </Link>
      </div>
    </div>
  );
};

export default MadeWithBanner;
