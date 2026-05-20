import { TowerFocusCard, type TowerFocusCardProps } from "./TowerFocusCard";

export function MissionDeck(props: TowerFocusCardProps) {
  return <TowerFocusCard {...props} showPreparationActions={false} />;
}
