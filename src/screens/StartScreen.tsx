import { RotateCcw, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";

interface StartScreenProps {
  canContinue: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onReset: () => void;
}

const titleGateModules = import.meta.glob("../assets/backgrounds/title-gate.webp", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;
const titleGateBg = Object.values(titleGateModules)[0];

export function StartScreen({ canContinue, onNewGame, onContinue, onReset }: StartScreenProps) {
  return (
    <main className="start-screen">
      <section
        className="title-hero"
        style={titleGateBg ? ({ "--title-gate-bg": `url(${titleGateBg})` } as CSSProperties) : undefined}
        aria-labelledby="game-title"
      >
        <div className="title-overlay" />
        <div className="title-fog title-fog-a" aria-hidden="true" />
        <div className="title-fog title-fog-b" aria-hidden="true" />

        <div className="title-content">
          <div className="title-copy">
            <div className="title-logo-block">
              <p className="title-kicker">ต้นแบบเกมสวมบทบาทเอาตัวรอดเชิงเล่าเรื่อง</p>
              <h1 id="game-title" className="game-title">
                <span>GATE OF THE</span>
                <span>
                  99<span className="ordinal-suffix">TH</span> FLOOR
                </span>
              </h1>
              <div className="title-divider" aria-hidden="true" />
              <p className="title-subtitle">ประตูแห่งชั้นที่ 99</p>
            </div>
            <p className="title-description">
              มนุษย์คนหนึ่งติดอยู่ในโลกของเกม และต้องปีนหอคอย 99 ชั้นเพื่อกลับบ้าน
              <br />
              คุณไม่ใช่เจ้าของเขา คุณคือเสียงที่เฝ้ามองจากเบื้องบน
              <br />
              จะชี้ทาง เตือนภัย มอบพร หรือเงียบงันก็ได้
            </p>
          </div>

          <aside className="start-menu-card" aria-label="เมนูเริ่มเกม">
            <div className="start-menu-heading">
              <Sparkles size={18} />
              <div>
                <h2>{canContinue ? "เมืองพักพิงใต้ประตูยังรออยู่" : "ยังไม่มีผู้หลงทางภายใต้การดูแลของเทพ"}</h2>
                <p>{canContinue ? "กลับไปฟังเสียงของหอคอย และพาผู้หลงทางเดินต่อ" : "สร้างผู้หลงทาง แล้วเริ่มต้นสิบชั้นแรกของหอคอย"}</p>
              </div>
            </div>

            <div className="start-menu-actions">
              <button className="start-button start-button-primary" data-audio-id="ui_confirm" onClick={onNewGame}>
                เริ่มเกมใหม่
              </button>
              <button className="start-button start-button-secondary" data-audio-id="ui_confirm" onClick={onContinue} disabled={!canContinue}>
                {canContinue ? "เล่นต่อ" : "ยังไม่มีเซฟให้เล่นต่อ"}
              </button>
              <button className="start-button start-button-danger" data-audio-id="ui_warning" onClick={onReset} disabled={!canContinue}>
                <RotateCcw size={16} /> ลบเซฟ
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
