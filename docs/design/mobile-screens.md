# Mobile UI & Wireframe Specifications: Birthday Tanks!

> Committed wireframe and design specification for Allan Lusk's 70th Birthday edition.
> Primary target: Portrait Mobile Browser (480x854 logical resolution, 9:16 aspect ratio).

---

## 1. Splash Screen (`SplashScene`)

```
+---------------------------------------+
|                                       |
|               🎂                      |
|         [ANIMATED CAKE]               |
|                                       |
|       HAPPY 70th BIRTHDAY,            |
|              ALLAN!                   |
|                                       |
|   From Cody, Amy, Jenn & Kelsey       |
|            — and Carrie               |
|                                       |
|                                       |
|        +---------------------+        |
|        |     TAP TO PLAY     |        |
|        +---------------------+        |
|                                       |
|     (Unlocks Audio & Launches L1)     |
|                                       |
+---------------------------------------+
```

- **Background**: Sunny warm celebratory palette with drifting confetti particles.
- **Title**: Large festive golden text "HAPPY 70th BIRTHDAY, ALLAN!".
- **Call to Action**: High-contrast button (≥48px height) that unlocks Web Audio context on tap.

---

## 2. Level Card Interstitial (`LevelCardScene`)

```
+---------------------------------------+
|                                       |
|                                       |
|            WORLD 1 / DECADE 1         |
|             THE EARLY YEARS           |
|                                       |
|                 ★ 1956 ★              |
|                                       |
|               YEAR ONE:               |
|            ALLAN IS BORN!             |
|                                       |
|                                       |
|          [Auto-advances 2.0s]         |
|                                       |
+---------------------------------------+
```

- **Duration**: 2.0 seconds with smooth alpha fade-in/out.
- **Typography**: Prominent milestone year and personalized event name.

---

## 3. Game Tactical Arena & Touch HUD (`GameScene` + `HUDScene`)

```
+---------------------------------------+
| HUD: 🏍️ 🏍️ 🏍️    L3/70: 1958    💣: 2  |
|---------------------------------------|
| [#][#][#][#][#][#][#][#][#][#][#][#]  |
| [#]       [=]             🕯️      [#]  |
| [#]  🏍️   [=]             [=]    [#]  |
| [#]       [=]             [=]    [#]  |
| [#]                :::           [#]  |
| [#]                :::           [#]  |
| [#]        [#][#]         [=]    [#]  |
| [#]   🕯️   [#][#]         [=]    [#]  |
| [#]                               [#]  |
| [#][#][#][#][#][#][#][#][#][#][#][#]  |
|---------------------------------------|
|          TOUCH CONTROL ZONE           |
|                                       |
|    ( O )                     [💣]     |
|  [JOYSTICK]                           |
|  (Move Tank)                 ( • )    |
|                             [AIM/FIRE]|
+---------------------------------------+
```

- **Top HUD**: 3 motorcycle life icons, current milestone name (`L3/70: 1958`), active mine count.
- **Arena**: Top-down 16x24 grid arena.
  - `[#]`: Indestructible stone/brick wall (reflects bullets).
  - `[=]`: Destructible gift box / wooden crate.
  - `:::`: Hazard zone (water / hole).
  - `🏍️`: Allan's motorcycle tank (independent body rotation & front headlight aim turret).
  - `🕯️` / enemies: Candles, golf ball tanks, puck tanks, etc.
- **Touch Zone (Bottom 25% of viewport)**:
  - Left: Virtual floating joystick for driving.
  - Right: Aim/Fire touch trackpad and dedicated [Mine] button (≥48x48px hitboxes).

---

## 4. Game Over Screen (`GameOverScene`)

```
+---------------------------------------+
|                                       |
|                 🛠️                    |
|           [PIT STOP ICON]             |
|                                       |
|             GAME OVER                 |
|                                       |
|       Allan's motorcycle tank         |
|         needs a pit stop!             |
|                                       |
|        Wave Reached: 14 / 70          |
|        Tanks Defeated: 28             |
|                                       |
|        +---------------------+        |
|        |      TRY AGAIN      |        |
|        +---------------------+        |
|                                       |
+---------------------------------------+
```

---

## 5. Victory Screen (`VictoryScene`)

```
+---------------------------------------+
|  🎉  🎊   ✨   🎉   🎊   ✨   🎉  |
|                                       |
|             70 LEVELS.                |
|              70 YEARS.                |
|         STILL GOING STRONG.           |
|                                       |
|          HAPPY BIRTHDAY,              |
|              DAD! ❤️                  |
|                                       |
|        From Cody, Amy, Jenn,          |
|         Kelsey & Carrie               |
|                                       |
|        +---------------------+        |
|        |     PLAY AGAIN      |        |
|        +---------------------+        |
|                                       |
+---------------------------------------+
```

- **Effects**: Full-screen canvas confetti particle emitter.
- **Tone**: Heartfelt celebratory celebration.

---

## 6. Level Select Screen (`LevelSelectScene`)

```
+---------------------------------------+
|  [< BACK]          LEVEL SELECT       |
|  Completed: 12 / 70                   |
|---------------------------------------|
|  [L1: 1956 - Year One: Allan is Born] |
|  [L2: 1957 - First Steps & Toddler]   |
|  [L3: 1958 - Trike Racer in Training] |
|  ...                                  |
|  [L12: 1967 - Canada Centennial]      |
|  [L13: 1968 - ???? (LOCKED)]          |
|  [L14: 1969 - ???? (LOCKED)]          |
|---------------------------------------|
|  [Scrollable list/grid of 70 levels]  |
+---------------------------------------+
```

- **Scroll/Drag**: Smooth touch and mouse wheel/drag vertical scrolling across all 70 levels.
- **Status Indication**: Beaten levels show milestone titles with gold/green accents; unbeaten show `????` with dim lock styling.
- **Action**: Tapping any beaten or current unlocked level starts gameplay immediately from that level.

---

## 7. Star Wars Credits Screen (`CreditsScene`)

```
+---------------------------------------+
|  [< BACK]                             |
|                                       |
|             .    *        .     *     |
|               *      .      *         |
|                                       |
|               /                     \ |
|              /   HAPPY 70th BIRTHDAY \ |
|             /       ALLAN LUSK!       \|
|            /                           \|
|           /  Executive Producer: Cody   \|
|          /   Lead Developer: Cody        \|
|         /    QA & Playtesting: Cody       \|
|        /     Special Thanks: Carrie Orr... \|
|       /                                     \|
|                                       |
|         [Drag up/down to scrub crawl] |
+---------------------------------------+
```

- **Perspective**: Classic Star Wars style perspective crawl or vertical marquee rolling through space starfield.
- **Interactivity**: User can drag up/down to scrub through the credits roll; releasing resumes auto-scrolling.
- **Content**: Dedicated to Allan Lusk, attributing humorous AAA studio roles to Cody and thanking open source libraries and family.

