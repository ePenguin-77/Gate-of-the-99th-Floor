import { ArrowLeft } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { StatusGroup } from "../components/StatusGroup";
import { classSkills } from "../data/classSkills";
import { classes } from "../data/classes";
import { getAdvancedClass } from "../game/advancedClassSystem";
import { getClassIdentity } from "../game/classIdentity";
import { getItem } from "../game/inventorySystem";
import { divineLabels, statLabels, survivalLabels, traitKindLabels } from "../game/labels";
import { getDominantPaths } from "../game/pathAffinity";
import { traitEvolutions } from "../game/traitEvolution";
import type { Character } from "../types/game";

interface Props {
  character: Character;
  onBack: () => void;
}

export function CharacterScreen({ character, onBack }: Props) {
  const classInfo = classes.find((item) => item.id === character.classId);
  const classIdentity = getClassIdentity(character.classId);
  const advancedClass = getAdvancedClass(character);
  const dominantPaths = getDominantPaths(character, 3);
  const learnedSkills = classSkills.filter((skill) => (character.skills ?? []).includes(skill.id));
  const badStatuses = [
    { key: "hunger" as const, label: survivalLabels.hunger, value: character.survival.hunger },
    { key: "fatigue" as const, label: survivalLabels.fatigue, value: character.survival.fatigue },
    { key: "injury" as const, label: survivalLabels.injury, value: character.survival.injury },
    { key: "sickness" as const, label: survivalLabels.sickness, value: character.survival.sickness },
  ];
  const goodStatuses = [
    { key: "morale" as const, label: survivalLabels.morale, value: character.survival.morale },
    { key: "hope" as const, label: survivalLabels.hope, value: character.survival.hope },
    { key: "faith" as const, label: divineLabels.faith, value: character.divine.faith },
    { key: "independence" as const, label: divineLabels.independence, value: character.divine.independence },
    { key: "dependency" as const, label: divineLabels.dependency, value: character.divine.dependency },
  ];
  const recentMemories = character.memories
    .filter((memory, index, memories) => memories.findIndex((item) => item.title === memory.title) === index)
    .slice(0, 5);
  const visibleProgress = character.traitProgress
    .filter((progress) => progress.currentPath && progress.progress > 0)
    .slice(0, 6);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">ข้อมูลตัวละคร</p>
          <h1 className="mt-1 font-serif text-5xl text-stone-100">{character.name}</h1>
          <p className="mt-2 text-lg text-stone-400">{character.className}</p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} /> กลับเมืองพักพิง
        </Button>
      </header>

      <div className="grid gap-5">
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium tracking-wide text-ember-300">คลาสเริ่มต้น</p>
              <h2 className="font-serif text-2xl text-stone-100">{character.className}</h2>
            </div>
            <div className="border border-white/10 bg-black/20 px-3 py-2 text-sm text-stone-300">
              คลาสขั้นสอง: {advancedClass?.nameTh ?? character.advancedClassName ?? "ยังไม่ก่อตัว"}
            </div>
          </div>
          {advancedClass || character.advancedClassName ? (
            <div className="mb-4 border border-ember-300/25 bg-ember-300/10 p-4">
              <p className="text-sm font-medium tracking-wide text-ember-300">เส้นทางขั้นสูง</p>
              <h3 className="mt-1 font-serif text-2xl text-stone-100">{advancedClass?.nameTh ?? character.advancedClassName}</h3>
              {advancedClass ? (
                <div className="mt-2 grid gap-3">
                  <p className="text-sm leading-7 text-stone-300">{advancedClass.descriptionTh}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-medium tracking-wide text-ember-300">ความสามารถติดตัว</p>
                      <p className="mt-2 text-sm leading-6 text-stone-300">{advancedClass.passiveTh}</p>
                    </div>
                    <div className="border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-medium tracking-wide text-ember-300">ราคาที่ต้องแบก</p>
                      <p className="mt-2 text-sm leading-6 text-stone-300">{advancedClass.drawbackTh ?? "ไม่มีข้อเสียเฉพาะทาง"}</p>
                    </div>
                    <div className="border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-medium tracking-wide text-ember-300">Class Action</p>
                      <p className="mt-2 text-sm leading-6 text-stone-300">{advancedClass.classActionTh}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <p className="mt-3 leading-7 text-stone-300">{classInfo?.description}</p>
          <p className="mt-4 text-sm leading-6 text-stone-400">แนวทางที่ถนัด: {classInfo?.preferredPlaystyle}</p>
          <p className="mt-2 text-sm leading-6 text-ember-300">ความสามารถติดตัว: {classInfo?.passiveEffect}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {character.traits.map((trait) => (
              <div key={trait.id} className="border border-white/10 bg-black/20 p-3">
                <p className="text-stone-100">{trait.name}</p>
                <p className="text-sm text-ember-300">{traitKindLabels[trait.kind]}</p>
                <p className="mt-2 text-sm leading-6 text-stone-400">{trait.description}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-serif text-2xl text-stone-100">ความสามารถของคลาส</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium tracking-wide text-ember-300">ตัวตน</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">{classIdentity.identityTh}</p>
              <p className="mt-3 text-xs leading-6 text-stone-500">แนวทาง: {classIdentity.preferredApproachTh}</p>
            </div>
            <div className="border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium tracking-wide text-ember-300">Passive</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">{classIdentity.classPassiveTh}</p>
            </div>
            <div className="border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium tracking-wide text-ember-300">Class Action</p>
              <h3 className="mt-2 font-serif text-xl text-stone-100">{classIdentity.classAction.nameTh}</h3>
              <p className="mt-2 text-sm leading-7 text-stone-300">{classIdentity.classAction.descriptionTh}</p>
              {classIdentity.classAction.costTh ? <p className="mt-2 text-xs text-ember-200">{classIdentity.classAction.costTh}</p> : null}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium tracking-wide text-ember-300">ความสามารถที่เรียนรู้แล้ว</p>
            {learnedSkills.length === 0 ? (
              <p className="mt-2 text-sm leading-7 text-stone-400">ยังไม่มีทักษะคลาสที่ถูกปลดล็อก ผ่านชั้นที่ 3, 6 และ 10 เพื่อเปิดร่องรอยการเติบโต</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {learnedSkills.map((skill) => (
                  <div key={skill.id} className="border border-ember-300/20 bg-black/20 p-3">
                    <p className="font-serif text-xl text-stone-100">{skill.nameTh}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">{skill.descriptionTh}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-serif text-2xl text-stone-100">ของที่พกขึ้นหอคอย</h2>
          {(character.equippedItems ?? []).length === 0 ? (
            <p className="mt-3 text-sm leading-7 text-stone-400">ยังไม่มีของที่พกขึ้นหอคอย</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(character.equippedItems ?? []).map((itemId) => {
                const item = getItem(itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="border border-ember-300/20 bg-black/20 p-4">
                    <p className="font-serif text-xl text-stone-100">{item.nameTh}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">{item.descriptionTh}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 font-serif text-2xl text-stone-100">ค่าสถานะ</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(character.stats).map(([stat, value]) => (
              <div key={stat} className="border border-white/10 bg-black/20 p-4">
                <p className="text-stone-400">{statLabels[stat as keyof typeof statLabels]}</p>
                <p className="font-serif text-4xl text-ember-300">{value}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-5">
            <StatusGroup title="ภาวะเสี่ยง" description="ค่ายิ่งสูงยิ่งใกล้อันตราย" kind="bad" items={badStatuses} />
          </Panel>
          <Panel className="p-5">
            <StatusGroup title="พลังใจและความสัมพันธ์" description="ค่าสภาพใจและความสัมพันธ์กับเทพ" kind="good" items={goodStatuses} />
          </Panel>
        </div>

        <Panel className="p-5">
          <h2 className="font-serif text-2xl text-stone-100">ร่องรอยในใจ</h2>
          {recentMemories.length === 0 ? (
            <p className="mt-3 text-sm leading-7 text-stone-400">ยังไม่มีความทรงจำใดฝังแน่นพอจะเปลี่ยนเขา</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recentMemories.map((memory) => (
                <div key={memory.id} className="border border-white/10 bg-black/20 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-serif text-xl text-stone-100">{memory.title}</h3>
                    <span className="text-xs text-ember-300">ความเข้ม {memory.intensity}/100</span>
                  </div>
                  <p className="text-sm leading-7 text-stone-400">{memory.description}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <h2 className="font-serif text-2xl text-stone-100">Trait ที่กำลังเปลี่ยนแปลง</h2>
          {visibleProgress.length === 0 ? (
            <p className="mt-3 text-sm leading-7 text-stone-400">นิสัยของเขายังไม่เปลี่ยนทิศชัดเจน</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleProgress.map((progress) => {
                const evolution = traitEvolutions.find((item) => item.id === progress.currentPath);
                const baseTrait = character.traits.find((trait) => trait.id === progress.traitId);
                return (
                  <div key={`${progress.traitId}-${progress.currentPath}`} className="border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 text-sm text-stone-300">
                      {baseTrait?.name ?? "Trait"} → {evolution?.nameTh ?? progress.currentPath}
                    </div>
                    <div className="h-2 border border-white/10 bg-black/50">
                      <div className="h-full bg-ember-300" style={{ width: `${progress.progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-stone-500">{progress.progress}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel className="p-5">
          <h2 className="font-serif text-2xl text-stone-100">ชะตาที่ก่อตัว</h2>
          <p className="mt-2 text-sm leading-7 text-stone-400">
            สิ่งที่ผู้หลงทางทำซ้ำๆ จะค่อยๆ หล่อหลอมเส้นทางในอนาคตของเขา
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {dominantPaths.map((path) => (
              <div key={path.pathId} className="border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-serif text-xl text-stone-100">{path.label}</p>
                  <span className="text-sm text-ember-300">{path.value}</span>
                </div>
                <div className="h-2 border border-white/10 bg-black/50">
                  <div className="h-full bg-ember-300" style={{ width: `${Math.min(100, path.value * 5)}%` }} />
                </div>
                <p className="mt-3 text-xs leading-6 text-stone-500">{path.description}</p>
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </main>
  );
}
