"use client";

type ColumnOption = number | { type: "auto"; minColumnWidth: number };

interface ControlsProps {
  columns: ColumnOption;
  onColumnsChange: (val: ColumnOption) => void;
  gap: number;
  onGapChange: (val: number) => void;
}

export function Controls({
  columns,
  onColumnsChange,
  gap,
  onGapChange,
}: ControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Columns
        </span>
        <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900/50 p-0.5">
          {["auto", "2", "3", "4", "5"].map((val) => {
            const isActive =
              val === "auto"
                ? typeof columns !== "number"
                : typeof columns === "number" && String(columns) === val;
            return (
              <button
                key={val}
                onClick={() => {
                  if (val === "auto") {
                    onColumnsChange({ type: "auto", minColumnWidth: 280 });
                  } else {
                    onColumnsChange(Number(val));
                  }
                }}
                className={`rounded-[5px] px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {val === "auto" ? "Auto" : val}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Gap
        </span>
        <input
          type="range"
          min={0}
          max={32}
          value={gap}
          onChange={(e) => onGapChange(Number(e.target.value))}
          className="w-20 accent-zinc-100"
        />
        <span className="w-7 text-right text-xs tabular-nums text-zinc-500">
          {gap}px
        </span>
      </div>
    </div>
  );
}
