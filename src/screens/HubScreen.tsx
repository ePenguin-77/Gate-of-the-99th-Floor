import { Backpack, BookOpen, Dumbbell, HeartPulse, Leaf, Map, Moon, PackagePlus, Search, Settings, Shield, Utensils, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { LastActionResult } from "../components/LastActionResult";
import { MarketPanel } from "../components/MarketPanel";
import { Panel } from "../components/Panel";
import { HubActionCard } from "../components/hub/HubActionCard";
import { HubStatusStrip } from "../components/hub/HubStatusStrip";
import { HubTabs, type HubTabId } from "../components/hub/HubTabs";
import { MissionDeck } from "../components/hub/MissionDeck";
import { StickyChallengeBar } from "../components/hub/StickyChallengeBar";
import { floors } from "../data/floors";
import { getActivityPreview } from "../game/activityEffects";
import { estimateTowerAttempt } from "../game/eventResolver";
import { getUsefulEquippedItemHintsForCharacter } from "../game/inventorySystem";
import { getNpcRelationshipLabel } from "../game/npcSystem";
import { getDominantPaths } from "../game/pathAffinity";
import { getHubRecommendations, type HubRecommendationActionType } from "../game/recommendationSystem";
import { getShopCostForAction, getTowerPressureEffects } from "../game/towerPressure";
import type {
  Character,
  DifficultyMode,
  FloorIntel,
  GameState,
  JournalEntry,
  LastActionResult as LastActionResultType,
  NPC,
  PlayerProfile,
  PreparationBuff,
  ShopActionId,
} from "../types/game";

interface Props {
  character: Character;
  playerProfile: PlayerProfile;
  latestEntry?: JournalEntry;
  journal: JournalEntry[];
  lastActionResult?: LastActionResultType;
  npcLine?: string;
  npcs: NPC[];
  preparationBuff?: PreparationBuff;
  floorIntel?: FloorIntel;
  towerPressure: number;
  totalActionsTaken: number;
  difficultyMode: DifficultyMode;
  divineStrain?: number;
  serviceCostMultipliers?: Partial<Record<ShopActionId, number>>;
  warnings: string[];
  onChallenge: () => void;
  onRevisit: () => void;
  onTrain: () => void;
  onRest: () => void;
  onEatFood: () => void;
  onGather: () => void;
  onInvestigate: () => void;
  onShopAction: (actionId: ShopActionId) => void;
  onUseRecoveryItems: () => void;
  onCharacter: () => void;
  onInventory: () => void;
  onJournal: () => void;
  onNpc: () => void;
  onSettings: () => void;
}

export function HubScreen({
  character,
  playerProfile,
  latestEntry,
  journal,
  lastActionResult,
  npcLine,
  npcs,
  preparationBuff,
  floorIntel,
  towerPressure,
  totalActionsTaken,
  difficultyMode,
  divineStrain = 0,
  serviceCostMultipliers,
  warnings,
  onChallenge,
  onRevisit,
  onTrain,
  onRest,
  onEatFood,
  onGather,
  onInvestigate,
  onShopAction,
  onUseRecoveryItems,
  onCharacter,
  onInventory,
  onJournal,
  onNpc,
  onSettings,
}: Props) {
  const [activeTab, setActiveTab] = useState<HubTabId>("overview");
  const nextFloorNumber = Math.min(20, character.maxFloorCleared + 1);
  const nextFloor = floors.find((floor) => floor.floor === nextFloorNumber);
  const prototypeCleared = character.maxFloorCleared >= 20;
  const inAct2 = nextFloorNumber >= 11 || character.maxFloorCleared >= 10;
  const canChallenge = !prototypeCleared && character.survival.fatigue < 100;
  const canTrain = character.survival.hunger < 100 && character.survival.fatigue < 90;
  const estimate = nextFloor
    ? estimateTowerAttempt(character, nextFloor, "whisper", false, preparationBuff, floorIntel, difficultyMode, divineStrain, towerPressure)
    : undefined;
  const isDanger = (estimate?.chance ?? 100) < 35;
  const usefulItems = useMemo(() => {
    if (!nextFloor) return [];
    return getUsefulEquippedItemHintsForCharacter(character, [nextFloor.challengeType, ...(nextFloor.tags ?? []), `floor-${nextFloor.floor}`]);
  }, [character, nextFloor]);
  const riskAdvice = getRiskAdvice(character, estimate?.chance, floorIntel, usefulItems.length);
  const recommendations = useMemo(() => {
    const recommendationState: GameState = {
      character,
      journal,
      npcs,
      hubEventsSeen: [],
      day: latestEntry?.day ?? 1,
      difficultyMode,
      towerPressure,
      rareEncounterCooldown: 0,
      rareEncountersSeen: [],
      totalActionsTaken,
      lastActionResult,
      preparationBuff,
      floorIntel,
    };

    return getHubRecommendations(recommendationState, {
      estimatedChance: estimate?.chance,
      floorNumber: nextFloorNumber,
      usefulItemCount: usefulItems.length,
      canPrepareGear: character.gold >= getShopCostForAction("prepare-gear", character.maxFloorCleared >= 10 ? 30 : 22, towerPressure, nextFloorNumber),
    });
  }, [
    character,
    difficultyMode,
    estimate?.chance,
    floorIntel,
    journal,
    latestEntry?.day,
    lastActionResult,
    nextFloorNumber,
    npcs,
    preparationBuff,
    totalActionsTaken,
    towerPressure,
    usefulItems.length,
  ]);

  function handleRecommendationAction(actionType: HubRecommendationActionType) {
    if (actionType === "challenge") onChallenge();
    if (actionType === "investigate") onInvestigate();
    if (actionType === "rest") onRest();
    if (actionType === "innRest") onShopAction("inn-rest");
    if (actionType === "eatFood") onEatFood();
    if (actionType === "gather") onGather();
    if (actionType === "prepareGear") onShopAction("prepare-gear");
    if (actionType === "buyFood") onShopAction("buy-food");
    if (actionType === "treatInjury") onShopAction("buy-bandage");
    if (actionType === "treatSickness") onShopAction("buy-medicine");
    if (actionType === "inventory") onInventory();
  }

  return (
    <main className="hub-screen min-h-screen overflow-x-hidden bg-transparent pb-24 text-stone-100 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/65 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-[min(100%-2rem,1560px)] flex-wrap items-center justify-between gap-3">
          <div className="hub-logo min-w-0">
            <p className="hub-logo-title">
              <span>GATE OF THE</span>
              <span>
                99<span className="hub-logo-ordinal">TH</span> FLOOR
              </span>
            </p>
            <p className="hub-logo-subtitle">ประตูแห่งชั้นที่ 99</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Button onClick={onCharacter} className="min-h-9 rounded-xl px-3 py-1.5 text-xs">
              <User size={15} /> ข้อมูลตัวละคร
            </Button>
            <Button onClick={onInventory} className="min-h-9 rounded-xl px-3 py-1.5 text-xs">
              <Backpack size={15} /> กระเป๋า
            </Button>
            <Button onClick={onNpc} className="min-h-9 rounded-xl px-3 py-1.5 text-xs">
              <Users size={15} /> ผู้คนในเมือง
            </Button>
            <Button onClick={onJournal} className="min-h-9 rounded-xl px-3 py-1.5 text-xs">
              <BookOpen size={15} /> บันทึก
            </Button>
            <Button onClick={onSettings} className="min-h-9 rounded-xl px-3 py-1.5 text-xs">
              <Settings size={15} /> ตั้งค่า
            </Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid w-[min(100%-2rem,1560px)] gap-5 py-5 sm:w-[min(100%-3rem,1560px)]">
        {warnings.length > 0 ? <WarningStrip warnings={warnings} /> : null}
        {playerProfile.lifeDebtMarks > 0 ? (
          <Panel className="rounded-2xl border-red-400/30 bg-red-950/15 p-4 text-sm leading-7 text-red-100">
            เงาของผู้สูญหายยังติดตามเทพอยู่ ผู้หลงทางคนใหม่จึงเริ่มต้นด้วยความหวังและศรัทธาที่สั่นคลอนเล็กน้อย
          </Panel>
        ) : null}

        <MissionDeck
          character={character}
          floor={nextFloor}
          estimate={estimate}
          towerPressure={towerPressure}
          canChallenge={canChallenge}
          prototypeCleared={prototypeCleared}
          floorIntel={floorIntel}
          recommendations={recommendations}
          onRecommendationAction={handleRecommendationAction}
          onChallenge={onChallenge}
          onInvestigate={onInvestigate}
          onPrepareGear={() => onShopAction("prepare-gear")}
          onRevisit={onRevisit}
        />

        {inAct2 ? (
          <Panel className="rounded-2xl border-amber-300/20 bg-amber-950/10 p-4 text-sm leading-7 text-stone-300">
            <p className="font-serif text-xl text-amber-200">เมืองร้างเหนือประตูแรก</p>
            <p className="mt-1">เมืองพักพิงยังอยู่เบื้องล่าง แต่หลังประตูแรก หอคอยเริ่มมีเมืองของมันเอง</p>
          </Panel>
        ) : null}

        <HubStatusStrip character={character} playerProfile={playerProfile} riskAdvice={riskAdvice} onCharacter={onCharacter} />

        <HubTabs activeTab={activeTab} onChange={setActiveTab} />

        <section className="min-h-[22rem] rounded-2xl border border-white/10 bg-black/20 p-4 shadow-xl shadow-black/20 sm:p-5">
          {activeTab === "overview" ? (
            <OverviewTab latestEntry={latestEntry} lastActionResult={lastActionResult} npcLine={npcLine} warnings={warnings} floorIntel={floorIntel} usefulItems={usefulItems} towerPressure={towerPressure} />
          ) : null}
          {activeTab === "prepare" ? (
            <PrepareTab character={character} floorIntel={floorIntel} usefulItems={usefulItems} onInvestigate={onInvestigate} onRevisit={onRevisit} onInventory={onInventory} onPrepareGear={() => onShopAction("prepare-gear")} />
          ) : null}
          {activeTab === "recover" ? (
            <RecoverTab character={character} onRest={onRest} onEatFood={onEatFood} onGather={onGather} onUseRecoveryItems={onUseRecoveryItems} onShopAction={onShopAction} />
          ) : null}
          {activeTab === "develop" ? (
            <DevelopTab character={character} canTrain={canTrain} onTrain={onTrain} onTrainer={() => onShopAction("trainer")} />
          ) : null}
          {activeTab === "market" ? (
            <MarketTab character={character} towerPressure={towerPressure} serviceCostMultipliers={serviceCostMultipliers} onShopAction={onShopAction} />
          ) : null}
          {activeTab === "city" ? (
            <CityTab npcs={npcs} npcLine={npcLine} towerPressure={towerPressure} onNpc={onNpc} />
          ) : null}
          {activeTab === "journal" ? <JournalTab journal={journal} character={character} onJournal={onJournal} /> : null}
        </section>
      </div>

      <StickyChallengeBar
        floorNumber={nextFloorNumber}
        chance={estimate?.chance}
        riskLabel={estimate?.riskLabel}
        isDanger={isDanger}
        canChallenge={canChallenge}
        onChallenge={onChallenge}
      />
    </main>
  );
}

function OverviewTab({
  latestEntry,
  lastActionResult,
  npcLine,
  warnings,
  floorIntel,
  usefulItems,
  towerPressure,
}: {
  latestEntry?: JournalEntry;
  lastActionResult?: LastActionResultType;
  npcLine?: string;
  warnings: string[];
  floorIntel?: FloorIntel;
  usefulItems: string[];
  towerPressure: number;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="grid gap-4">
        <LastActionResult result={lastActionResult} />
        {!lastActionResult ? <EmptyCard title="ผลจากกิจกรรมล่าสุด" text="ยังไม่มีกิจกรรมล่าสุดให้สรุป" /> : null}
      </div>
      <div className="grid gap-4">
        <InfoCard title="บันทึกล่าสุด" heading={latestEntry?.title ?? "ยังไม่มีบันทึก"} text={latestEntry?.text ?? "หน้ากระดาษยังว่างเปล่า แต่หมึกกำลังรออยู่"} />
        <InfoCard title="เมืองพักพิงวันนี้" heading="แอชเบลใต้ประตู" text={npcLine ?? getPressureFlavor(towerPressure)} />
        <ChecklistCard
          title="สิ่งที่ควรระวัง"
          items={[
            ...warnings.slice(0, 3),
            floorIntel ? "ข้อมูลชั้นถัดไปจะหมดผลหลังการขึ้นหอคอยครั้งต่อไป" : "ชั้นถัดไปยังไม่มีข้อมูลยืนยัน",
            usefulItems.length ? "มีอุปกรณ์บางชิ้นที่อาจช่วยชั้นนี้ได้" : "ไม่มีอุปกรณ์ที่เหมาะกับชั้นนี้",
          ].slice(0, 4)}
        />
      </div>
    </div>
  );
}

function PrepareTab({
  character,
  floorIntel,
  usefulItems,
  onInvestigate,
  onPrepareGear,
  onRevisit,
  onInventory,
}: {
  character: Character;
  floorIntel?: FloorIntel;
  usefulItems: string[];
  onInvestigate: () => void;
  onPrepareGear: () => void;
  onRevisit: () => void;
  onInventory: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <TabPanel title="การเตรียมตัว">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <HubActionCard icon={<Search size={17} />} label="สืบข่าวชั้นถัดไป" preview="อาจได้ข้อมูลช่วยผ่านชั้นต่อไป / เสี่ยงข่าวปลอมหรือถูกหลอก" cost="ใช้เวลาและเพิ่มความหิว/เหนื่อยเล็กน้อย" onClick={onInvestigate} />
          <HubActionCard icon={<PackagePlus size={17} />} label="เตรียมอุปกรณ์ขึ้นหอคอย" preview="ลดความเสี่ยงบาดเจ็บ / ใช้ทอง" cost="มีผลกับการขึ้นหอคอยครั้งถัดไป" onClick={onPrepareGear} />
          <HubActionCard icon={<Map size={17} />} label="กลับไปยังชั้นก่อนหน้า" preview={getActivityPreview("revisit")} cost="ปลอดภัยกว่า แต่ยังใช้แรงและเวลา" onClick={onRevisit} disabled={character.maxFloorCleared < 1} />
          <HubActionCard icon={<Backpack size={17} />} label="จัดของที่พกขึ้นหอคอย" preview="เลือกไอเทมที่ใช้ได้ระหว่างเหตุการณ์" cost="ช่องพกจำกัด 3 ชิ้น" onClick={onInventory} />
        </div>
      </TabPanel>
      <div className="grid gap-4">
        <InfoCard title="ข้อมูลชั้นถัดไป" heading={getIntelHeading(floorIntel)} text={getIntelDescription(floorIntel)} />
        <ChecklistCard title="ของที่อาจช่วยชั้นนี้" items={usefulItems.length ? usefulItems : ["ไม่มีอุปกรณ์ที่เหมาะกับชั้นนี้"]} />
      </div>
    </div>
  );
}

function RecoverTab({
  character,
  onRest,
  onEatFood,
  onGather,
  onUseRecoveryItems,
  onShopAction,
}: {
  character: Character;
  onRest: () => void;
  onEatFood: () => void;
  onGather: () => void;
  onUseRecoveryItems: () => void;
  onShopAction: (actionId: ShopActionId) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <TabPanel title="สภาพที่ต้องดูแล">
        <div className="grid gap-3 sm:grid-cols-2">
          <ConditionChip label="ความหิว" value={character.survival.hunger} kind="bad" />
          <ConditionChip label="ความเหนื่อยล้า" value={character.survival.fatigue} kind="bad" />
          <ConditionChip label="อาการบาดเจ็บ" value={character.survival.injury} kind="bad" />
          <ConditionChip label="อาการป่วย" value={character.survival.sickness} kind="bad" />
        </div>
        <ChecklistCard
          title="คำเตือน"
          items={[
            character.food <= 1 ? "อาหารเหลือน้อย การพักโดยไม่มีอาหารอาจทำให้ร่างกายแย่ลง" : "ยังมีอาหารพอประคองร่างกาย",
            character.survival.injury >= 60 ? "อาการบาดเจ็บเริ่มน่าเป็นห่วง" : "บาดแผลยังไม่ใช่ภัยหลักในตอนนี้",
            character.survival.sickness >= 60 ? "อาการป่วยอาจแย่ลงหากปล่อยไว้" : "อาการป่วยยังพอควบคุมได้",
          ]}
        />
      </TabPanel>
      <TabPanel title="การฟื้นตัวและเสบียง">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <HubActionCard icon={<Moon size={17} />} label="พักผ่อน" preview={getActivityPreview("rest")} cost="ฟรี แต่ฟื้นตัวได้น้อยกว่าโรงเตี๊ยม" onClick={onRest} />
          <HubActionCard icon={<Utensils size={17} />} label="กินอาหาร" preview={getActivityPreview("eat")} cost="ใช้อาหารหนึ่งส่วน แต่ไม่เพิ่มความกดดัน" onClick={onEatFood} />
          <HubActionCard icon={<HeartPulse size={17} />} label="พักโรงเตี๊ยม" preview="ฟื้นความเหนื่อยล้ามาก / ใช้ทอง / หอคอยกดดัน +1" cost="บริการในเมืองพักพิง" onClick={() => onShopAction("inn-rest")} />
          <HubActionCard icon={<Leaf size={17} />} label="ออกหาเสบียง" preview={getActivityPreview("gather")} cost="เสี่ยงบาดเจ็บหรือป่วยเมื่อสภาพแย่" onClick={onGather} />
          <HubActionCard icon={<PackagePlus size={17} />} label="ซื้ออาหาร" preview="อาหาร +1 / ใช้ทอง" onClick={() => onShopAction("buy-food")} />
          <HubActionCard icon={<Shield size={17} />} label="ซื้อผ้าพันแผล" preview="ลดอาการบาดเจ็บเล็กน้อย / ใช้ทอง" onClick={() => onShopAction("buy-bandage")} />
          <HubActionCard icon={<HeartPulse size={17} />} label="ซื้อยา" preview="ลดอาการป่วยเล็กน้อย / ใช้ทอง" onClick={() => onShopAction("buy-medicine")} />
          <HubActionCard icon={<Backpack size={17} />} label="ใช้ไอเทมฟื้นตัว" preview="เปิดกระเป๋าเพื่อใช้ของที่มีอยู่" cost="เหมาะเมื่อไม่อยากเสียเวลาเพิ่ม" onClick={onUseRecoveryItems} />
        </div>
      </TabPanel>
    </div>
  );
}

function DevelopTab({ character, canTrain, onTrain, onTrainer }: { character: Character; canTrain: boolean; onTrain: () => void; onTrainer: () => void }) {
  const stats = Object.entries(character.stats).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const paths = getDominantPaths(character, 3);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <TabPanel title="การฝึก">
        <div className="grid gap-3 md:grid-cols-2">
          <HubActionCard icon={<Dumbbell size={17} />} label="ฝึกฝน" preview={getActivityPreview("train")} cost="ความหิวและความเหนื่อยล้าเพิ่มขึ้น" onClick={onTrain} disabled={!canTrain} />
          <HubActionCard icon={<Dumbbell size={17} />} label="ฝึกกับครูฝึก" preview="ค่าสถานะสุ่ม +1 / ใช้ทอง / หิวและเหนื่อยเพิ่มเล็กน้อย" cost="มั่นคงกว่า แต่มีค่าใช้จ่าย" onClick={onTrainer} />
        </div>
      </TabPanel>
      <div className="grid gap-4">
        <TabPanel title="ค่าสถานะที่เด่น">
          <div className="grid gap-2 sm:grid-cols-2">
            {stats.map(([key, value]) => (
              <ResourceLikeChip key={key} label={statNameTh(key)} value={value} />
            ))}
          </div>
        </TabPanel>
        <TabPanel title="ชะตาที่ก่อตัว">
          <div className="grid gap-2">
            {paths.map((path) => (
              <div key={path.pathId} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-stone-100">{path.label}</span>
                  <span className="text-ember-200">{path.value}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-stone-500">{path.description}</p>
              </div>
            ))}
          </div>
        </TabPanel>
        <InfoCard
          title="ความสามารถของคลาส"
          heading={character.advancedClassName ? `${character.className} / ${character.advancedClassName}` : character.className}
          text={character.skills.length ? `ทักษะที่เรียนรู้แล้ว: ${character.skills.length} รายการ` : "ยังไม่มีทักษะที่ปลดล็อกจากชั้นสำคัญ"}
        />
      </div>
    </div>
  );
}

function MarketTab({
  character,
  towerPressure,
  serviceCostMultipliers,
  onShopAction,
}: {
  character: Character;
  towerPressure: number;
  serviceCostMultipliers?: Partial<Record<ShopActionId, number>>;
  onShopAction: (actionId: ShopActionId) => void;
}) {
  const priceMultiplier = getTowerPressureEffects(towerPressure).shopPriceMultiplier;
  return (
    <div className="grid gap-4">
      {priceMultiplier > 1 ? (
        <Panel className="rounded-2xl border-orange-300/25 bg-orange-950/15 p-4 text-sm leading-6 text-orange-100">
          ราคาสูงขึ้นเพราะความกดดันของหอคอย
        </Panel>
      ) : null}
      <MarketPanel gold={character.gold} towerPressure={towerPressure} currentFloor={Math.min(20, character.maxFloorCleared + 1)} classId={character.classId} serviceCostMultipliers={serviceCostMultipliers} onBuy={onShopAction} />
    </div>
  );
}

function CityTab({ npcs, npcLine, towerPressure, onNpc }: { npcs: NPC[]; npcLine?: string; towerPressure: number; onNpc: () => void }) {
  const pressureEffects = getTowerPressureEffects(towerPressure);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <TabPanel title="ผู้คนในเมืองพักพิง">
        <div className="grid gap-3 md:grid-cols-2">
          {npcs.slice(0, 6).map((npc) => (
            <div key={npc.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-xl text-stone-100">{npc.nameTh}</h3>
                  <p className="mt-1 text-sm text-ember-200">{npc.roleTh}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-300">{npc.status === "available" ? "อยู่ในเมือง" : npc.status === "locked" ? "ยังไม่พบ" : npc.status}</span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-400">{npc.descriptionTh}</p>
              <p className="mt-3 text-xs text-stone-500">ความสัมพันธ์: {getNpcRelationshipLabel(npc.relationship)}</p>
            </div>
          ))}
        </div>
        <Button onClick={onNpc} className="mt-4 rounded-xl">
          เปิดหน้าผู้คนในเมืองพักพิง
        </Button>
      </TabPanel>
      <div className="grid gap-4">
        <InfoCard title="เหตุการณ์เมือง" heading="เสียงจากเมืองพักพิง" text={npcLine ?? "ผู้คนในเมืองเงียบกว่าปกติ ราวกับทุกคนรอฟังว่าหอคอยจะเรียกใครต่อไป"} />
        <ChecklistCard
          title="ความกดดันของหอคอย"
          items={[
            `ค่าปัจจุบัน ${towerPressure}/20`,
            `โอกาสผ่านชั้นถัดไป ${pressureEffects.successChancePenalty}%`,
            `ความเสี่ยงจากการสืบข่าว +${pressureEffects.badIntelChanceBonus}%`,
            `ราคาตลาด x${pressureEffects.shopPriceMultiplier}`,
          ]}
        />
      </div>
    </div>
  );
}

function JournalTab({ journal, character, onJournal }: { journal: JournalEntry[]; character: Character; onJournal: () => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <TabPanel title="บันทึกการเดินทาง">
        <div className="grid gap-3">
          {journal.slice(-8).reverse().map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-ember-300">วันที่ {entry.day}{entry.floor ? ` / ชั้น ${entry.floor}` : ""}</p>
              <h3 className="mt-1 font-serif text-xl text-stone-100">{entry.title}</h3>
              <p className="mt-2 max-w-[860px] text-sm leading-7 text-stone-400">{entry.text}</p>
            </article>
          ))}
          {journal.length === 0 ? <p className="text-sm text-stone-500">ยังไม่มีบันทึก</p> : null}
        </div>
        <Button onClick={onJournal} className="mt-4 rounded-xl">
          เปิดบันทึกแบบเต็ม
        </Button>
      </TabPanel>
      <TabPanel title="ร่องรอยในใจ">
        <div className="grid gap-3">
          {character.memories.slice(-5).reverse().map((memory) => (
            <article key={memory.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-ember-300">{memory.type} / ความเข้ม {memory.intensity}</p>
              <h3 className="mt-1 font-serif text-xl text-stone-100">{memory.title}</h3>
              <p className="mt-2 text-sm leading-7 text-stone-400">{memory.description}</p>
            </article>
          ))}
          {character.memories.length === 0 ? <p className="text-sm text-stone-500">ยังไม่มีความทรงจำสำคัญที่ก่อตัวชัดเจน</p> : null}
        </div>
      </TabPanel>
    </div>
  );
}

function WarningStrip({ warnings }: { warnings: string[] }) {
  return (
    <Panel className="rounded-2xl border-orange-400/35 bg-orange-950/20 p-4">
      <p className="text-sm font-semibold text-orange-100">คำเตือนจากเมืองพักพิง</p>
      <div className="mt-2 grid gap-1 text-sm leading-6 text-orange-100/90 md:grid-cols-2">
        {warnings.slice(0, 4).map((warning) => (
          <p key={warning}>- {warning}</p>
        ))}
      </div>
    </Panel>
  );
}

function TabPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="rounded-2xl border-white/10 bg-black/30 p-5">
      <h2 className="font-serif text-xl text-stone-100 sm:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

function InfoCard({ title, heading, text }: { title: string; heading: string; text: string }) {
  return (
    <Panel className="rounded-2xl border-white/10 bg-black/30 p-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-ember-300">{title}</p>
      <h3 className="mt-2 font-serif text-xl text-stone-100">{heading}</h3>
      <p className="mt-2 max-w-[860px] text-sm leading-7 text-stone-400">{text}</p>
    </Panel>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <Panel className="rounded-2xl border-white/10 bg-black/30 p-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-ember-300">{title}</p>
      <p className="mt-2 text-sm leading-7 text-stone-500">{text}</p>
    </Panel>
  );
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel className="rounded-2xl border-white/10 bg-black/30 p-5">
      <p className="text-sm font-semibold text-stone-100">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-400">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </Panel>
  );
}

function ConditionChip({ label, value, kind }: { label: string; value: number; kind: "bad" | "good" }) {
  const color = kind === "bad" ? (value >= 70 ? "text-orange-200" : "text-emerald-200") : value >= 50 ? "text-cyan-200" : "text-orange-200";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-stone-400">{label}</span>
        <span className={`font-semibold ${color}`}>{value}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${kind === "bad" ? (value >= 70 ? "bg-orange-400" : "bg-emerald-300") : value >= 50 ? "bg-cyan-300" : "bg-orange-300"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ResourceLikeChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-2xl text-ember-200">{value}</p>
    </div>
  );
}

function getRiskAdvice(character: Character, chance = 0, floorIntel?: FloorIntel, usefulItemCount = 0) {
  const worst = Math.max(character.survival.hunger, character.survival.fatigue, character.survival.injury, character.survival.sickness);
  if (chance < 35) return "โอกาสรอดต่ำ ควรพัก รักษาอาการ หรือเตรียมข้อมูลก่อนขึ้นหอคอย";
  if (worst >= 70) return "สภาพร่างกายเริ่มอันตราย ควรฟื้นตัวก่อนฝืนเดินหน้า";
  if (!floorIntel) return "ยังไม่มีข้อมูลชั้นถัดไป การสืบข่าวอาจช่วยลดความไม่แน่นอน";
  if (usefulItemCount === 0) return "ลองจัดกระเป๋าเพื่อพกอุปกรณ์ที่เหมาะกับชั้นถัดไป";
  return "สามารถท้าทายชั้นถัดไปได้ แต่หอคอยไม่เคยปล่อยให้ใครผ่านฟรี";
}

function getIntelHeading(intel?: FloorIntel) {
  if (!intel) return "ยังไม่มีข้อมูลยืนยัน";
  if (intel.isFalse) return "ข้อมูลที่ได้มา";
  if (intel.reliability === "trusted") return "ข้อมูลน่าเชื่อถือ";
  if (intel.reliability === "partial") return "ข้อมูลบางส่วน";
  if (intel.reliability === "rumor") return "ข่าวลือคลุมเครือ";
  return intel.titleTh;
}

function getIntelDescription(intel?: FloorIntel) {
  if (!intel) return "ยังไม่มีใครเล่าเรื่องชั้นถัดไปได้ชัดเจน หอคอยยังเก็บคำตอบไว้หลังประตู";
  if (intel.isFalse) return "ข้อมูลนี้ฟังดูมีเหตุผล แต่ยังไม่มีใครยืนยันได้ว่ามันจริงหรือไม่";
  return intel.descriptionTh;
}

function getPressureFlavor(towerPressure: number) {
  if (towerPressure >= 13) return "หอคอยตื่นตัว ผู้คนในเมืองเริ่มพูดน้อยลง และราคาทุกอย่างเหมือนมีเงาแฝงอยู่";
  if (towerPressure >= 8) return "ข่าวลือเริ่มบิดเบี้ยว ทางขึ้นหอคอยดูไกลกว่าที่เคย";
  if (towerPressure >= 4) return "บรรยากาศรอบเมืองหนักขึ้น ราวกับหอคอยรับรู้ถึงความลังเล";
  return "เมืองพักพิงยังเงียบงัน แต่ความเงียบนั้นไม่เคยปลอดภัยจริง";
}

function statNameTh(key: string) {
  const labels: Record<string, string> = {
    strength: "พละกำลัง",
    agility: "ความคล่องตัว",
    endurance: "ความอดทน",
    focus: "สมาธิ",
    willpower: "จิตใจ",
    instinct: "สัญชาตญาณ",
  };
  return labels[key] ?? key;
}
