interface RadiusSliderProps {
  radiusKm: number;
  onChange: (km: number) => void;
  className?: string;
}

export default function RadiusSlider({ radiusKm, onChange, className = '' }: RadiusSliderProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-500 whitespace-nowrap">Within</span>
      <input
        type="range"
        min={1}
        max={20}
        step={1}
        value={radiusKm}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-600"
      />
      <span className="text-xs font-semibold text-slate-700 whitespace-nowrap w-10 text-right">
        {radiusKm} km
      </span>
    </div>
  );
}
