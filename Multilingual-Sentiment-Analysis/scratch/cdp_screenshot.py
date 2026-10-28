"""
Capture pixel-perfect responsive screenshots using Chrome DevTools Protocol (CDP)
Supports arbitrary viewports with genuine mobile device emulation (Emulation.setDeviceMetricsOverride).
"""

import asyncio
import base64
import json
import os
import subprocess
import time
import urllib.request
import websockets

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9222

async def capture_url(url: str, output_path: str, width: int, height: int, mobile: bool = False):
    # 1. Start Edge with remote debugging
    user_data = os.path.abspath("scratch/cdp_profile")
    os.makedirs(user_data, exist_ok=True)
    
    proc = subprocess.Popen([
        EDGE_PATH,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={user_data}",
        "about:blank"
    ])
    
    try:
        # Wait for debugging port
        ws_url = None
        for _ in range(30):
            try:
                res = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=1)
                data = json.loads(res.read().decode("utf-8"))
                if data and len(data) > 0 and "webSocketDebuggerUrl" in data[0]:
                    ws_url = data[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                time.sleep(0.2)
                
        if not ws_url:
            raise RuntimeError("Could not connect to Edge DevTools port 9222")
            
        async with websockets.connect(ws_url) as ws:
            msg_id = 1
            
            async def send(method, params=None):
                nonlocal msg_id
                cid = msg_id
                msg_id += 1
                await ws.send(json.dumps({"id": cid, "method": method, "params": params or {}}))
                while True:
                    raw = await ws.recv()
                    res = json.loads(raw)
                    if res.get("id") == cid:
                        return res.get("result", {})

            # Enable Page
            await send("Page.enable")
            
            # Set exact device metrics
            await send("Emulation.setDeviceMetricsOverride", {
                "width": width,
                "height": height,
                "deviceScaleFactor": 1,
                "mobile": mobile,
                "fitWindow": False
            })
            
            # Navigate to target URL
            await send("Page.navigate", {"url": url})
            
            # Wait for DOM and network to settle
            await asyncio.sleep(2.0)
            
            # Capture screenshot
            snap = await send("Page.captureScreenshot", {"format": "png"})
            img_data = base64.b64decode(snap["data"])
            
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(img_data)
                
            print(f"Captured {output_path} ({width}x{height}, mobile={mobile}): {len(img_data)} bytes")
            
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    import sys
    url = sys.argv[1]
    out = sys.argv[2]
    w = int(sys.argv[3])
    h = int(sys.argv[4])
    m = sys.argv[5].lower() == "true" if len(sys.argv) > 5 else False
    asyncio.run(capture_url(url, out, w, h, m))
