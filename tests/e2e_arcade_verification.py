# tests/e2e_arcade_verification.py
# End-to-end Playwright headless verification for Allan's 70th Birthday Retro Arcade Collection

import sys
import time
import subprocess
import json
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

            def on_page_error(err):
                print(f"[PAGE_ERROR]: {err}")
                if hasattr(err, "stack"):
                    print(f"[PAGE_ERROR STACK]: {err.stack}")
                errors.append(f"PAGE_ERROR: {err}")
            page.on("pageerror", on_page_error)
            page.on("console", lambda msg: errors.append(f"CONSOLE_ERROR: {msg.text}") if msg.type == "error" else None)

            def handle_lb_route(route):
                if route.request.method == "POST":
                    route.fulfill(
                        status=201,
                        content_type="application/json",
                        body=json.dumps({
                            "success": True,
                            "gameId": "tanks",
                            "rank": 1,
                            "initials": "AL7",
                            "fullName": "Allan 70th",
                            "score": 70000,
                            "detail": "Level 70 Beaten"
                        })
                    )
                else:
                    route.fulfill(
                        status=200,
                        content_type="application/json",
                        body=json.dumps({
                            "success": True,
                            "gameId": "tanks",
                            "results": [
                                {"rank": 1, "initials": "AL7", "fullName": "Allan 70th", "score": 70000, "detail": "Level 70 Beaten", "created_at": "2026-09-22T00:00:00Z"},
                                {"rank": 2, "initials": "COD", "fullName": "Cody Lusk", "score": 65000, "detail": "Level 65", "created_at": "2026-09-22T00:00:00Z"}
                            ]
                        })
                    )
            page.route("**/api/v1/leaderboard/*", handle_lb_route)

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

            # 3. Verify GameSelect Scene & Version v1.3.0
            game_select_state = page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                if (!gs || !gs.scene.isActive()) return { active: false };
                const textObjects = gs.children.list.filter(c => c.type === 'Text');
                const texts = textObjects.map(t => t.text);
                const hasVersion = texts.some(t => t.includes('v1.3.0'));
                return {
                    active: true,
                    hasVersion: hasVersion,
                    cameras: gs.cameras.main.width === 480
                };
            }""")
            assert game_select_state["active"], f"GameSelectScene must be active after splash tap, got {game_select_state}"
            assert game_select_state["hasVersion"], f"GameSelectScene must display v1.3.0 in footer, got {game_select_state}"

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

            # 3c. Test Leaderboard Modal from GameSelect by clicking left half of button (AC-1 full hitbox check)
            print("[E2E] Testing Leaderboard Modal & Full Button Hitbox...")
            page.mouse.click(140, 765)
            time.sleep(0.5)

            lb_modal_state = page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                if (!lb || !lb.scene.isActive()) return { active: false };
                const texts = [];
                function findTexts(obj) {
                    if (obj.text) texts.push(obj.text);
                    if (obj.list && Array.isArray(obj.list)) {
                        obj.list.forEach(findTexts);
                    }
                }
                lb.children.list.forEach(findTexts);
                const hasTitle = texts.some(t => t && t.includes('ALLAN ARCADE TOP 10'));
                const hasDate = texts.some(t => t && t.includes('DATE'));
                const hasSetTagBtn = texts.some(t => t && t.includes('SET TAG/NAME'));
                return {
                    active: true,
                    hasTitle: hasTitle,
                    hasDate: hasDate,
                    hasSetTagBtn: hasSetTagBtn,
                    activeGameId: lb.activeGameId,
                    tabCount: lb.tabButtons ? lb.tabButtons.length : 0
                };
            }""")
            assert lb_modal_state["active"], "LeaderboardModal must be active after clicking High Scores button on left edge"
            assert lb_modal_state["hasTitle"], "LeaderboardModal must render top title"
            assert lb_modal_state["hasDate"], "LeaderboardModal must render DATE column header"
            assert lb_modal_state["hasSetTagBtn"], "LeaderboardModal must feature SET TAG/NAME action button"
            assert lb_modal_state["tabCount"] == 4, f"LeaderboardModal must feature 4 tabs, got {lb_modal_state['tabCount']}"

            # Verify tooltip display
            tooltip_visible = page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                lb.showTooltip(240, 300, 'AL7', 'Allan 70th');
                return lb.tooltipContainer && lb.tooltipContainer.visible;
            }""")
            assert tooltip_visible, "Leaderboard tooltip must become visible on showTooltip call"
            page.evaluate("() => window.game.scene.getScene('LeaderboardModal').hideTooltip()")

            # Test launching InitialsEntryOverlay in profile mode
            page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                lb.scene.launch('InitialsEntryOverlay', { mode: 'profile', returnScene: 'LeaderboardModal' });
            }""")
            time.sleep(0.4)

            profile_overlay_state = page.evaluate("""() => {
                const overlay = window.game.scene.getScene('InitialsEntryOverlay');
                if (!overlay || !overlay.scene.isActive()) return { active: false };
                return {
                    active: true,
                    mode: overlay.mode,
                    hasProfileHeader: !!overlay.children.list.find(c => c.text && c.text.includes('PLAYER PROFILE'))
                };
            }""")
            assert profile_overlay_state["active"], "InitialsEntryOverlay must open from LeaderboardModal"
            assert profile_overlay_state["mode"] == "profile", "InitialsEntryOverlay must be in profile mode"
            assert profile_overlay_state["hasProfileHeader"], "InitialsEntryOverlay must display PLAYER PROFILE header"

            # Close profile overlay
            page.evaluate("() => window.game.scene.getScene('InitialsEntryOverlay').scene.stop()")
            time.sleep(0.3)

            # Switch tabs to Asteroids
            page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                const astTab = lb.tabButtons.find(t => t.id === 'asteroids');
                if (astTab && astTab.container) {
                    astTab.container.emit('pointerdown');
                }
            }""")
            time.sleep(0.3)
            active_tab = page.evaluate("() => window.game.scene.getScene('LeaderboardModal').activeGameId")
            assert active_tab == "asteroids", f"Active tab should switch to asteroids, got {active_tab}"

            # Close Leaderboard Modal
            page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                lb.closeModal();
            }""")
            time.sleep(0.4)
            lb_closed = page.evaluate("() => !window.game.scene.isActive('LeaderboardModal')")
            assert lb_closed, "LeaderboardModal should close and return to GameSelect"

            # 3d. Test InitialsEntryOverlay launch, typing, and submission
            print("[E2E] Testing InitialsEntryOverlay Flow...")
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.launch('InitialsEntryOverlay', {
                    gameId: 'tanks',
                    score: 70000,
                    detail: 'Level 70 Beaten',
                    returnScene: 'GameSelect'
                });
            }""")
            time.sleep(0.4)
            overlay_state = page.evaluate("""() => {
                const ov = window.game.scene.getScene('InitialsEntryOverlay');
                if (!ov || !ov.scene.isActive()) return { active: false };
                ov.initials = ['A', 'L', '7'];
                ov.updateSlotDisplay();
                return {
                    active: true,
                    initials: ov.initials.join(''),
                    slotCount: ov.slotContainers.length
                };
            }""")
            assert overlay_state["active"], "InitialsEntryOverlay must be active"
            assert overlay_state["slotCount"] == 3, "InitialsEntryOverlay must feature 3 letter slots"
            assert overlay_state["initials"] == "AL7", f"Initials should be AL7, got {overlay_state['initials']}"

            # Submit score
            page.evaluate("""async () => {
                const ov = window.game.scene.getScene('InitialsEntryOverlay');
                await ov.submit();
            }""")
            time.sleep(0.5)

            # Check that LeaderboardModal launched with submission
            post_submit_lb = page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                return lb && lb.scene.isActive();
            }""")
            assert post_submit_lb, "LeaderboardModal should be active after score submission"

            # Close Leaderboard Modal
            page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                lb.closeModal();
            }""")
            time.sleep(0.4)

            # 3e. Test RetroactiveImportModal Flow
            print("[E2E] Testing RetroactiveImportModal Flow...")
            page.evaluate("""() => {
                window.localStorage.setItem('hbd70_progress', JSON.stringify({
                    highestLevelBeaten: 15,
                    beatenLevels: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    unlockedLevel: 16,
                    arcadeStats: {
                        tanks: { highScore: 15000 },
                        pong: { wins: 3, losses: 1, longestRally: 22 },
                        invaders: { highScore: 5600, highestWave: 4 },
                        asteroids: { highScore: 11200, highestWave: 3 }
                    }
                }));
                window.localStorage.removeItem('hbd70_scores_migrated');
                const gs = window.game.scene.getScene('GameSelect');
                gs.scene.launch('RetroactiveImportModal', { returnScene: 'GameSelect' });
            }""")
            time.sleep(0.5)

            retro_state = page.evaluate("""() => {
                const rm = window.game.scene.getScene('RetroactiveImportModal');
                if (!rm || !rm.scene.isActive()) return { active: false };
                const hasUploadBtn = rm.submitText && rm.submitText.text.includes('UPLOAD TO LEADERBOARD');
                return {
                    active: true,
                    hasHeader: true,
                    hasUploadBtn: !!hasUploadBtn,
                    unmigratedCount: rm.unmigrated ? rm.unmigrated.length : 0
                };
            }""")
            assert retro_state["active"], f"RetroactiveImportModal should be active, got {retro_state}"
            assert retro_state["hasUploadBtn"], f"RetroactiveImportModal should display upload button, got {retro_state}"
            assert retro_state["unmigratedCount"] == 4, f"Should detect all 4 games, got {retro_state['unmigratedCount']}"

            # Submit scores from modal
            page.evaluate("""async () => {
                const rm = window.game.scene.getScene('RetroactiveImportModal');
                await rm.submitScores();
            }""")
            time.sleep(0.8)

            migrated_flag = page.evaluate("() => window.localStorage.getItem('hbd70_scores_migrated')")
            assert migrated_flag == "true", f"hbd70_scores_migrated should be true after submission, got {migrated_flag}"

            # Verify LeaderboardModal opened
            lb_from_retro = page.evaluate("() => window.game.scene.isActive('LeaderboardModal')")
            assert lb_from_retro, "LeaderboardModal should be active after retroactive score submission"

            # Close Leaderboard Modal
            page.evaluate("() => window.game.scene.getScene('LeaderboardModal').closeModal()")
            time.sleep(0.4)

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

            # Release drag pointer 1
            page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                inv.input.emit('pointerup', { id: 1, x: 380, y: 820 });
            }""")
            time.sleep(0.3)

            # Real browser tap in play area to fire cannon
            page.mouse.move(240, 600)
            page.mouse.down()
            time.sleep(0.06)
            page.mouse.up()
            time.sleep(0.1)

            inv_bullets_after = page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                return inv.playerBullets.countActive();
            }""")
            assert inv_bullets_after >= 1, f"Quick tap in play area should fire cannon, got {inv_bullets_after}"

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

            # Verify tap-to-fire heading invariance with real browser mouse input
            page.evaluate("""() => {
                const ast = window.game.scene.getScene('Asteroids');
                ast.ship.rotation = 1.25; // Set specific heading
            }""")
            time.sleep(0.05)
            ast_rotation_before = page.evaluate("() => window.game.scene.getScene('Asteroids').ship.rotation")

            # Perform a real browser tap at (120, 280) in the playfield
            page.mouse.move(120, 280)
            page.mouse.down()
            time.sleep(0.08)
            page.mouse.up()
            time.sleep(0.1)

            ast_rotation_after = page.evaluate("""() => {
                const ast = window.game.scene.getScene('Asteroids');
                return {
                    rotation: ast.ship.rotation,
                    lasers: ast.lasers.countActive(),
                    score: ast.score
                };
            }""")
            assert abs(ast_rotation_after["rotation"] - ast_rotation_before) < 1e-5, f"Ship heading must not change during tap-to-fire! Before {ast_rotation_before}, after {ast_rotation_after['rotation']}"
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
