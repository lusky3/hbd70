# tests/e2e_arcade_verification.py
# End-to-end Playwright headless verification for Allan's 70th Birthday Retro Arcade Collection

import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def run_arcade_e2e():
    port = 8094
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1.2)

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

            # 1. Navigate to Game
            page.goto(f"http://localhost:{port}/", wait_until="networkidle")
            page.wait_for_function("() => window.game && window.game.isBooted", timeout=6000)

            # 2. Verify Splash Scene & Tap Anywhere Transition
            splash_active = page.evaluate("""() => {
                const splash = window.game.scene.getScene('Splash');
                return splash && splash.scene.isActive();
            }""")
            assert splash_active, "SplashScene must be active at startup"

            # Click screen to proceed to GameSelect
            page.mouse.click(240, 400)
            time.sleep(0.5)

            # 3. Verify GameSelect Scene & Version v1.1.0
            game_select_state = page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                if (!gs || !gs.scene.isActive()) return { active: false };
                const textObjects = gs.children.list.filter(c => c.type === 'Text');
                const texts = textObjects.map(t => t.text);
                const hasVersion = texts.some(t => t.includes('v1.1.0'));
                return {
                    active: true,
                    hasVersion: hasVersion,
                    cameras: gs.cameras.main.width === 480
                };
            }""")
            assert game_select_state["active"], f"GameSelectScene must be active after splash tap, got {game_select_state}"
            assert game_select_state["hasVersion"], f"GameSelectScene must display v1.1.0 in footer, got {game_select_state}"

            # 3b. Verify Credits Scene strings (Parry Sound, [IN SPIRIT], QA Testers)
            print("[E2E] Testing Credits Scene Strings...")
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.start('Credits');
            }""")
            time.sleep(0.5)

            credits_state = page.evaluate("""() => {
                const cr = window.game.scene.getScene('Credits');
                if (!cr || !cr.scene.isActive()) return { active: false };
                const texts = cr.textItems ? cr.textItems.map(t => t.obj ? t.obj.text : '') : [];
                return {
                    active: true,
                    hasParrySound: texts.some(t => t && t.includes('Parry Sound')),
                    noKingCity: !texts.some(t => t && t.includes('King City')),
                    hasInSpirit: texts.some(t => t && t.includes('[IN SPIRIT]')),
                    hasQATesters: texts.some(t => t && t.includes('Kelsey Lusk & Jay'))
                };
            }""")
            assert credits_state["active"], "CreditsScene must be active"
            assert credits_state["hasParrySound"], f"Credits must feature Parry Sound: {credits_state}"
            assert credits_state["noKingCity"], f"Credits must not mention King City: {credits_state}"
            assert credits_state["hasInSpirit"], f"Credits must feature [IN SPIRIT]: {credits_state}"
            assert credits_state["hasQATesters"], f"Credits must feature Kelsey & Jay: {credits_state}"

            # Return to GameSelect
            page.mouse.click(55, 34)
            time.sleep(0.5)

            # 4. Test Pong Scene Flow
            print("[E2E] Testing Birthday Pong Scene...")
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.start('Pong');
            }""")
            time.sleep(0.5)

            pong_state = page.evaluate("""() => {
                const pong = window.game.scene.getScene('Pong');
                if (!pong || !pong.scene.isActive()) return { active: false };
                return {
                    active: true,
                    ball: !!pong.ball,
                    playerPaddle: !!pong.playerPaddle,
                    paddleGrip: !!pong.paddleGrip,
                    aiPaddle: !!pong.aiPaddle,
                    gameActive: pong.gameActive
                };
            }""")
            assert pong_state["active"], "PongScene must be active"
            assert pong_state["ball"], "Pong ball must exist"
            assert pong_state["playerPaddle"], "Pong player paddle must exist"
            assert pong_state["paddleGrip"], "Pong under-paddle grip handle must exist"
            assert pong_state["aiPaddle"], "Pong AI opponent paddle must exist"

            # Tap "START GAME ▶" button on ControlsOverlay
            page.mouse.click(240, 662)
            time.sleep(1.1)

            pong_started = page.evaluate("""() => {
                const pong = window.game.scene.getScene('Pong');
                return pong && pong.gameActive;
            }""")
            assert pong_started, "Pong game must be active after dismissing ControlsOverlay"

            # Return to GameSelect from Pong
            page.mouse.click(55, 34)
            time.sleep(0.5)

            # 5. Test Space Invaders Flow
            print("[E2E] Testing Space Invaders Scene...")
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.start('SpaceInvaders');
            }""")
            time.sleep(0.5)

            invaders_state = page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                if (!inv || !inv.scene.isActive()) return { active: false };
                return {
                    active: true,
                    player: !!inv.player,
                    bunkerCount: inv.bunkers ? inv.bunkers.countActive() : 0,
                    invaderCount: inv.invaders ? inv.invaders.countActive() : 0,
                    gameActive: inv.gameActive
                };
            }""")
            assert invaders_state["active"], "SpaceInvadersScene must be active"
            assert invaders_state["player"], "Player cannon must exist"
            assert invaders_state["bunkerCount"] == 24, f"Must have 24 milestone bunker blocks (4 bunkers x 6 blocks), got {invaders_state['bunkerCount']}"
            assert invaders_state["invaderCount"] >= 16, "Invader rows must be spawned"

            # Tap "START GAME ▶" on ControlsOverlay
            page.mouse.click(240, 662)
            time.sleep(0.4)

            invaders_started = page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                return inv && inv.gameActive;
            }""")
            # Verify continuous touch dragging across play area and button area
            page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                // Simulate pointerdown in play area
                inv.input.emit('pointerdown', { id: 1, x: 240, y: 700 });
                // Move down across direction buttons (y = 820) to x = 380
                inv.input.emit('pointermove', { id: 1, x: 380, y: 820 });
            }""")
            inv_drag_x = page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                return inv.player.x;
            }""")
            assert inv_drag_x == 380, f"Player cannon should follow continuous finger swipe across buttons to x=380, got {inv_drag_x}"

            # Tap release to fire
            inv_bullets_before = page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                // Quick tap in play area without dragging
                inv.input.emit('pointerdown', { id: 2, x: 240, y: 700 });
                inv.input.emit('pointerup', { id: 2, x: 240, y: 700 });
                return inv.playerBullets.countActive();
            }""")
            assert inv_bullets_before >= 1, "Quick tap in play area should fire cannon"

            # Return to GameSelect from Space Invaders
            page.mouse.click(55, 34)
            time.sleep(0.5)

            # 6. Test Asteroids Flow
            print("[E2E] Testing Birthday Asteroids Scene...")
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.start('Asteroids');
            }""")
            time.sleep(0.5)

            asteroids_state = page.evaluate("""() => {
                const ast = window.game.scene.getScene('Asteroids');
                if (!ast || !ast.scene.isActive()) return { active: false };
                return {
                    active: true,
                    ship: !!ast.ship,
                    asteroidCount: ast.asteroids ? ast.asteroids.countActive() : 0,
                    gameActive: ast.gameActive
                };
            }""")
            assert asteroids_state["active"], "AsteroidsScene must be active"
            assert asteroids_state["ship"], "Space cruiser ship must exist"
            assert asteroids_state["asteroidCount"] >= 4, "Initial asteroid wave must exist"

            # Tap "START GAME ▶" on ControlsOverlay
            page.mouse.click(240, 662)
            time.sleep(0.4)

            asteroids_started = page.evaluate("""() => {
                const ast = window.game.scene.getScene('Asteroids');
                return ast && ast.gameActive;
            }""")
            assert asteroids_started, "Asteroids game must be active after dismissing overlay"

            # Verify tap-to-fire heading invariance
            ast_rotation_before = page.evaluate("""() => {
                const ast = window.game.scene.getScene('Asteroids');
                ast.ship.rotation = 1.25; // Set specific heading
                // Quick tap at (100, 300) without drag
                ast.input.emit('pointerdown', { id: 3, x: 100, y: 300 });
                return ast.ship.rotation;
            }""")
            time.sleep(0.05)
            ast_rotation_after = page.evaluate("""() => {
                const ast = window.game.scene.getScene('Asteroids');
                ast.input.emit('pointerup', { id: 3, x: 100, y: 300 });
                return {
                    rotation: ast.ship.rotation,
                    lasers: ast.lasers.countActive(),
                    score: ast.score
                };
            }""")
            assert abs(ast_rotation_after["rotation"] - ast_rotation_before) < 1e-6, f"Ship heading must not change during tap-to-fire! Before {ast_rotation_before}, after {ast_rotation_after['rotation']}"
            assert ast_rotation_after["lasers"] >= 1 or ast_rotation_after["score"] > 0, "Tap on playfield should fire laser"

            # Return to GameSelect from Asteroids
            page.mouse.click(55, 34)
            time.sleep(0.5)

            # 7. Test Tanks Level 1 ControlsOverlay & Menu Return Flow
            print("[E2E] Testing Tanks Level 1 Scene...")
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.start('LevelCard', { levelNum: 1, lives: 3, tanksDefeated: 0 });
            }""")
            time.sleep(0.5)

            page.evaluate("""() => {
                const lc = window.game.scene.getScene('LevelCard');
                if (lc && lc.scene.isActive()) {
                    lc.scene.start('Game', { levelNum: 1, lives: 3, tanksDefeated: 0 });
                }
            }""")
            time.sleep(0.6)

            tanks_state = page.evaluate("""() => {
                const g = window.game.scene.getScene('Game');
                const hud = window.game.scene.getScene('HUD');
                return {
                    gameActive: g && g.scene.isActive(),
                    hudActive: hud && hud.scene.isActive(),
                    isPausedForControls: g ? g.isPausedForControls : false,
                    hasMenuBtn: hud && !!hud.menuBtn
                };
            }""")
            assert tanks_state["gameActive"], "Tanks GameScene must be active"
            assert tanks_state["hudActive"], "HUDScene must be active"
            assert tanks_state["hasMenuBtn"], "HUD must feature arcade menu button"

            # Dismiss Level 1 overlay
            page.mouse.click(240, 662)
            time.sleep(0.4)

            # Click HUD menu button to return to GameSelect
            page.evaluate("""() => {
                const hud = window.game.scene.getScene('HUD');
                if (hud && hud.menuBtn) {
                    hud.menuBtn.emit('pointerdown');
                }
            }""")
            time.sleep(0.5)

            final_gs_active = page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                return gs && gs.scene.isActive();
            }""")
            assert final_gs_active, "Should have successfully returned to GameSelect from Tanks"

            # 8. Test AC-8 Arcade Stats Persistence & Dynamic Card Badges
            print("[E2E] Testing AC-8 Arcade Stats Persistence & GameSelect...")
            stats_verification = page.evaluate("""async () => {
                const module = await import('./src/systems/Storage.js');
                const st = module.storage;
                st.recordPongMatch({ won: true, rally: 9 });
                st.recordInvadersScore({ score: 1450, wave: 3 });
                st.recordAsteroidsScore({ score: 3200, wave: 4 });

                const stats = st.getArcadeStats();
                return {
                    pong: stats.pong,
                    invaders: stats.invaders,
                    asteroids: stats.asteroids
                };
            }""")
            assert stats_verification["pong"]["wins"] >= 1, f"Pong wins not recorded: {stats_verification}"
            assert stats_verification["pong"]["longestRally"] >= 9, f"Pong rally not recorded: {stats_verification}"
            assert stats_verification["invaders"]["highScore"] >= 1450, f"Invaders score not recorded: {stats_verification}"
            assert stats_verification["asteroids"]["highScore"] >= 3200, f"Asteroids score not recorded: {stats_verification}"

            # Restart GameSelect to verify cards render updated stats without errors
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.restart();
            }""")
            time.sleep(0.5)

            cards_rendered = page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                return gs && gs.scene.isActive();
            }""")
            assert cards_rendered, "GameSelect must restart cleanly with updated stats"

            browser.close()

            print(f"[E2E] All tests passed! Console errors count: {len(errors)}")
            assert len(errors) == 0, f"Encountered unexpected browser console errors: {errors}"

    finally:
        server.terminate()

if __name__ == "__main__":
    run_arcade_e2e()
