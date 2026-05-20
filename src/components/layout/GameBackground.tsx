import type { CSSProperties } from "react";

const hubBackgroundModules = import.meta.glob("../../assets/backgrounds/hub-faded-bg.webp", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const hubBackground = Object.values(hubBackgroundModules)[0];

export function GameBackground() {
  return <div className="game-background" style={hubBackground ? ({ "--game-background-image": `url(${hubBackground})` } as CSSProperties) : undefined} aria-hidden="true" />;
}
