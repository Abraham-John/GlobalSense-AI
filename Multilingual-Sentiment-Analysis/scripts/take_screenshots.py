"""
Take true responsive screenshots via Chrome DevTools Protocol (CDP)
at breakpoints: 1920, 1440, 1280, 1024, 820, 390 px.
"""

import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path
import websockets

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = ROOT_DIR / "docs" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not os.path.exists(EDGE_PATH):
    EDGE_PATH = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

BREAKPOINTS = [1920, 1440, 1280, 1024, 820, 390]
TARGET_URL = "http://127.0.0.1:5173"
DEBUG_PORT = 9222


async def capture_cdp_screenshots():
    print(f"Target URL: {TARGET_URL}")
    print(f"Edge Path:  {EDGE_PATH}")
    print(f"Output Dir: {SCREENSHOT_DIR}")
    print("-" * 50)

    # Launch Edge with remote debugging
    cmd = [
        EDGE_PATH,
        "--headless=new",
        f"--remote-debugging-port={DEBUG_PORT}",
        "--no-sandbox",
        "--disable-gpu",
        "--window-size=1920,1080",
        TARGET_URL,
    ]
    proc = subprocess.Popen(cmd)
    await asyncio.sleep(2.5)

    try:
        # Get WebSocket debugger URL
        with urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json") as resp:
            tabs = json.loads(resp.read().decode())
            ws_url = tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=20 * 1024 * 1024) as ws:
            msg_id = 1

            async def send_cmd(method, params=None):
                nonlocal msg_id
                cid = msg_id
                msg_id += 1
                await ws.send(json.dumps({"id": cid, "method": method, "params": params or {}}))
                while True:
                    resp = json.loads(await ws.recv())
                    if resp.get("id") == cid:
                        return resp.get("result", {})

            # Navigate to target
            await send_cmd("Page.enable")
            await send_cmd("Page.navigate", {"url": TARGET_URL})
            await asyncio.sleep(2.0)

            for width in BREAKPOINTS:
                height = 1080 if width >= 1024 else 844
                is_mobile = width < 640

                # Set Device Metrics
                await send_cmd(
                    "Emulation.setDeviceMetricsOverride",
                    {
                        "width": width,
                        "height": height,
                        "deviceScaleFactor": 1,
                        "mobile": is_mobile,
                        "screenOrientation": {"angle": 0, "type": "portraitPrimary"},
                    },
                )
                await asyncio.sleep(1.0)

                # Capture Screenshot
                out_file = SCREENSHOT_DIR / f"header_{width}.png"
                print(f"Capturing {width}x{height} (mobile={is_mobile}) -> {out_file.name}...")
                snap = await send_cmd(
                    "Page.captureScreenshot",
                    {
                        "format": "png",
                        "clip": {"x": 0, "y": 0, "width": width, "height": min(height, 800), "scale": 1},
                    },
                )
                if "data" in snap:
                    img_bytes = base64.b64decode(snap["data"])
                    out_file.write_bytes(img_bytes)
                    print(f"  [OK] Saved ({len(img_bytes) // 1024} KB)")
                else:
                    print(f"  [FAIL] Failed to capture {width}px")

    finally:
        proc.terminate()
        print("-" * 50)
        print("CDP Screenshot capture complete.")


if __name__ == "__main__":
    asyncio.run(capture_cdp_screenshots())
