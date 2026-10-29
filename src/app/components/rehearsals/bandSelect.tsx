"use client";

// band dropdown shared by scheduling a rehearsal and marking a day free. with
// only one band to pick it's used without asking, so nothing is shown

type BandOption = { _id: string; name: string };

// the band to use without asking, if there's only one
export function getOnlyBand<T extends BandOption>(bands: T[]): T | null {
  return bands.length === 1 ? bands[0] : null;
}

interface BandSelectProps {
  bands: BandOption[];
  value: string;
  onChange: (bandId: string) => void;
}

export default function BandSelect({
  bands,
  value,
  onChange,
}: BandSelectProps) {
  if (getOnlyBand(bands)) return null;

  return (
    <div className="form-group">
      <label className="label">Band</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a band</option>
        {bands.map((band) => (
          <option key={band._id} value={band._id}>
            {band.name}
          </option>
        ))}
      </select>
    </div>
  );
}
