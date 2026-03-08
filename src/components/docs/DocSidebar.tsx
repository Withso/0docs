import { useLocation, Link } from "react-router-dom";

type NavItem = {
  title: string;
  path: string;
  badge?: string;
  children?: { title: string; path: string }[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    items: [
      { title: "Overview", path: "/" },
      { title: "Getting Started", path: "/getting-started" },
      { title: "Installation", path: "/installation" },
      {
        title: "Features",
        path: "/components",
        children: [
          { title: "Buttons", path: "/components/buttons" },
          { title: "Cards", path: "/components/cards" },
          { title: "Forms", path: "/components/forms" },
        ],
      },
      { title: "Configuration", path: "/configuration" },
      { title: "Architecture", path: "/architecture", badge: "v1.0" },
    ],
  },
  {
    label: "Guides",
    items: [
      { title: "Theming", path: "/theming" },
      { title: "API Reference", path: "/api" },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Changelog", path: "/changelog" },
      { title: "Examples", path: "/examples" },
      { title: "FAQ", path: "/faq" },
    ],
  },
];

const DocSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isParentActive = (item: NavItem) =>
    isActive(item.path) || item.children?.some((c) => isActive(c.path));

  return (
    <aside className="w-[220px] shrink-0 sticky top-0 h-screen overflow-y-auto py-8 pr-8 hidden lg:block">
      {/* Brand */}
      <Link to="/" className="text-foreground font-semibold text-[15px] mb-8 block">
        /agentation
      </Link>

      <nav className="space-y-6">
        {navigation.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block py-1 text-[13px] transition-colors ${
                      isActive(item.path) || (item.children && isParentActive(item) && !item.children.some(c => isActive(c.path)))
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.title}
                    {item.badge && (
                      <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-platform-accent/10 text-platform-accent">
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Nested children with left border */}
                  {item.children && isParentActive(item) && (
                    <ul className="mt-0.5 mb-1 ml-0.5 border-l border-border">
                      {item.children.map((child) => (
                        <li key={child.path}>
                          <Link
                            to={child.path}
                            className={`block py-1 pl-3.5 text-[13px] transition-colors relative ${
                              isActive(child.path)
                                ? "text-foreground font-semibold before:absolute before:left-[-1px] before:top-1 before:bottom-1 before:w-[2px] before:bg-foreground before:rounded-full"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Version footer */}
      <div className="mt-10 text-[12px] text-muted-foreground/50 flex items-center gap-1.5">
        <span className="underline underline-offset-2">v2.3.0</span>
        <span>·</span>
        <a href="https://github.com" className="hover:text-foreground transition-colors" aria-label="GitHub">
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
    </aside>
  );
};

export default DocSidebar;
