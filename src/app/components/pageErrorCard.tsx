import Link from "next/link";

interface PageErrorCardProps {
  error: string;
  backHref: string;
  backLabel?: string;
}

export default function PageErrorCard({
  error,
  backHref,
  backLabel = "Back to Home",
}: PageErrorCardProps) {
  return (
    <div className="page-container">
      <div className="card">
        <p className="alert alert-error">{error}</p>
        <Link href={backHref} className="button button-tertiary">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
