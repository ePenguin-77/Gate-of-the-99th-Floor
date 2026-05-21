import { AlertTriangle, HeartPulse, Leaf, Search, Shield, Sparkles } from "lucide-react";
import type { HubRecommendation, HubRecommendationActionType, HubRecommendationCategory, HubRecommendationTone } from "../../game/recommendationSystem";

interface RecommendationPanelProps {
  recommendations: HubRecommendation[];
  onAction?: (actionType: HubRecommendationActionType) => void;
}

const toneStyles: Record<HubRecommendationTone, { card: string; icon: string; label: string }> = {
  safe: {
    card: "border-emerald-300/20 bg-emerald-300/[0.06]",
    icon: "text-emerald-200",
    label: "text-emerald-100",
  },
  warning: {
    card: "border-amber-300/25 bg-amber-300/[0.07]",
    icon: "text-amber-200",
    label: "text-amber-100",
  },
  danger: {
    card: "border-red-300/25 bg-red-300/[0.06]",
    icon: "text-red-200",
    label: "text-red-100",
  },
  growth: {
    card: "border-sky-300/20 bg-sky-300/[0.055]",
    icon: "text-sky-200",
    label: "text-sky-100",
  },
  resource: {
    card: "border-amber-200/20 bg-stone-300/[0.05]",
    icon: "text-amber-100",
    label: "text-stone-100",
  },
};

const categoryLabels: Record<HubRecommendationCategory, string> = {
  recommended: "แนะนำ",
  caution: "ควรระวัง",
  notRecommended: "ไม่แนะนำตอนนี้",
};

const actionLabels: Record<HubRecommendationActionType, string> = {
  challenge: "ท้าทาย",
  investigate: "สืบข่าว",
  rest: "พักผ่อน",
  innRest: "พักโรงเตี๊ยม",
  eatFood: "กินอาหาร",
  gather: "หาเสบียง",
  prepareGear: "เตรียมอุปกรณ์",
  buyFood: "ซื้ออาหาร",
  treatInjury: "รักษาบาดแผล",
  treatSickness: "รักษาอาการป่วย",
  inventory: "เปิดกระเป๋า",
};

const categoryOrder: HubRecommendationCategory[] = ["recommended", "caution", "notRecommended"];
const categoryLimits: Record<HubRecommendationCategory, number> = {
  recommended: 2,
  caution: 2,
  notRecommended: 1,
};

export function RecommendationPanel({ recommendations, onAction }: RecommendationPanelProps) {
  if (recommendations.length === 0) return null;

  return (
    <section className="relative rounded-2xl border border-amber-300/20 bg-black/25 p-4 shadow-lg shadow-black/15">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-ember-200" />
        <h2 className="text-sm font-semibold tracking-wide text-ember-100">คำแนะนำก่อนขึ้นหอคอย</h2>
      </div>
      <p className="mt-2 max-w-3xl text-xs leading-6 text-stone-400">
        ระบบนี้ประเมินจากสภาพปัจจุบันของผู้หลงทาง บางทางเลือกช่วยเพิ่มโอกาสรอด แต่บางทางเลือกอาจมีราคาที่ต้องจ่าย
      </p>

      <div className="mt-4 grid gap-4">
        {categoryOrder.map((category) => {
          const items = recommendations.filter((item) => item.category === category).slice(0, categoryLimits[category]);
          if (items.length === 0) return null;
          return (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-stone-400">{categoryLabels[category]}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((recommendation) => (
                  <RecommendationCard key={recommendation.id} recommendation={recommendation} onAction={onAction} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecommendationCard({ recommendation, onAction }: { recommendation: HubRecommendation; onAction?: (actionType: HubRecommendationActionType) => void }) {
  const tone = toneStyles[recommendation.tone];
  const actionTypes = getActionTypes(recommendation);
  return (
    <article className={`rounded-2xl border p-3 ${tone.card}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${tone.icon}`}>{getToneIcon(recommendation.tone)}</span>
        <div className="min-w-0">
          <h3 className={`text-sm font-semibold leading-6 ${tone.label}`}>{recommendation.titleTh}</h3>
          <p className="mt-1 text-xs leading-6 text-stone-300">{recommendation.descriptionTh}</p>
          {recommendation.chanceDelta !== undefined ? (
            <p className={`mt-2 text-xs font-semibold ${recommendation.chanceDelta > 0 ? "text-emerald-200" : recommendation.chanceDelta < 0 ? "text-orange-200" : "text-stone-300"}`}>
              ผลต่อโอกาสผ่านโดยประมาณ: {formatChanceDelta(recommendation.chanceDelta)}
              {recommendation.estimatedChanceBefore !== undefined && recommendation.estimatedChanceAfter !== undefined
                ? ` (${recommendation.estimatedChanceBefore}% → ${recommendation.estimatedChanceAfter}%)`
                : ""}
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-stone-500">เหตุผล: {recommendation.reasonTh}</p>
          {recommendation.riskTh ? <p className="mt-1 text-xs leading-5 text-stone-500">ความเสี่ยง: {recommendation.riskTh}</p> : null}
          {onAction && actionTypes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {actionTypes.slice(0, 3).map((actionType) => (
                <button
                  key={actionType}
                  type="button"
                  onClick={() => onAction(actionType)}
                  className="rounded-full border border-ember-300/25 bg-ember-300/10 px-3 py-1.5 text-xs font-semibold text-ember-100 transition hover:border-ember-200/50 hover:bg-ember-300/15"
                  data-audio-id={actionType === "challenge" ? "ui_confirm" : "ui_click"}
                >
                  {actionLabels[actionType]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function getActionTypes(recommendation: HubRecommendation): HubRecommendationActionType[] {
  const actionTypes = recommendation.actionTypes ?? (recommendation.actionType ? [recommendation.actionType] : []);
  return Array.from(new Set(actionTypes));
}

function getToneIcon(tone: HubRecommendationTone) {
  if (tone === "safe") return <Shield size={16} />;
  if (tone === "danger") return <AlertTriangle size={16} />;
  if (tone === "growth") return <Search size={16} />;
  if (tone === "resource") return <Leaf size={16} />;
  return <HeartPulse size={16} />;
}

function formatChanceDelta(delta: number) {
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return "คงที่";
}
