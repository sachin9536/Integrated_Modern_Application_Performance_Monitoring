import asyncio
import aiohttp
import random
import time
import os
import platform
import logging
import json
from datetime import datetime
from typing import Dict, List

# Determine log directory: prefer /app/logs (Docker), fallback to ./logs (local)
LOG_DIR = "logs"
LOG_PATH = os.path.join(LOG_DIR, "metrics.log")

# Create logs directory if it doesn't exist
os.makedirs(LOG_DIR, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s',  # Only log the message (which will be JSON)
    handlers=[logging.FileHandler(LOG_PATH), logging.StreamHandler()]
)

def log_json(level, message, service=None, **kwargs):
    log_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "level": level,
        "service": service if service else "controller",
        "message": message,
    }
    log_data.update(kwargs)
    logging.info(json.dumps(log_data))

def truncate_log_file(log_path=LOG_PATH, max_size_mb=10, keep_lines=10000):
    import os
    if not os.path.exists(log_path):
        return
    size_mb = os.path.getsize(log_path) / (1024 * 1024)
    if size_mb > max_size_mb:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        lines = lines[-keep_lines:]
        with open(log_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print(f"[Log Rotation] Truncated {log_path} to last {keep_lines} lines (was {size_mb:.2f} MB)")

# Backend API URL for service discovery
MONITORING_ENGINE_URL = os.getenv("MONITORING_ENGINE_URL", "http://monitoring_engine:8000")

async def fetch_registered_services(session):
    try:
        async with session.get(f"{MONITORING_ENGINE_URL}/api/registered_services", timeout=10) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data.get("registered_services", [])
            else:
                log_json("ERROR", f"Failed to fetch registered services: {resp.status}")
                return []
    except Exception as e:
        log_json("ERROR", "Exception fetching registered services", error=str(e))
        return []

async def ping_service(session, service):
    url = service.get("url")
    name = service.get("name")
    for endpoint in ["/health", "/ping", "/"]:
        try:
            async with session.get(url.rstrip("/") + endpoint, timeout=5) as resp:
                log_json("INFO", f"Pinged {name} at {endpoint}", status=resp.status, service=name)
                return resp.status
        except Exception as e:
            continue
    log_json("ERROR", f"Failed to ping {name} at all known endpoints", service=name)
    return None

async def generate_traffic_for_service(session, service):
    name = service.get("name")
    url = service.get("url")
    # Try main endpoint
    try:
        start = time.time()
        async with session.get(url.rstrip("/") + "/", timeout=5) as resp:
            latency = (time.time() - start) * 1000
            log_json("INFO", f"Traffic: GET / for {name}", status=resp.status, endpoint="/", latency_ms=latency, service=name)
    except Exception as e:
        log_json("ERROR", f"Traffic: GET / failed for {name}", error=str(e), endpoint="/", service=name)
    # Try /health endpoint
    try:
        start = time.time()
        async with session.get(url.rstrip("/") + "/health", timeout=5) as resp:
            latency = (time.time() - start) * 1000
            log_json("INFO", f"Traffic: GET /health for {name}", status=resp.status, endpoint="/health", latency_ms=latency, service=name)
    except Exception as e:
        log_json("ERROR", f"Traffic: GET /health failed for {name}", error=str(e), endpoint="/health", service=name)
    # Try /metrics/ endpoint (with trailing slash)
    try:
        start = time.time()
        async with session.get(url.rstrip("/") + "/metrics/", timeout=5) as resp:
            latency = (time.time() - start) * 1000
            log_json("INFO", f"Traffic: GET /metrics/ for {name}", status=resp.status, endpoint="/metrics/", latency_ms=latency, service=name)
    except Exception as e:
        log_json("ERROR", f"Traffic: GET /metrics/ failed for {name}", error=str(e), endpoint="/metrics/", service=name)

async def main():
    request_rate = 5  # initial RPM
    increase_interval = 300
    start_time = time.time()
    async with aiohttp.ClientSession() as session:
        while True:
            truncate_log_file()  # Truncate log if needed before generating traffic
            services = await fetch_registered_services(session)
            if not services:
                log_json("WARNING", "No registered services found. Waiting...")
                await asyncio.sleep(10)
                continue
            tasks = [generate_traffic_for_service(session, svc) for svc in services]
            await asyncio.gather(*tasks)
            if time.time() - start_time > increase_interval:
                request_rate = int(request_rate * 1.2)
                start_time = time.time()
            await asyncio.sleep(60 / max(request_rate, 1))

if __name__ == "__main__":
    if platform.system() == "Emscripten":
        asyncio.ensure_future(main())
    else:
        asyncio.run(main())
