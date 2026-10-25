// one settings row: label and hint on the left, on/off switch on the right

export default function SettingToggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  compact = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <label
      className={`setting-row ${compact ? "setting-row-compact" : ""} ${disabled ? "setting-row-disabled" : ""}`}
    >
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}
