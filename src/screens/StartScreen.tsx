import { RotateCcw, Sparkles } from "lucide-react";

interface StartScreenProps {
  canContinue: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onReset: () => void;
}

export function StartScreen({ canContinue, onNewGame, onContinue, onReset }: StartScreenProps) {
  return (
    <main className="start-screen">
      <section className="title-hero" aria-labelledby="game-title">
        <div className="title-overlay" />
        <div className="tower-silhouette" aria-hidden="true">
          <span className="tower-spire" />
          <span className="tower-body" />
          <span className="tower-gate" />
        </div>
        <div className="title-fog title-fog-a" aria-hidden="true" />
        <div className="title-fog title-fog-b" aria-hidden="true" />

        <div className="title-content">
          <div className="title-copy">
            <p className="title-kicker">ต้นแบบเกมสวมบทบาทเอาตัวรอดเชิงเล่าเรื่อง</p>
            <h1 id="game-title" className="title-main">
              Gate of the 99th Floor
            </h1>
            <p className="title-subtitle">ประตูแห่งชั้นที่ 99</p>
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
              <button className="start-button start-button-primary" onClick={onNewGame}>
                เริ่มเกมใหม่
              </button>
              <button className="start-button start-button-secondary" onClick={onContinue} disabled={!canContinue}>
                {canContinue ? "เล่นต่อ" : "ยังไม่มีเซฟให้เล่นต่อ"}
              </button>
              <button className="start-button start-button-danger" onClick={onReset} disabled={!canContinue}>
                <RotateCcw size={16} /> ลบเซฟ
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
