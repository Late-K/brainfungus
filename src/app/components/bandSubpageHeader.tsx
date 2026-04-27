import Link from "next/link";

interface BandSubpageHeaderProps {
  title: string;
  description: string;
  bandId: string | null;
}

export default function BandSubpageHeader({
  title,
  description,
  bandId,
}: BandSubpageHeaderProps) {
  return (
    <div className="card margin-bottom">
      <div className="section-header">
        <h1 className="heading-small">{title}</h1>
        <Link
          href={bandId ? `/bands/${bandId}` : "#"}
          className="button button-tertiary"
        >
          Back to Band
        </Link>
      </div>
      <p className="meta-text meta-text-medium">{description}</p>
    </div>
  );
}
