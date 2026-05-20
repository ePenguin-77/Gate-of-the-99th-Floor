# Design Notes

## สรุปภาษาไทย

Gate of the 99th Floor / ประตูแห่งชั้นที่ 99 คือเกมสวมบทบาทเอาตัวรอดเชิงเล่าเรื่อง ผู้เล่นไม่ได้ควบคุมผู้หลงทางโดยตรง แต่ทำหน้าที่เหมือนเทพองค์เล็กที่คอยกระซิบ เตือน มอบพร หรือเลือกเงียบ ปัจจุบันต้นแบบครอบคลุมการสร้างตัวละคร เมืองพักพิง ระบบค่าสถานะ ระบบความสัมพันธ์กับเทพ บันทึกการเดินทาง และหอคอยชั้นที่ 1-10 พร้อมผู้เฝ้าประตูแรก

## Concept

Gate of the 99th Floor is a narrative survival RPG about a human trapped in a game-like tower. The player is a god-like observer rather than a direct controller. The central tension is care without control: the player can influence the climber through Divine Actions, but the character remains autonomous and emotionally affected by each attempt.

## MVP Scope

This first prototype covers:

- Character generation
- A central hub town as the main menu
- Survival values and divine relationship values
- Four Divine Actions: Whisper, Omen, Blessing, Silence
- Data-driven floor events for Floors 1-10
- Floor resolution with stats, traits, class bonuses, survival pressure, and Divine Action modifiers
- Narrative journal logging
- localStorage save and continue flow

## Core Systems

### Character System

The climber has six stats: Strength, Agility, Endurance, Focus, Willpower, and Instinct. Survival is tracked through Hunger, Fatigue, Morale, Hope, and Injury. The divine relationship tracks Faith, Independence, and Dependency.

### Class System

Eight starting classes provide stat modifiers, preferred playstyles, and passive flavor hooks. The current resolver includes early class bonuses, while future versions can turn each passive into a richer rules module.

### Trait System

Traits are positive, negative, or double-edged. They modify stats and survival values at creation and can affect event resolution when their tags match floor themes.

### Tower Floor System

Floors are data definitions with challenge type, narrative setup, required checks, rewards, outcomes, and journal text. This keeps content expansion separate from resolver code.

### Divine Action System

Divine Actions change both immediate resolution chances and long-term relationship values:

- Whisper improves decision chances and can increase dependency.
- Omen improves danger awareness but can hurt morale.
- Blessing grants the strongest boost while increasing faith and dependency.
- Silence is risky but can build independence.

### Save System

The current save boundary is the serializable game state only. No renderer or UI state is saved. Saves are stored in localStorage under a versioned key.

## Future Expansion Ideas

- Add autonomous character decisions that can accept, misread, or reject Divine Actions.
- Expand floor outcomes into branching event chains.
- Add NPC relationships in the hub and tower.
- Add inventory, wounds, conditions, and temporary blessings.
- Add floor replay memories and trauma triggers.
- Build Floors 11-99 in themed arcs with Gatekeeper bosses.
- Add multiple endings based on faith, independence, dependency, hope, and moral history.
- Add a codex of discovered tower rules and character beliefs.
