import { ReactNode } from "react";

interface DocSectionProps {
  title: string;
  children: ReactNode;
  id?: string;
}

const DocSection = ({ title, children, id }: DocSectionProps) => {
  return (
    <section className="mb-10" id={id}>
      <h2 className="doc-heading text-lg mb-4">{title}</h2>
      <div className="doc-prose">{children}</div>
    </section>
  );
};

export default DocSection;
