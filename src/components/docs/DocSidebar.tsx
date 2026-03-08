import { useLocation, Link } from "react-router-dom";

type NavItem = {
  title: string;
  path: string;
  children?: { title: string; path: string }[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Introduction", path: "/" },
      { title: "Getting Started", path: "/getting-started" },
      {
        title: "Installation",
        path: "/installation",
      },
      { title: "Configuration", path: "/configuration" },
      { title: "Architecture", path: "/architecture" },
    ],
  },
  {
    label: "Guides",
    items: [
      {
        title: "Components",
        path: "/components",
        children: [
          { title: "Buttons", path: "/components/buttons" },
          { title: "Cards", path: "/components/cards" },
          { title: "Forms", path: "/components/forms" },
        ],
      },
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
    <aside className="w-[220px] shrink-0 sticky top-0 h-screen overflow-y-auto py-10 pr-8 hidden lg:block">
      <Link to="/" className="text-foreground font-semibold text-sm mb-8 block">
        /agentation
      </Link>

      {navigation.map((group) => (
        <div key={group.label}>
          <div className="doc-sidebar-group-label">{group.label}</div>
          <nav className="space-y-0.5">
            {group.items.map((item) => (
              <div key={item.path}>
                <Link
                  to={item.path}
                  className={`doc-sidebar-link ${
                    isActive(item.path) ? "active" : ""
                  }`}
                >
                  {item.title}
                  {item.title === "Architecture" && (
                    <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-doc-section/20 text-doc-section">
                      v1.0
                    </span>
                  )}
                </Link>
                {item.children && isParentActive(item) && (
                  <div className="mt-0.5 mb-1 ml-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`doc-sidebar-sub-link ${
                          isActive(child.path) ? "active" : ""
                        }`}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      ))}

      <div className="mt-8 text-xs text-muted-foreground">
        v2.3.0{" "}
        <a href="https://github.com" className="hover:text-foreground ml-1">
          ↗
        </a>
      </div>
    </aside>
  );
};

export default DocSidebar;
