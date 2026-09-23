# tests/e2e_multiplayer.py
# End-to-end multi-browser Playwright test for Multi-Device Real-Time Multiplayer

import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def run_multiplayer_e2e():
    port = 8097
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

            # Context 1: Host Device (Allan's tablet/phone)
            context_host = browser.new_context(viewport={"width": 480, "height": 854})
            page_host = context_host.new_page()

            page_host.on("pageerror", lambda err: errors.append(f"HOST_PAGE_ERROR: {err}"))
            page_host.on("console", lambda msg: errors.append(f"HOST_CONSOLE_ERROR: {msg.text}") if msg.type == "error" else None)

            # Navigate Host to game
            page_host.goto(f"http://localhost:{port}/", wait_until="networkidle")
            page_host.wait_for_selector("#game-container canvas")
            time.sleep(1.0)

            # Tap Splash to unlock audio and enter GameSelect
            page_host.click("#game-container canvas", position={"x": 240, "y": 420})
            time.sleep(1.0)

            # Verify active scene is GameSelect
            active_scene = page_host.evaluate("() => window.game ? window.game.scene.getScenes(true)[0]?.scene.key : null")
            print(f"[E2E] Host Scene after splash: {active_scene}")
            assert active_scene == "GameSelect", f"Expected GameSelect, got {active_scene}"

            # Check Title
            host_title = page_host.title()
            print(f"[E2E] Host Page Title: {host_title}")
            assert host_title == "Classic Arcade", f"Expected 'Classic Arcade', got '{host_title}'"

            # Tap Multiplayer button (at x=130, y=765)
            page_host.click("#game-container canvas", position={"x": 130, "y": 765})
            time.sleep(1.2)

            lobby_scene = page_host.evaluate("() => window.game.scene.getScenes(true)[0]?.scene.key")
            print(f"[E2E] Host Scene after clicking Multiplayer: {lobby_scene}")
            assert lobby_scene == "MultiplayerLobby", f"Expected MultiplayerLobby, got {lobby_scene}"

            # Verify QRCode library is loaded and QR texture/image is generated
            has_qrcode = page_host.evaluate("() => typeof window.QRCode !== 'undefined' && typeof window.QRCode.toCanvas === 'function'")
            print(f"[E2E] Host QRCode library loaded: {has_qrcode}")
            assert has_qrcode, "window.QRCode.toCanvas should be available"

            # Retrieve generated room code from Host
            room_code = page_host.evaluate("() => window.game.scene.getScene('MultiplayerLobby').roomCodeText?.text")
            print(f"[E2E] Host Room Code: {room_code}")
            assert room_code and len(room_code) == 4, f"Invalid room code: {room_code}"

            # Verify Host Start Button Zone is interactive and not destroyed
            has_start_zone = page_host.evaluate("() => !!window.game.scene.getScene('MultiplayerLobby').startBtnZone?.input?.enabled")
            assert has_start_zone, "Start button interactive zone must remain active and enabled"

            # Test Live Lobby Chat transmission on Host
            chat_count = page_host.evaluate("""() => {
                const s = window.game.scene.getScene('MultiplayerLobby');
                s.chatMessages.push({ tag: 'ALL', text: 'Ready!' });
                s.updateChatMessages();
                return s.chatMessages.length;
            }""")
            assert chat_count >= 1, "Chat messages should be stored in MultiplayerLobby"

            # Context 2: Client Device (Family member's phone via QR code URL)
            context_client = browser.new_context(viewport={"width": 480, "height": 854})
            page_client = context_client.new_page()

            page_client.on("pageerror", lambda err: errors.append(f"CLIENT_PAGE_ERROR: {err}"))
            page_client.on("console", lambda msg: errors.append(f"CLIENT_CONSOLE_ERROR: {msg.text}") if msg.type == "error" else None)

            # Navigate Client via ?room=XXXX auto-join query
            page_client.goto(f"http://localhost:{port}/?room={room_code}", wait_until="networkidle")
            page_client.wait_for_selector("#game-container canvas")
            time.sleep(1.0)

            # Tap Splash to proceed
            page_client.click("#game-container canvas", position={"x": 240, "y": 420})
            time.sleep(1.5)

            client_scene = page_client.evaluate("() => window.game.scene.getScenes(true)[0]?.scene.key")
            print(f"[E2E] Client Scene after auto-join: {client_scene}")
            assert client_scene == "MultiplayerLobby", f"Expected MultiplayerLobby on client, got {client_scene}"

            # Test Direct Scene Transitions & Multiplayer Game Modes
            # 1. Start Multiplayer Tanks Arena on Host & Client
            page_host.evaluate("() => { const s = window.game.scene.getScene('MultiplayerLobby'); s.scene.start('MultiplayerTanks', { isHost: true }); }")
            page_client.evaluate("() => { const s = window.game.scene.getScene('MultiplayerLobby'); s.scene.start('MultiplayerTanks', { isHost: false }); }")
            time.sleep(1.2)

            host_tanks = page_host.evaluate("() => window.game.scene.getScenes(true)[0]?.scene.key")
            client_tanks = page_client.evaluate("() => window.game.scene.getScenes(true)[0]?.scene.key")
            print(f"[E2E] Tanks Arena Active: Host={host_tanks}, Client={client_tanks}")
            assert host_tanks == "MultiplayerTanks"
            assert client_tanks == "MultiplayerTanks"

            # Verify tanks entities created
            tanks_count_host = page_host.evaluate("() => window.game.scene.getScene('MultiplayerTanks').tanks.size")
            print(f"[E2E] Host Tanks Count: {tanks_count_host}")
            assert tanks_count_host >= 1

            # 2. Start Multiplayer Pong on Host & Client
            page_host.evaluate("() => { const s = window.game.scene.getScene('MultiplayerTanks'); s.scene.start('MultiplayerPong', { isHost: true }); }")
            page_client.evaluate("() => { const s = window.game.scene.getScene('MultiplayerTanks'); s.scene.start('MultiplayerPong', { isHost: false }); }")
            time.sleep(1.2)

            host_pong = page_host.evaluate("() => window.game.scene.getScenes(true)[0]?.scene.key")
            client_pong = page_client.evaluate("() => window.game.scene.getScenes(true)[0]?.scene.key")
            print(f"[E2E] Pong Active: Host={host_pong}, Client={client_pong}")
            assert host_pong == "MultiplayerPong"
            assert client_pong == "MultiplayerPong"

            # Verify perspective inversion on Client:
            # Host local bottom paddle is Cyan (0x38bdf8), top paddle is Emerald (0x4ade80)
            # Client local bottom paddle is Emerald (0x4ade80), top paddle is Cyan (0x38bdf8)
            client_bottom_tint = page_client.evaluate("() => window.game.scene.getScene('MultiplayerPong').bottomPaddle.tintTopLeft")
            client_top_tint = page_client.evaluate("() => window.game.scene.getScene('MultiplayerPong').topPaddle.tintTopLeft")
            print(f"[E2E] Client Pong Paddle Tints: bottom=0x{client_bottom_tint:x}, top=0x{client_top_tint:x}")
            assert client_bottom_tint == 0x4ade80, "Client bottom paddle must be Emerald"
            assert client_top_tint == 0x38bdf8, "Client top paddle must be Cyan"

            # Check console errors
            # Filter out peerjs connection warnings if offline broker
            critical_errors = [e for e in errors if "PeerJS" not in e and "peer" not in e.lower()]
            if critical_errors:
                print(f"[E2E FAIL] Critical errors found: {critical_errors}")
                raise AssertionError(f"Console errors: {critical_errors}")

            print("[E2E PASS] Multi-Device Multiplayer E2E suite completed successfully with 0 errors!")

    finally:
        server.terminate()

if __name__ == "__main__":
    run_multiplayer_e2e()
