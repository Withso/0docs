import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const links = [
  { title: "Introduction", path: "/" },
  { title: "Getting Started", path: "/getting-started" },
  { title: "Installation", path: "/installation" },
  { title: "Configuration", path: "/configuration" },
  { title: "Architecture", path: "/architecture" },
  { title: "Components", path: "/components" },
  { title: "Theming", path: "/theming" },
  { title: "API Reference", path: "/api" },
  { title: "Changelog", path: "/changelog" },
  { title: "Examples", path: "/examples" },
  { title: "FAQ", path: "/faq" },
];

const DocMobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="lg:hidden mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        Menu
      </button>
      {open && (
        <nav className="mt-3 space-y-1 border-l pl-4">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setOpen(false)}
              className={`doc-sidebar-link ${
                location.pathname === link.path ? "active" : ""
              }`}
            >
              {link.title}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
};

export default DocMobileNav;
