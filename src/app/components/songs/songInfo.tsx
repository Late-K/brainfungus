import { ReactNode } from "react";

interface SongInfoProps {
  image?: string;
  imageAlt: string;
  title: ReactNode;
  meta?: ReactNode;
  extra?: ReactNode;
  containerClassName?: string;
  titleClassName?: string;
  metaClassName?: string;
  extraClassName?: string;
  titleAs?: "span" | "h3";
  metaAs?: "span" | "p";
  extraAs?: "span" | "p";
}

export default function SongInfo({
  image,
  imageAlt,
  title,
  meta,
  extra,
  containerClassName = "song-body",
  titleClassName = "item-title",
  metaClassName = "meta-text meta-text-small block",
  extraClassName = "meta-text meta-text-small block",
  titleAs = "span",
  metaAs = "span",
  extraAs = "span",
}: SongInfoProps) {
  const TitleTag = titleAs;
  const MetaTag = metaAs;
  const ExtraTag = extraAs;

  return (
    <>
      {image && <img src={image} alt={imageAlt} className="song-thumbnail" />}
      <div className={containerClassName}>
        <TitleTag className={titleClassName}>{title}</TitleTag>
        {meta ? <MetaTag className={metaClassName}>{meta}</MetaTag> : null}
        {extra ? <ExtraTag className={extraClassName}>{extra}</ExtraTag> : null}
      </div>
    </>
  );
}
