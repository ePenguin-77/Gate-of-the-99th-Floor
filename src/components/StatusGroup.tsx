import { StatusBar } from "./StatusBar";
import type { DivineRelationshipKey, SurvivalKey } from "../types/game";

interface StatusItem {
  key: SurvivalKey | DivineRelationshipKey;
  label: string;
  value: number;
}

interface StatusGroupProps {
  title: string;
  description?: string;
  kind: "bad" | "good";
  items: StatusItem[];
}

export function StatusGroup({ title, description, kind, items }: StatusGroupProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-serif text-2xl text-stone-100">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-stone-400">{description}</p> : null}
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <StatusBar key={item.key} statusKey={item.key} label={item.label} value={item.value} kind={kind} />
        ))}
      </div>
    </section>
  );
}
