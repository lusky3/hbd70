# tests/e2e_verification.py
# End-to-end Playwright headless verification for Birthday Tanks!

import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def run_e2e():
    port = 8092
    server = subprocess.Popen([sys.executable, "-m", "http.server", str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)

    errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path="/usr/bin/google-chrome",
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"]
            )
            page = browser.new_page(viewport={"width": 480, "height": 854})

            page.on("pageerror", lambda err: errors.append(f"PAGE_ERROR: {err}"))
            page.on("console", lambda msg: errors.append(f"CONSOLE_ERROR: {msg.text}") if msg.type == "error" else None)

            # 1. Navigate
            page.goto(f"http://localhost:{port}/", wait_until="networkidle")
            assert "Birthday Tanks" in page.title(), f"Unexpected title: {page.title()}"

            # 2. Canvas presence
            canvas = page.wait_for_selector("#game-container canvas", timeout=5000)
            assert canvas is not None, "Canvas must be mounted"

            # 3. Wait for game initialization
            page.wait_for_function("() => window.game && window.game.isBooted", timeout=5000)

            # 4. Advance from Splash to LevelCard to GameScene
            page.evaluate("""() => {
                const splash = window.game.scene.getScene('Splash');
                if (splash && splash.scene.isActive()) {
                    splash.scene.start('LevelCard', { levelNum: 1, lives: 3, tanksDefeated: 0 });
                }
            }""")
            time.sleep(0.5)

            page.evaluate("""() => {
                const levelCard = window.game.scene.getScene('LevelCard');
                if (levelCard && levelCard.scene.isActive()) {
                    levelCard.scene.start('Game', { levelNum: 1, lives: 3, tanksDefeated: 0 });
                }
            }""")
            time.sleep(1.0)

            # 5. Check Game & HUD scenes
            eval_result = page.evaluate("""() => {
                const game = window.game;
                const gameScene = game.scene.getScene('Game');
                const hudScene = game.scene.getScene('HUD');
                
                if (!gameScene || !gameScene.scene.isActive()) {
                    return { error: 'GameScene not active' };
                }
                if (!hudScene || !hudScene.scene.isActive()) {
                    return { error: 'HUDScene not active' };
                }

                const player = gameScene.player;
                const enemyCount = gameScene.enemies ? gameScene.enemies.getChildren().length : 0;
                const lives = gameScene.lives;
                const levelNum = gameScene.levelData ? gameScene.levelData.levelNum : null;

                return {
                    gameActive: true,
                    hudActive: true,
                    hasPlayer: !!player,
                    enemyCount,
                    lives,
                    levelNum,
                    muteText: hudScene.muteBtn ? hudScene.muteBtn.text : null
                };
            }""")

            assert "error" not in eval_result, f"Game state check failed: {eval_result}"
            assert eval_result["gameActive"], "Game scene must be active"
            assert eval_result["hasPlayer"], "Player tank must be instantiated"
            assert eval_result["enemyCount"] >= 1, f"Expected enemies, got {eval_result['enemyCount']}"
            assert eval_result["lives"] == 3, f"Expected 3 lives, got {eval_result['lives']}"
            assert eval_result["levelNum"] == 1, f"Expected Level 1, got {eval_result['levelNum']}"

            # 6. Verify Audio BGM & Mute Button Toggle
            audio_state_1 = page.evaluate("""() => {
                const hudScene = window.game.scene.getScene('HUD');
                // Click mute button
                hudScene.muteBtn.emit('pointerdown');
                return {
                    muteText: hudScene.muteBtn.text
                };
            }""")
            assert audio_state_1["muteText"] == "🔇", f"Expected muted icon 🔇, got {audio_state_1['muteText']}"

            audio_state_2 = page.evaluate("""() => {
                const hudScene = window.game.scene.getScene('HUD');
                // Click unmute
                hudScene.muteBtn.emit('pointerdown');
                return {
                    muteText: hudScene.muteBtn.text
                };
            }""")
            assert audio_state_2["muteText"] == "🔊", f"Expected unmuted icon 🔊, got {audio_state_2['muteText']}"

            # 7. Verify Forward-Locked Aim & Tap-to-Aim Unlock in Gameplay
            control_state = page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                const controls = gameScene.controls;
                const initialLocked = !controls.isAimUnlocked;

                // Simulate arena tap at (200, 300) [y <= 615]
                gameScene.input.emit('pointerdown', { id: 1, x: 200, y: 300 });
                const unlockedAfterTap = controls.isAimUnlocked;

                // Simulate arena release
                gameScene.input.emit('pointerup', { id: 1, x: 200, y: 300 });
                const lockedAfterRelease = !controls.isAimUnlocked;

                return {
                    initialLocked,
                    unlockedAfterTap,
                    lockedAfterRelease
                };
            }""")
            assert control_state["initialLocked"], "Aim should be forward-locked by default"
            assert control_state["unlockedAfterTap"], "Aim should unlock upon arena tap"
            assert control_state["lockedAfterRelease"], "Aim should re-lock upon touch release"

            # 8. Verify Level 10 Decade Climax Boss (The Mega Candle) & Untruncated HUD
            page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                gameScene.scene.start('Game', { levelNum: 10, lives: 3, tanksDefeated: 15 });
            }""")
            time.sleep(1.0)

            boss_10_eval = page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                const hudScene = window.game.scene.getScene('HUD');

                const enemies = gameScene.enemies.getChildren();
                const boss = enemies.find(e => e.type === 'boss_candle');

                return {
                    levelNum: gameScene.levelNum,
                    isBossLevel: gameScene.levelData.isBossLevel,
                    bossType: gameScene.levelData.bossType,
                    bossFound: !!boss,
                    bossHp: boss ? boss.hp : null,
                    hasHealthBar: boss ? !!boss.healthBar : false,
                    hudTitle: hudScene.subText ? hudScene.subText.text : '',
                    hasEllipsis: hudScene.subText ? hudScene.subText.text.includes('...') : false
                };
            }""")

            assert boss_10_eval["levelNum"] == 10, f"Expected level 10, got {boss_10_eval['levelNum']}"
            assert boss_10_eval["isBossLevel"], "Level 10 must be marked as isBossLevel"
            assert boss_10_eval["bossType"] == "boss_candle", f"Expected boss_candle, got {boss_10_eval['bossType']}"
            assert boss_10_eval["bossFound"], "Level 10 must spawn boss_candle"
            assert boss_10_eval["bossHp"] == 3, f"Level 10 boss must have 3 HP, got {boss_10_eval['bossHp']}"
            assert boss_10_eval["hasHealthBar"], "Level 10 boss must have an attached health bar"
            assert not boss_10_eval["hasEllipsis"], f"HUD title must not be truncated with ellipsis: {boss_10_eval['hudTitle']}"

            # 9. Verify Level 70 Grand Champion Climax Boss (The 70!)
            page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                gameScene.scene.start('Game', { levelNum: 70, lives: 3, tanksDefeated: 100 });
            }""")
            time.sleep(1.0)

            boss_70_eval = page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                const hudScene = window.game.scene.getScene('HUD');

                const enemies = gameScene.enemies.getChildren();
                const boss = enemies.find(e => e.type === 'boss');

                return {
                    levelNum: gameScene.levelNum,
                    isBossLevel: gameScene.levelData.isBossLevel,
                    bossType: gameScene.levelData.bossType,
                    bossFound: !!boss,
                    bossHp: boss ? boss.hp : null,
                    hasHealthBar: boss ? !!boss.healthBar : false,
                    hudTitle: hudScene.subText ? hudScene.subText.text : '',
                    hasEllipsis: hudScene.subText ? hudScene.subText.text.includes('...') : false
                };
            }""")

            assert boss_70_eval["levelNum"] == 70, f"Expected level 70, got {boss_70_eval['levelNum']}"
            assert boss_70_eval["isBossLevel"], "Level 70 must be marked as isBossLevel"
            assert boss_70_eval["bossFound"], "Level 70 must spawn boss"
            assert boss_70_eval["bossHp"] == 8, f"Level 70 boss must have 8 HP, got {boss_70_eval['bossHp']}"
            assert boss_70_eval["hasHealthBar"], "Level 70 boss must have an attached health bar"
            assert not boss_70_eval["hasEllipsis"], f"HUD title must not be truncated with ellipsis: {boss_70_eval['hudTitle']}"

            # 10. Verify Turret Anchoring & Velocity Stop When Level Clears
            page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                gameScene.scene.start('Game', { levelNum: 1, lives: 3, tanksDefeated: 0 });
            }""")
            time.sleep(1.0)

            clear_state = page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                const player = gameScene.player;

                // Simulate moving player at 100 velocity
                player.setVelocity(100, 50);

                // Defeat all enemies to trigger level clearing
                gameScene.enemies.getChildren().forEach(e => e.destroyTank());
                gameScene.checkLevelComplete();

                return {
                    isLevelClearing: gameScene.isLevelClearing
                };
            }""")
            time.sleep(0.4)

            settled_state = page.evaluate("""() => {
                const gameScene = window.game.scene.getScene('Game');
                const player = gameScene.player;
                const turret = player ? player.turret : null;

                const vx = player ? player.body.velocity.x : null;
                const vy = player ? player.body.velocity.y : null;
                const turretMatches = player && turret ? (Math.abs(turret.x - player.x) < 0.1 && Math.abs(turret.y - player.y) < 0.1) : false;

                return {
                    vx,
                    vy,
                    turretMatches,
                    playerX: player ? player.x : null,
                    turretX: turret ? turret.x : null
                };
            }""")

            assert settled_state["vx"] == 0, f"Player body X velocity must be 0 after level clear, got {settled_state['vx']}"
            assert settled_state["vy"] == 0, f"Player body Y velocity must be 0 after level clear, got {settled_state['vy']}"
            assert settled_state["turretMatches"], f"Turret must remain attached to tank position (turret: {settled_state['turretX']}, player: {settled_state['playerX']})"

            # 11. Verify Level Select, LocalStorage Persistence & Star Wars Credits
            # Check localStorage was written when level completed in Step 10
            storage_data = page.evaluate("""() => {
                const raw = localStorage.getItem('hbd70_progress');
                return raw ? JSON.parse(raw) : null;
            }""")
            assert storage_data is not None, "Progress must be saved to localStorage"
            assert storage_data["highestLevelBeaten"] >= 1, f"Expected highestLevelBeaten >= 1, got {storage_data}"
            assert 1 in storage_data["beatenLevels"], "Level 1 must be recorded in beatenLevels"
            assert storage_data["unlockedLevel"] >= 2, f"Level 2 must be unlocked, got {storage_data}"

            # Navigate back to SplashScene and verify new UI elements
            page.evaluate("""() => {
                window.game.scene.stop('Game');
                window.game.scene.start('Splash');
            }""")
            time.sleep(0.5)

            splash_eval = page.evaluate("""() => {
                const splash = window.game.scene.getScene('Splash');
                const children = splash.children.list;
                const levelsBtn = children.find(c => c.text && c.text.includes('LEVELS'));
                const creditsLink = children.find(c => c.type === 'Container' && c.list && c.list.some(sub => sub.text && sub.text.includes('Credits')));
                return {
                    hasLevelsBtn: !!levelsBtn,
                    levelsText: levelsBtn ? levelsBtn.text : null,
                    hasCredits: !!creditsLink
                };
            }""")
            assert splash_eval["hasLevelsBtn"], "SplashScene must display LEVELS button"
            assert "1/70" in splash_eval["levelsText"], f"Expected 1/70 beaten levels on button, got {splash_eval['levelsText']}"
            assert splash_eval["hasCredits"], "SplashScene must display Credits link"

            # Open LevelSelectScene
            page.evaluate("""() => {
                window.game.scene.stop('Splash');
                window.game.scene.start('LevelSelect');
            }""")
            time.sleep(0.5)

            level_select_eval = page.evaluate("""() => {
                const ls = window.game.scene.getScene('LevelSelect');
                if (!ls || !ls.scene.isActive()) return { active: false };

                const texts = ls.scrollContainer.list.filter(c => c.type === 'Text').map(t => t.text);
                const hasLevel1Title = texts.some(t => t.includes('Allan is Born'));
                const hasQuestionMarks = texts.some(t => t === '????');

                return {
                    active: true,
                    hasLevel1Title,
                    hasQuestionMarks
                };
            }""")
            assert level_select_eval["active"], "LevelSelectScene must be active"
            assert level_select_eval["hasLevel1Title"], "Beaten Level 1 must display milestone title"
            assert level_select_eval["hasQuestionMarks"], "Unbeaten levels must display ????"

            # Open CreditsScene
            page.evaluate("""() => {
                window.game.scene.stop('LevelSelect');
                window.game.scene.start('Credits');
            }""")
            time.sleep(0.5)

            credits_eval = page.evaluate("""() => {
                const cs = window.game.scene.getScene('Credits');
                if (!cs || !cs.scene.isActive()) return { active: false };

                const initialOffset = cs.scrollOffset;
                // Simulate dragging upward
                cs.input.emit('pointerdown', { y: 500 });
                cs.input.emit('pointermove', { y: 400 });
                const scrubbedOffset = cs.scrollOffset;
                cs.input.emit('pointerup', {});

                const textLines = cs.textItems.map(item => item.obj.text);
                const hasAllanTribute = textLines.some(t => t.includes("ALLAN'S MILESTONE"));
                const hasCodyCredit = textLines.some(t => t.includes("Cody Lusk"));

                return {
                    active: true,
                    hasAllanTribute,
                    hasCodyCredit,
                    scrubbedOffsetChanged: scrubbedOffset !== initialOffset
                };
            }""")
            assert credits_eval["active"], "CreditsScene must be active"
            assert credits_eval["hasAllanTribute"], "Credits must include Allan Lusk dedication"
            assert credits_eval["hasCodyCredit"], "Credits must include Cody Lusk credits"
            assert credits_eval["scrubbedOffsetChanged"], "Dragging must adjust scroll offset"

            browser.close()

    finally:
        server.terminate()
        server.wait()

    assert len(errors) == 0, f"Console or page errors detected: {errors}"
    print("E2E Playwright verification passed with 0 errors!")

if __name__ == "__main__":
    run_e2e()
