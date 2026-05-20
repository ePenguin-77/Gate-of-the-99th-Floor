import { DoorOpen } from "lucide-react";
import { Button } from "../Button";

interface StickyChallengeBarProps {
  floorNumber: number;
  chance?: number;
  riskLabel?: string;
  isDanger: boolean;
  canChallenge: boolean;
  onChallenge: () => void;
}

export function StickyChallengeBar({ floorNumber, chance, riskLabel, isDanger, canChallenge, onChallenge }: StickyChallengeBarProps) {
  if (!canChallenge) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ember-300/25 bg-black/85 p-3 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex w-[min(100%-1rem,1560px)] items-center gap-3">
        <div className="min-w-0 flex-1 text-xs leading-5 text-stone-300">
          <p className="truncate">ชั้นที่ {floorNumber} | โอกาส {chance ?? 0}% | {riskLabel ?? "ไม่ทราบ"}</p>
        </div>
        <Button variant={isDanger ? "danger" : "primary"} className="min-h-10 rounded-2xl px-4 text-sm" onClick={onChallenge}>
          <DoorOpen size={16} /> ท้าทาย
        </Button>
      </div>
    </div>
  );
}
