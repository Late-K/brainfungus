import Link from "next/link";
import type { ReactNode } from "react";

// title card at the top of sub pages: title and back link, a short description
// and an optional main action, so every sub page starts the same way

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  action?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
}: PageHeaderProps) {
  return (
    <div className="card margin-bottom">
      <div className="section-header">
        <h1 className="heading-small">{title}</h1>
        <Link href={backHref} className="button button-tertiary">
          {backLabel}
        </Link>
      </div>
      {description && (
        <p className="meta-text meta-text-medium">{description}</p>
      )}
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}
