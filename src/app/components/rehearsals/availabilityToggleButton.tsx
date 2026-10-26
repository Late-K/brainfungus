"use client";

interface AvailabilityToggleButtonProps {
  available: boolean;
  onClick: () => void;
}

export default function AvailabilityToggleButton({
  available,
  onClick,
}: AvailabilityToggleButtonProps) {
  return (
    <button
      className={`availability-toggle ${
        available
          ? "availability-toggle-available"
          : "availability-toggle-unavailable"
      }`}
      onClick={onClick}
    >
      {available ? "✓ Available" : "✗ Unavailable"}
    </button>
  );
}
