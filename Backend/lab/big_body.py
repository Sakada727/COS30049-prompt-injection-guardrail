"""
Writes lab/payloads/big_body.json: a 100 MB request body for the curl demo of defence 1
(denial of service). Git ignores it; delete it when you have finished recording.

Run from backend/:   python -m lab.big_body
"""
from pathlib import Path

MB = 100
OUT = Path(__file__).parent / "payloads" / "big_body.json"

# Valid JSON in the shape the API expects, just far too long: {"text": "aaaa...a"}
OUT.write_bytes(b'{"text": "' + b"a" * (MB * 1_000_000) + b'"}')
print(f"Wrote {OUT} ({OUT.stat().st_size / 1e6:.0f} MB)")
