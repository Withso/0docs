import { Link } from "react-router-dom";

interface DocCalloutLinkProps {
  to: string;
  children: React.ReactNode;
  external?: boolean;
}

const DocCalloutLink = ({ to, children, external }: DocCalloutLinkProps) => {
  const classes =
    "block py-2 text-sm text-doc-link hover:underline transition-colors";

  if (external) {
    return (
      <a href={to} className={classes} target="_blank" rel="noopener noreferrer">
        {children} →
      </a>
    );
  }

  return (
    <Link to={to} className={classes}>
      {children} →
    </Link>
  );
};

export default DocCalloutLink;
