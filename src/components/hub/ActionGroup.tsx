import type { ReactNode } from "react";
import { Panel } from "../Panel";

interface ActionGroupProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function ActionGroup({ title, description, children }: ActionGroupProps) {
  return (
    <Panel className="rounded-2xl border-white/10 bg-black/30 p-5 shadow-xl shadow-black/20">
      <div>
        <h2 className="font-serif text-xl text-stone-100 sm:text-2xl">{title}</h2>
        <p className="mt-1 max-w-[720px] text-sm leading-6 text-stone-500">{description}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </Panel>
  );
}
