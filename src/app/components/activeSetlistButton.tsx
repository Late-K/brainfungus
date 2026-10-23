"use client";

interface ActiveSetlistButtonProps {
  isInSetlist: boolean;
  isToggling: boolean;
  onToggle: () => void;
}

export default function ActiveSetlistButton({
  isInSetlist,
  isToggling,
  onToggle,
}: ActiveSetlistButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isToggling}
      className={`button button-small ${isInSetlist ? "button-tertiary" : "button-secondary"}`}
      title={
        isInSetlist
          ? "Remove from the active setlist"
          : "Add to the active setlist"
      }
    >
      {isToggling ? "..." : isInSetlist ? "✓ In setlist" : "+ Setlist"}
    </button>
  );
}
