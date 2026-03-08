import { ReactNode } from "react";
import DocSidebar from "./DocSidebar";
import DocMobileNav from "./DocMobileNav";

interface DocLayoutProps {
  children: ReactNode;
}

const DocLayout = ({ children }: DocLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[980px] mx-auto flex px-6">
        <DocSidebar />
        <main className="flex-1 min-w-0 py-10 lg:pl-4">
          <DocMobileNav />
          <article className="max-w-[680px]">
            {children}
          </article>
        </main>
      </div>
    </div>
  );
};

export default DocLayout;
