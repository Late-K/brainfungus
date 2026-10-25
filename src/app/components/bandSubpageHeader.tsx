import type { ReactNode } from "react";
import PageHeader from "@/app/components/pageHeader";

interface BandSubpageHeaderProps {
  title: string;
  description: string;
  bandId: string | null;
  action?: ReactNode;
}

export default function BandSubpageHeader({
  title,
  description,
  bandId,
  action,
}: BandSubpageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      backHref={bandId ? `/bands/${bandId}` : "#"}
      backLabel="Back to Band"
      action={action}
    />
  );
}
