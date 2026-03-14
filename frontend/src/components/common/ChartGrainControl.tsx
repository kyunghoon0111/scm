import { timeGrainLabel } from "../../lib/timeGrain";
import type { TimeGrain } from "../../store/filterStore";

interface ChartGrainControlProps {
  value: TimeGrain;
  onChange: (value: TimeGrain) => void;
}

const OPTIONS: TimeGrain[] = ["day", "week", "month", "year"];

export default function ChartGrainControl({ value, onChange }: ChartGrainControlProps) {
  return (
    <div className="inline-flex rounded-full border border-black/10 bg-white p-1 shadow-sm">
      {OPTIONS.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === option ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          {timeGrainLabel(option)}
        </button>
      ))}
    </div>
  );
}
