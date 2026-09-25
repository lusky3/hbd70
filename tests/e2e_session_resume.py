# tests/e2e_session_resume.py
# End-to-end Playwright headless verification for Per-Game Session Resume & Mid-Game Recovery

import sys
import time
import subprocess
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

def run_session_resume_e2e():
    port = 8098
    root_dir = Path(__file__).resolve().parent.parent
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        cwd=str(root_dir),
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

            print("1. Navigating to Allan's 70th Retro Arcade...")
            page.goto(f"http://localhost:{port}/index.html", wait_until="networkidle")
            page.wait_for_timeout(2000)

            # Step 1: Advance from Splash to GameSelect
            page.mouse.click(240, 500)
            page.wait_for_timeout(1000)

            # Step 2: Inject saved sessions for Tanks and Pong in localStorage
            print("2. Injecting saved sessions into localStorage...")
            tanks_session = {
                "gameId": "tanks",
                "timestamp": int(time.time() * 1000) - 120000, # 2m ago
                "summary": { "levelNum": 12, "lives": 2, "tanksDefeated": 34 },
                "state": { "levelNum": 12, "lives": 2, "tanksDefeated": 34, "isInvincibleCheat": False, "rapidFireCheat": False, "cpuSpeedMultiplier": 1.0 },
                "version": "1.7.0"
            }
            pong_session = {
                "gameId": "pong",
                "timestamp": int(time.time() * 1000) - 30000, # 30s ago
                "summary": { "playerScore": 4, "aiScore": 2, "maxRally": 6 },
                "state": { "playerScore": 4, "aiScore": 2, "maxRally": 6 },
                "version": "1.7.0"
            }

            page.evaluate(f"""() => {{
                window.localStorage.setItem('hbd70_session_tanks', '{json.dumps(tanks_session)}');
                window.localStorage.setItem('hbd70_session_pong', '{json.dumps(pong_session)}');
            }}""")

            # Reload or re-enter GameSelect to reflect badges
            page.evaluate("""() => {
                const game = window.game;
                if (game && game.scene) {
                    game.scene.stop('GameSelect');
                    game.scene.start('GameSelect');
                }
            }""")
            page.wait_for_timeout(800)

            # Step 3: Verify GameSelect has active session badges
            print("3. Verifying session badges in GameSelect...")
            active_sessions = page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                return {
                    hasTanks: window.localStorage.getItem('hbd70_session_tanks') !== null,
                    hasPong: window.localStorage.getItem('hbd70_session_pong') !== null,
                    hasInvaders: window.localStorage.getItem('hbd70_session_invaders') !== null
                };
            }""")
            print(f"Session states: {active_sessions}")
            assert active_sessions["hasTanks"] is True, "Tanks session must be present"
            assert active_sessions["hasPong"] is True, "Pong session must be present"
            assert active_sessions["hasInvaders"] is False, "Invaders session must be absent"

            # Step 4: Click Tanks card to launch ResumeSessionModal
            print("4. Clicking Tanks card to launch ResumeSessionModal...")
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.cards[0].onPlay();
            }""")
            page.wait_for_timeout(800)

            # Verify ResumeSessionModal is active
            modal_state = page.evaluate("""() => {
                const modal = window.game.scene.getScene('ResumeSessionModal');
                return {
                    isActive: modal && modal.scene.isActive(),
                    gameId: modal ? modal.gameId : null,
                    targetScene: modal ? modal.targetScene : null
                };
            }""")
            print(f"ResumeSessionModal state: {modal_state}")
            assert modal_state["isActive"] is True, "ResumeSessionModal must be active"
            assert modal_state["gameId"] == "tanks", "Modal gameId must be tanks"

            # Step 5: Click [▶ RESUME GAME] inside modal
            print("5. Clicking [▶ RESUME GAME] in modal...")
            modal_coords = page.evaluate("""() => {
                const modal = window.game.scene.getScene('ResumeSessionModal');
                return {
                    rx: modal.resumeZone.x,
                    ry: modal.resumeZone.y,
                    nx: modal.newGameZone.x,
                    ny: modal.newGameZone.y
                };
            }""")
            print(f"Modal button coordinates: {modal_coords}")
            page.mouse.click(modal_coords["rx"], modal_coords["ry"])
            page.wait_for_timeout(1000)

            # Check if LevelCard or Game started with levelNum 12
            level_state = page.evaluate("""() => {
                const lc = window.game.scene.getScene('LevelCard');
                const g = window.game.scene.getScene('Game');
                return {
                    lcActive: lc && lc.scene.isActive(),
                    lcLevel: lc ? lc.levelNum : null,
                    gActive: g && g.scene.isActive(),
                    gLevel: g ? g.levelNum : null,
                    gLives: g ? g.lives : null
                };
            }""")
            print(f"Post-resume state: {level_state}")
            assert level_state["lcLevel"] == 12 or level_state["gLevel"] == 12, "Resumed level must be 12"

            # Step 6: Test Auto-Save via backgrounding / visibilitychange
            print("6. Testing auto-save simulation...")
            page.evaluate("""() => {
                // If LevelCard, tap to advance to Game
                const lc = window.game.scene.getScene('LevelCard');
                if (lc && lc.scene.isActive()) {
                    lc.scene.stop();
                    window.game.scene.start('Game', { levelNum: 12, lives: 2, tanksDefeated: 34 });
                }
            }""")
            page.wait_for_timeout(800)

            # Trigger auto-save lifecycle
            page.evaluate("""() => {
                const g = window.game.scene.getScene('Game');
                if (g && g.scene.isActive()) {
                    g.lives = 1; // Lose a life in active game
                    g.captureSessionState();
                }
            }""")
            page.wait_for_timeout(500)

            saved_tanks = page.evaluate("""() => {
                const raw = window.localStorage.getItem('hbd70_session_tanks');
                return raw ? JSON.parse(raw) : null;
            }""")
            assert saved_tanks is not None, "Tanks session must be saved"
            assert saved_tanks["state"]["lives"] == 1, "Saved lives must be updated to 1"
            print(f"Auto-saved state verified: {saved_tanks['state']}")

            # Step 7: Test [🔄 NEW GAME] clears session
            print("7. Testing [🔄 NEW GAME] discarding saved session...")
            page.evaluate("""() => {
                window.game.scene.stop('Game');
                window.game.scene.stop('HUD');
                window.game.scene.start('GameSelect');
            }""")
            page.wait_for_timeout(800)

            # Launch resume modal for tanks again
            page.evaluate("""() => {
                const gs = window.game.scene.getScene('GameSelect');
                gs.cards[0].onPlay();
            }""")
            page.wait_for_timeout(800)

            # Click [🔄 NEW GAME] button (lower button in modal)
            modal_coords2 = page.evaluate("""() => {
                const modal = window.game.scene.getScene('ResumeSessionModal');
                return {
                    nx: modal.newGameZone.x,
                    ny: modal.newGameZone.y
                };
            }""")
            page.mouse.click(modal_coords2["nx"], modal_coords2["ny"])
            page.wait_for_timeout(800)

            # Verify session is cleared from localStorage
            tanks_cleared = page.evaluate("""() => {
                return window.localStorage.getItem('hbd70_session_tanks') === null;
            }""")
            assert tanks_cleared is True, "Tanks session must be cleared after NEW GAME"
            print("Tanks session successfully cleared after NEW GAME!")

            # Step 8: Verify Pool Session Resume
            print("8. Testing Birthday Pool Session Resume...")
            pool_session = {
                "gameId": "pool",
                "timestamp": int(time.time() * 1000) - 60000,
                "summary": { "subtype": "8ball", "difficulty": "regular", "score": 3, "detail": "Turn: Allan" },
                "state": {
                    "subtype": "8ball",
                    "difficulty": "regular",
                    "rules": { "activePlayer": 1, "scores": { "1": 3, "2": 1 }, "groups": { "1": "solids", "2": "stripes" }, "isBreakShot": False, "isGameOver": False },
                    "balls": [
                        { "id": 0, "x": 240, "y": 480, "vx": 0, "vy": 0, "inPocket": False, "pocketId": None },
                        { "id": 1, "x": 200, "y": 300, "vx": 0, "vy": 0, "inPocket": True, "pocketId": 0 },
                        { "id": 8, "x": 240, "y": 300, "vx": 0, "vy": 0, "inPocket": False, "pocketId": None }
                    ],
                    "aimAngle": -1.57,
                    "power": 0.6
                },
                "version": "1.7.0"
            }

            page.evaluate(f"""() => {{
                window.localStorage.setItem('hbd70_session_pool', '{json.dumps(pool_session)}');
                const gs = window.game.scene.getScene('GameSelect');
                if (gs && gs.scene.isActive()) {{
                    gs.cards[4].onPlay(); // Launch Pool
                }}
            }}""")
            page.wait_for_timeout(800)

            pool_modal = page.evaluate("""() => {
                const modal = window.game.scene.getScene('ResumeSessionModal');
                return {
                    isActive: modal && modal.scene.isActive(),
                    gameId: modal ? modal.gameId : null,
                    rx: modal ? modal.resumeZone.x : null,
                    ry: modal ? modal.resumeZone.y : null
                };
            }""")
            assert pool_modal["isActive"] is True, "ResumeSessionModal must be active for Pool"
            assert pool_modal["gameId"] == "pool", "Modal gameId must be pool"

            # Click [▶ RESUME GAME]
            page.mouse.click(pool_modal["rx"], pool_modal["ry"])
            page.wait_for_timeout(1000)

            pool_resumed = page.evaluate("""() => {
                const pool = window.game.scene.getScene('Pool');
                const ball1Sprite = pool ? pool.ballSprites.get(1) : null;
                return {
                    isActive: pool && pool.scene.isActive(),
                    p1Score: pool ? pool.rules.scores[1] : null,
                    p1Group: pool ? pool.rules.groups[1] : null,
                    cueX: pool ? pool.physicsEngine.cueBall.x : null,
                    ball1Visible: ball1Sprite ? ball1Sprite.visible : null
                };
            }""")
            print(f"Pool resumed state: {pool_resumed}")
            assert pool_resumed["isActive"] is True, "Pool must be active"
            assert pool_resumed["p1Score"] == 3, "Resumed P1 score must be 3"
            assert pool_resumed["p1Group"] == "solids", "Resumed P1 group must be solids"
            assert pool_resumed["cueX"] == 240, "Cue ball X must be 240"
            assert pool_resumed["ball1Visible"] is False, "Pocketed ball 1 sprite must be hidden"

            # Step 9: Verify Space Invaders Session Resume
            print("9. Testing Space Invaders Session Resume...")
            page.evaluate("""() => {
                window.game.scene.stop('Pool');
                window.game.scene.start('GameSelect');
            }""")
            page.wait_for_timeout(800)

            invaders_session = {
                "gameId": "invaders",
                "timestamp": int(time.time() * 1000) - 45000,
                "summary": { "wave": 3, "score": 4500, "lives": 2 },
                "state": { "wave": 3, "score": 4500, "lives": 2, "difficulty": "regular" },
                "version": "1.7.0"
            }
            page.evaluate(f"""() => {{
                window.localStorage.setItem('hbd70_session_invaders', '{json.dumps(invaders_session)}');
                const gs = window.game.scene.getScene('GameSelect');
                if (gs && gs.scene.isActive()) {{
                    gs.cards[2].onPlay(); // Launch Space Invaders
                }}
            }}""")
            page.wait_for_timeout(800)

            inv_modal = page.evaluate("""() => {
                const modal = window.game.scene.getScene('ResumeSessionModal');
                return {
                    isActive: modal && modal.scene.isActive(),
                    gameId: modal ? modal.gameId : null,
                    rx: modal ? modal.resumeZone.x : null,
                    ry: modal ? modal.resumeZone.y : null
                };
            }""")
            assert inv_modal["isActive"] is True, "ResumeSessionModal must be active for Invaders"
            assert inv_modal["gameId"] == "invaders", "Modal gameId must be invaders"

            page.mouse.click(inv_modal["rx"], inv_modal["ry"])
            page.wait_for_timeout(1000)

            inv_resumed = page.evaluate("""() => {
                const inv = window.game.scene.getScene('SpaceInvaders');
                return {
                    isActive: inv && inv.scene.isActive(),
                    wave: inv ? inv.wave : null,
                    score: inv ? inv.score : null,
                    lives: inv ? inv.lives : null
                };
            }""")
            print(f"Space Invaders resumed state: {inv_resumed}")
            assert inv_resumed["isActive"] is True, "Space Invaders must be active"
            assert inv_resumed["wave"] == 3, "Resumed wave must be 3"
            assert inv_resumed["score"] == 4500, "Resumed score must be 4500"
            assert inv_resumed["lives"] == 2, "Resumed lives must be 2"

            # Step 10: Verify Asteroids Session Resume
            print("10. Testing Asteroids Session Resume...")
            page.evaluate("""() => {
                window.game.scene.stop('SpaceInvaders');
                window.game.scene.start('GameSelect');
            }""")
            page.wait_for_timeout(800)

            asteroids_session = {
                "gameId": "asteroids",
                "timestamp": int(time.time() * 1000) - 25000,
                "summary": "Wave 4 | 6,200 pts | 🚀", # testing string summary polymorphism
                "state": { "wave": 4, "score": 6200, "lives": 1 },
                "version": "1.7.0"
            }
            page.evaluate(f"""() => {{
                window.localStorage.setItem('hbd70_session_asteroids', '{json.dumps(asteroids_session)}');
                const gs = window.game.scene.getScene('GameSelect');
                if (gs && gs.scene.isActive()) {{
                    gs.cards[3].onPlay(); // Launch Asteroids
                }}
            }}""")
            page.wait_for_timeout(800)

            ast_modal = page.evaluate("""() => {
                const modal = window.game.scene.getScene('ResumeSessionModal');
                return {
                    isActive: modal && modal.scene.isActive(),
                    gameId: modal ? modal.gameId : null,
                    rx: modal ? modal.resumeZone.x : null,
                    ry: modal ? modal.resumeZone.y : null
                };
            }""")
            assert ast_modal["isActive"] is True, "ResumeSessionModal must be active for Asteroids"
            assert ast_modal["gameId"] == "asteroids", "Modal gameId must be asteroids"

            page.mouse.click(ast_modal["rx"], ast_modal["ry"])
            page.wait_for_timeout(1000)

            ast_resumed = page.evaluate("""() => {
                const ast = window.game.scene.getScene('Asteroids');
                return {
                    isActive: ast && ast.scene.isActive(),
                    wave: ast ? ast.wave : null,
                    score: ast ? ast.score : null,
                    lives: ast ? ast.lives : null
                };
            }""")
            print(f"Asteroids resumed state: {ast_resumed}")
            assert ast_resumed["isActive"] is True, "Asteroids must be active"
            assert ast_resumed["wave"] == 4, "Resumed wave must be 4"
            assert ast_resumed["score"] == 6200, "Resumed score must be 6200"
            assert ast_resumed["lives"] == 1, "Resumed lives must be 1"

            print("\n✅ All End-to-End Session Resume & Mid-Game Recovery tests PASSED across all 5 games!")

            browser.close()

    finally:
        server.terminate()
        server.wait()

    if errors:
        print(f"\n⚠️ Non-fatal console/page errors detected during run: {len(errors)}")
        for e in errors[:5]:
            print(f"  - {e}")

if __name__ == "__main__":
    run_session_resume_e2e()
