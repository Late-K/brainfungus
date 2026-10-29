"use client";

// how many songs a picker (or one of its albums) holds
export function pickerCountLabel(total: number) {
  return `${total} song${total !== 1 ? "s" : ""}`;
}

function PickerCount({ total }: { total: number }) {
  return <span className="picker-count">{pickerCountLabel(total)}</span>;
}

// the title of a song picker - a dropdown toggle where the pickers are
// collapsible, a plain heading otherwise
export default function PickerHeader({
  title,
  total,
  collapsible,
  isOpen,
  onToggle,
}: {
  title: string;
  total: number;
  collapsible: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!collapsible) {
    return (
      <div className="picker-heading">
        <h3 className="picker-title">{title}</h3>
        <PickerCount total={total} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="picker-trigger"
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      <span className={`accordion-icon ${isOpen ? "accordion-icon-open" : ""}`}>
        &#9654;
      </span>
      <span className="picker-title">{title}</span>
      <PickerCount total={total} />
    </button>
  );
}

// closes an open collapsible picker from the bottom of its list
export function PickerShowLess({
  collapsible,
  isOpen,
  onCollapse,
}: {
  collapsible: boolean;
  isOpen: boolean;
  onCollapse: () => void;
}) {
  if (!collapsible || !isOpen) return null;

  return (
    <button
      type="button"
      className="picker-show-less"
      onClick={(e) => {
        // keep the picker's header on screen once the list above it is gone
        const picker = e.currentTarget.closest(".picker");
        onCollapse();
        requestAnimationFrame(() =>
          picker?.scrollIntoView({ block: "nearest" }),
        );
      }}
    >
      Show less <span aria-hidden="true">&#9650;</span>
    </button>
  );
}
