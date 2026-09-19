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

            browser.close()

    finally:
        server.terminate()
        server.wait()

    assert len(errors) == 0, f"Console or page errors detected: {errors}"
    print("E2E Playwright verification passed with 0 errors!")

if __name__ == "__main__":
    run_e2e()
