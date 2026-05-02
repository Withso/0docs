import { ReactNode } from "react";

interface DocNoteProps {
  children: ReactNode;
  type?: "info" | "warning" | "tip";
}

const DocNote = ({ children, type = "info" }: DocNoteProps) => {
  const labels = { info: "Note:", warning: "Warning:", tip: "Tip:" };

  return (
    <div className="doc-note">
      <span className="font-semibold text-foreground">{labels[type]}</span>{" "}
      {children}
    </div>
  );
};

export default DocNote;
