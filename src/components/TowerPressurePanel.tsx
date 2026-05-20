import { getPressureWarningLines, getTowerPressureLevel } from "../game/towerPressure";

interface TowerPressurePanelProps {
  towerPressure: number;
}

export function TowerPressurePanel({ towerPressure }: TowerPressurePanelProps) {
  const level = getTowerPressureLevel(towerPressure);
  const warnings = getPressureWarningLines(towerPressure);

  return (
    <section className="border border-violet-300/20 bg-violet-950/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium tracking-wide text-violet-200">ความกดดันของหอคอย</p>
        <span className="border border-violet-300/25 px-2 py-1 text-xs text-violet-100">
          {towerPressure}/20 — {level.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-300">{level.description}</p>
      <div className="mt-3 grid gap-1 text-xs leading-5 text-stone-400">
        <p className="text-violet-200">ผลตอนนี้:</p>
        {warnings.map((warning) => (
          <p key={warning}>- {warning}</p>
        ))}
      </div>
    </section>
  );
}
