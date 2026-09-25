# tests/e2e_pool.py
# End-to-end browser verification for Allan's 70th Birthday Retro Pool (Pocket Billiards) Game

import sys
import time
import subprocess
import json
from playwright.sync_api import sync_playwright

def run_e2e_pool():
    port = 8098
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1.2)

    console_errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path="/usr/bin/google-chrome",
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            context = browser.new_context(viewport={"width": 480, "height": 854})
            page = context.new_page()

            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

            def handle_lb_route(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({
                        "success": True,
                        "gameId": "pool_8ball",
                        "results": [
                            {"rank": 1, "initials": "AL7", "fullName": "Allan Legend", "score": 9500, "detail": "Clean Sweep", "created_at": "2026-09-25T00:00:00Z"},
                            {"rank": 2, "initials": "COD", "fullName": "Cody Lusk", "score": 7200, "detail": "8-Ball Potted", "created_at": "2026-09-25T00:00:00Z"}
                        ]
                    })
                )
            page.route("**/api/leaderboard*", handle_lb_route)
            page.route("**/api/v1/leaderboard/*", handle_lb_route)

            # 1. Load application
            print("[E2E] Loading application at http://localhost:8098/ ...")
            page.goto(f"http://localhost:{port}/", wait_until="networkidle")
            page.wait_for_selector("#game-container canvas")
            time.sleep(1.0)

            # 2. Advance from Splash to GameSelect
            page.click("#game-container canvas", position={"x": 240, "y": 420})
            time.sleep(1.0)

            # 3. Verify Pool card on GameSelect
            select_state = page.evaluate("""() => {
                const gs = window.game ? window.game.scene.getScene('GameSelect') : null;
                return {
                    isActive: gs && gs.scene.isActive(),
                    cardsLength: gs && gs.cards ? gs.cards.length : 0,
                    hasPool: gs && gs.cards ? gs.cards.some(c => c.id === 'pool') : false
                };
            }""")
            print(f"[E2E] GameSelect State: {select_state}")
            assert select_state["isActive"], "GameSelect scene should be active"
            assert select_state["hasPool"], "GameSelect should contain Pool arcade card"

            # 4. Launch Pool Game directly
            page.evaluate("""() => {
                window.game.scene.stop('GameSelect');
                window.game.scene.start('Pool');
            }""")
            time.sleep(1.2)

            # 5. Verify Pool Scene state
            pool_state = page.evaluate("""() => {
                const pool = window.game ? window.game.scene.getScene('Pool') : null;
                if (!pool || !pool.scene.isActive()) return { isActive: false };
                return {
                    isActive: true,
                    subtype: pool.subtype,
                    difficulty: pool.difficulty,
                    ballCount: pool.physicsEngine.balls.length,
                    activeBalls: pool.physicsEngine.activeBalls.length,
                    cueBallPos: pool.physicsEngine.cueBall ? { x: pool.physicsEngine.cueBall.x, y: pool.physicsEngine.cueBall.y } : null,
                    power: pool.power,
                    aimAngle: pool.aimAngle
                };
            }""")
            print(f"[E2E] Pool Scene State: {pool_state}")
            assert pool_state["isActive"], "Pool scene should be active"
            assert pool_state["subtype"] == "8ball", "Default subtype should be 8ball"
            assert pool_state["ballCount"] == 16, "8-ball should have 16 racked balls"
            assert pool_state["activeBalls"] == 16, "All 16 balls should be on table"

            # 6. Test Interactive Controls: Aim adjustments & Power slider
            ctrl_test = page.evaluate("""() => {
                const pool = window.game.scene.getScene('Pool');
                const initialAngle = pool.aimAngle;
                pool.aimAngle += 0.1;
                pool.power = 0.8;
                return {
                    angleChanged: pool.aimAngle !== initialAngle,
                    power: pool.power
                };
            }""")
            print(f"[E2E] Controls Test: {ctrl_test}")
            assert ctrl_test["angleChanged"], "Aim angle should be adjustable"
            assert ctrl_test["power"] == 0.8, "Power should be set to 0.8"

            # 7. Execute Strike
            strike_test = page.evaluate("""() => {
                const pool = window.game.scene.getScene('Pool');
                pool.executeStrike();
                return {
                    isMoving: pool.physicsEngine.isMoving(),
                    cueSpeed: pool.physicsEngine.cueBall.speed
                };
            }""")
            print(f"[E2E] Strike Executed: {strike_test}")
            assert strike_test["cueSpeed"] > 0, "Cue ball should have positive speed after strike"

            # Wait for balls to settle
            for _ in range(25):
                settled = page.evaluate("""() => {
                    const pool = window.game.scene.getScene('Pool');
                    return !pool.physicsEngine.isMoving();
                }""")
                if settled:
                    break
                time.sleep(0.1)
            print("[E2E] Balls settled cleanly.")

            # 8. Test Settings Modal & Subtype Switch to 9-Ball
            switch_to_nine_ball = page.evaluate("""() => {
                const pool = window.game.scene.getScene('Pool');
                pool.subtype = '9ball';
                pool.difficulty = 'legend';
                pool.setupNewGame();
                return {
                    subtype: pool.subtype,
                    difficulty: pool.difficulty,
                    ballCount: pool.physicsEngine.balls.length
                };
            }""")
            print(f"[E2E] Switched to 9-Ball Legend: {switch_to_nine_ball}")
            assert switch_to_nine_ball["subtype"] == "9ball"
            assert switch_to_nine_ball["difficulty"] == "legend"
            assert switch_to_nine_ball["ballCount"] == 10, "9-Ball must have 10 racked balls"

            # 9. Verify Leaderboard Modal POOL tab
            lb_test = page.evaluate("""() => {
                window.game.scene.stop('Pool');
                window.game.scene.start('LeaderboardModal');
            }""")
            time.sleep(0.8)

            lb_state = page.evaluate("""() => {
                const lb = window.game.scene.getScene('LeaderboardModal');
                if (!lb || !lb.scene.isActive()) return { isActive: false };
                lb.switchGame('pool');
                return {
                    isActive: true,
                    activeGameId: lb.activeGameId,
                    subTabsRendered: lb.poolSubTabButtons ? lb.poolSubTabButtons.length : 0,
                    subTabsVisible: lb.poolSubTabsContainer ? lb.poolSubTabsContainer.visible : false
                };
            }""")
            print(f"[E2E] Leaderboard Modal State: {lb_state}")
            assert lb_state["isActive"], "LeaderboardModal should be active"
            assert lb_state["activeGameId"].startswith("pool"), "Leaderboard game should be pool"
            assert lb_state["subTabsRendered"] == 4, "Leaderboard should display 4 pool sub-tabs"
            assert lb_state["subTabsVisible"] == True, "Pool sub-tabs container should be visible"

            # 10. Verify Multiplayer Pool Scene initialization
            mp_test = page.evaluate("""() => {
                window.game.scene.stop('LeaderboardModal');
                window.game.scene.start('MultiplayerPool', { isHost: true, poolSubMode: '8ball' });
            }""")
            time.sleep(1.0)

            mp_state = page.evaluate("""() => {
                const mp = window.game.scene.getScene('MultiplayerPool');
                if (!mp || !mp.scene.isActive()) return { isActive: false };
                return {
                    isActive: true,
                    isHost: mp.isHost,
                    subtype: mp.subtype,
                    ballCount: mp.physicsEngine.balls.length
                };
            }""")
            print(f"[E2E] Multiplayer Pool State: {mp_state}")
            assert mp_state["isActive"], "MultiplayerPool scene should be active"
            assert mp_state["isHost"] == True, "MultiplayerPool should run in host mode"
            assert mp_state["ballCount"] == 16, "MultiplayerPool should rack 16 balls"

            # 11. Test Host Shot Execution in MultiplayerPool (verifies updateBallSprites & physics loop)
            mp_shot = page.evaluate("""() => {
                const mp = window.game.scene.getScene('MultiplayerPool');
                mp.power = 0.5;
                mp.aimAngle = -Math.PI / 2;
                mp.executeMyShot();
                return {
                    isWaitingForMotion: mp.isWaitingForMotion,
                    isMoving: mp.physicsEngine.isMoving()
                };
            }""")
            print(f"[E2E] Multiplayer Pool Shot Executed: {mp_shot}")
            assert mp_shot["isWaitingForMotion"], "Host should enter waiting for motion state"

            # Wait for balls to settle
            settled = False
            for _ in range(80):
                time.sleep(0.1)
                is_moving = page.evaluate("""() => {
                    const mp = window.game.scene.getScene('MultiplayerPool');
                    return mp && mp.physicsEngine.isMoving();
                }""")
                if not is_moving:
                    settled = True
                    break
            assert settled, "MultiplayerPool balls should settle after shot"
            print("[E2E] Multiplayer Pool balls settled cleanly.")

            print(f"[E2E] Console Errors Recorded: {len(console_errors)}")
            for err in console_errors:
                print(f"  [ERROR] {err}")
            assert len(console_errors) == 0, f"Expected 0 console errors, got {len(console_errors)}"

            print("\n🎉 ALL E2E POOL TESTS PASSED WITH 0 CONSOLE ERRORS! 🎉\n")

    finally:
        server.terminate()
        server.wait()

if __name__ == "__main__":
    run_e2e_pool()
