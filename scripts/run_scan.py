#!/usr/bin/env python3
"""
Standalone scan script — run with sudo to allow nmap OS detection and SYN scans.

Usage (from the backend/ directory):
    sudo ../scripts/run_scan.py 192.168.1.0/24
    sudo ../scripts/run_scan.py 192.168.1.0/24 10.0.0.0/24

Results are written directly to the database and appear as Pending Devices
in the Homelable UI. The backend does not need to be restarted.
"""
import asyncio
import sys
from pathlib import Path

# Make sure app/ is importable
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.db.database import AsyncSessionLocal, init_db
from app.db.models import ScanRun
from app.services.scanner import run_scan


async def main(ranges: list[str]) -> None:
    await init_db()
    async with AsyncSessionLocal() as db:
        run = ScanRun(status="running", ranges=ranges)
        db.add(run)
        await db.commit()
        await db.refresh(run)
        print(f"Scan started (id={run.id}) for ranges: {', '.join(ranges)}")

    await run_scan(ranges, db, run.id)

    async with AsyncSessionLocal() as db:
        run = await db.get(ScanRun, run.id)
        if run:
            print(f"Scan {run.status} — {run.devices_found} device(s) found")
            if run.error:
                print(f"Error: {run.error}", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: sudo python scripts/run_scan.py <cidr> [<cidr> ...]")
        print("Example: sudo python scripts/run_scan.py 192.168.1.0/24")
        sys.exit(1)

    ranges = sys.argv[1:]
    asyncio.run(main(ranges))
