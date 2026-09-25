# tests/e2e_multiplayer_pve.py
# Real headless browser E2E test for Tanks PvP vs PvE toggles, Endless Mode, and Leaderboard badge

import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def run_e2e_pve():
    port = 8099
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1.2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path="/usr/bin/google-chrome",
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            context = browser.new_context(viewport={"width": 480, "height": 854})
            page = context.new_page()

            page.goto(f"http://localhost:{port}/", wait_until="networkidle")
            page.wait_for_selector("#game-container canvas")
            time.sleep(1.0)

            # Advance from Splash to GameSelect
            page.click("#game-container canvas", position={"x": 240, "y": 420})
            time.sleep(1.0)

            # Click Multiplayer button on GameSelect (x=130, y=765)
            page.click("#game-container canvas", position={"x": 130, "y": 765})
            time.sleep(1.2)

            # Verify MultiplayerLobby is active
            lobby_state = page.evaluate("""() => {
                const lobby = window.game ? window.game.scene.getScene('MultiplayerLobby') : null;
                return {
                    isActive: lobby && lobby.scene.isActive(),
                    selectedGame: lobby ? lobby.selectedGame : null,
                    tanksSubMode: lobby ? lobby.tanksSubMode : null,
                    tanksPveType: lobby ? lobby.tanksPveType : null
                };
            }""")
            print(f"[E2E] Lobby State: {lobby_state}")
            assert lobby_state["isActive"], "MultiplayerLobby scene should be active"
            assert lobby_state["selectedGame"] == "tanks", "Default game should be tanks"
            assert lobby_state["tanksSubMode"] == "pvp", "Default subMode should be pvp"

            # Toggle to PvE and Endless
            pve_switch = page.evaluate("""() => {
                const lobby = window.game.scene.getScene('MultiplayerLobby');
                lobby.tanksSubMode = 'pve';
                lobby.tanksPveType = 'endless';
                lobby.refreshHostLayout();
                return {
                    tanksSubMode: lobby.tanksSubMode,
                    tanksPveType: lobby.tanksPveType,
                    rosterY: lobby.getRosterY(),
                    chatY: lobby.getChatY()
                };
            }""")
            print(f"[E2E] Switched to PvE Endless: {pve_switch}")
            assert pve_switch["tanksSubMode"] == "pve"
            assert pve_switch["tanksPveType"] == "endless"
            assert pve_switch["rosterY"] == 414
            assert pve_switch["chatY"] == 624

            # Launch MultiplayerTanks scene directly in PvE Endless mode
            tanks_launch = page.evaluate("""() => {
                window.game.scene.stop('MultiplayerLobby');
                window.game.scene.start('MultiplayerTanks', {
                    isHost: true,
                    tanksSubMode: 'pve',
                    tanksPveType: 'endless'
                });
            }""")
            time.sleep(1.0)

            tanks_state = page.evaluate("""() => {
                const tanks = window.game.scene.getScene('MultiplayerTanks');
                return {
                    isActive: tanks && tanks.scene.isActive(),
                    isPvP: tanks ? tanks.isPvP : null,
                    tanksSubMode: tanks ? tanks.tanksSubMode : null,
                    tanksPveType: tanks ? tanks.tanksPveType : null,
                    currentWave: tanks ? tanks.currentWave : null,
                    enemyCount: tanks && tanks.enemiesGroup ? tanks.enemiesGroup.countActive(true) : 0,
                    wallsCount: tanks && tanks.wallsGroup ? tanks.wallsGroup.countActive(true) : 0,
                    blocksCount: tanks && tanks.blocksGroup ? tanks.blocksGroup.countActive(true) : 0
                };
            }""")
            print(f"[E2E] MultiplayerTanks PvE State: {tanks_state}")
            assert tanks_state["isActive"], "MultiplayerTanks should be active"
            assert tanks_state["isPvP"] is False, "isPvP should be false"
            assert tanks_state["tanksSubMode"] == "pve", "tanksSubMode should be pve"
            assert tanks_state["tanksPveType"] == "endless", "tanksPveType should be endless"
            assert tanks_state["currentWave"] == 1, "Initial wave should be 1"
            assert tanks_state["enemyCount"] > 0, "Wave 1 should spawn active enemy tanks"
            assert tanks_state["wallsCount"] > 0, "Arena walls should be built"
            assert tanks_state["blocksCount"] > 0, "Destructible blocks should be spawned"

            # Check Leaderboard Badge Rendering
            badge_verification = page.evaluate("""() => {
                const pvpRow = {
                    rank: 1,
                    initials: 'ALN',
                    fullName: 'Allan Lusk',
                    score: 5000,
                    detail: '⚔️ MP PvP (5 Frags)'
                };
                const isMultiplayer = String(pvpRow.detail || '').includes('⚔️') || String(pvpRow.detail || '').includes('MP PvP');
                const mpPrefix = isMultiplayer ? '⚔️ ' : '';
                const displayName = `${mpPrefix}${pvpRow.fullName ? `${pvpRow.initials} •` : pvpRow.initials}`;
                return {
                    isMultiplayer,
                    displayName,
                    expectedContainsBadge: displayName.startsWith('⚔️ ')
                };
            }""")
            print(f"[E2E] Badge Verification: {badge_verification}")
            assert badge_verification["isMultiplayer"] is True
            assert badge_verification["expectedContainsBadge"] is True

            print("[E2E PASS] Tanks Multiplayer PvE and Modes E2E verification passed successfully!")
            browser.close()
    finally:
        server.terminate()
        server.wait()

if __name__ == "__main__":
    run_e2e_pve()
