
from pathlib import Path

MB = 100
OUT = Path(__file__).parent / "payloads" / "big_body.json"

#Valid JSON in the shape the API expects, just far too long: {"text": "aaaa...a"}
OUT.write_bytes(b'{"text": "' + b"a" * (MB * 1_000_000) + b'"}')
print(f"Wrote {OUT} ({OUT.stat().st_size / 1e6:.0f} MB)")
