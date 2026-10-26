
#Step 3: denial of service.

import argparse
import asyncio
import base64
import os
import re
import statistics
import subprocess
import sys
import tempfile
import threading
import time
import uuid

import httpx
import numpy as np
import pandas as pd
import psutil

from lab.common import ROOT, TAB_DIR, DirectTarget, load_a2_csv

FLOOD_SIZE, FLOOD_REPS, BODY_REPS, BODY_MB = 100, 5, 3, 100
HEADERS = {"X-Session-ID": str(uuid.uuid4())}

# The servers step 3 starts: (mode, extra settings, also run the 100 MB body test).
# The body limit is the same middleware in both "after" servers, so it is tested once.
SERVERS = [
    ("before", {"PIG_DEMO_DISABLE_DOS_DEFENCE": "true", "PIG_INFERENCE_MODE": "thread"}, True),
    ("after: threads", {"PIG_INFERENCE_MODE": "thread"}, True),
    ("after: processes", {"PIG_INFERENCE_MODE": "process"}, False),
]


def crafted_inputs():
    test = load_a2_csv("dataset_main").query("split == 'test'")["text"]
    typical = test.iloc[(test.str.len() - test.str.len().median()).abs().argsort().iloc[0]]
    english = " ".join(test.tolist())[:8000]
    return {
        "typical prompt": typical,
        "8,000 chars of English": english,
        "8,000 chars of base64": base64.b64encode(english.encode()).decode()[:7996],
        "8,000 chars of @-symbol leet": " ".join(["@ll"] * 2000)[:8000],
        "8,000 chars of spaced letters": " ".join(english.replace(" ", "")[:4000]),
        "8,000 chars of CJK characters": "".join(chr(0x4E00 + (i * 7919) % 20000) for i in range(8000)),
    }


def measure_cost(inputs, reps=20):
    model = DirectTarget()
    rows = []
    for name, text in inputs.items():
        times = []
        for _ in range(reps):
            start = time.perf_counter()
            model.attack_probability([text])
            times.append((time.perf_counter() - start) * 1000)
        rows.append({"input": name, "chars": len(text), "median_ms": statistics.median(times),
                     "p95_ms": float(np.percentile(times, 95)), "max_ms": max(times)})
    return pd.DataFrame(rows).round(2)


class Probe:
    """Sends one request every `every` seconds in the background (a health check, or a normal
    user's prompt) and records the status and time of each, labelled with the phase it was sent in."""
    def __init__(self, client, typical=None, every=0.05):
        self.client, self.typical, self.every = client, typical, every
        self.samples, self.phase, self.stop = [], "baseline", asyncio.Event()

    async def run(self):
        while not self.stop.is_set():
            phase, start = self.phase, time.perf_counter()
            if self.typical is None:
                status = (await self.client.get("/api/health")).status_code
            else:
                status, _ = await timed_post(self.client, json={"text": self.typical})
            self.samples.append((phase, status, (time.perf_counter() - start) * 1000))
            await asyncio.sleep(self.every)


async def timed_post(client, content=None, json=None):
    start = time.perf_counter()
    try:
        r = await client.post("/api/check", content=content, json=json,
                              headers={**HEADERS, "Content-Type": "application/json"})
        status = r.status_code
    except httpx.HTTPError as e:
        status = type(e).__name__
    return status, (time.perf_counter() - start) * 1000


async def in_chunks(body, size=1_000_000):
    # Passing a generator makes httpx send "Transfer-Encoding: chunked" and no Content-Length
    for i in range(0, len(body), size):
        yield body[i:i + size]


async def body_attack(base_url, pid, rss_at_start, chunked):
    body = b'{"text": "' + b"a" * (BODY_MB * 1_000_000) + b'"}'
    peak, sampling = [rss_at_start or 0], True

    def sample():
        while sampling and pid:
            peak[0] = max(peak[0], psutil.Process(pid).memory_info().rss)
            time.sleep(0.01)
    threading.Thread(target=sample, daemon=True).start()
    async with httpx.AsyncClient(base_url=base_url, timeout=120) as client:
        probe = Probe(client)
        task = asyncio.create_task(probe.run())
        await asyncio.sleep(0.3)
        probe.phase = "attack"
        status, ms = await timed_post(client, content=in_chunks(body) if chunked else body)
        probe.stop.set()
        await task
    sampling = False
    during = [ms for phase, _, ms in probe.samples if phase == "attack"] or [0]
    return {"sent_as": "chunked, no Content-Length" if chunked else "with Content-Length",
            "status": status, "seconds": ms / 1000,
            # Python keeps freed memory, so measure the peak against the server's size at start
            "server_memory_peak_over_start_mb": (peak[0] - rss_at_start) / 1e6 if pid else None,
            "health_max_ms": max(during)}


async def flood(base_url, slow_text, typical):
    limits = httpx.Limits(max_connections=FLOOD_SIZE + 20)
    async with httpx.AsyncClient(base_url=base_url, timeout=120, limits=limits) as client:
        health, user = Probe(client), Probe(client, typical=typical, every=0.1)
        tasks = [asyncio.create_task(p.run()) for p in (health, user)]
        await asyncio.sleep(0.5)                                 # baseline before the flood
        health.phase = user.phase = "flood"
        start = time.perf_counter()
        results = await asyncio.gather(*[timed_post(client, json={"text": slow_text}) for _ in range(FLOOD_SIZE)])
        flood_s = time.perf_counter() - start
        health.phase = user.phase = "after"
        await asyncio.sleep(0.3)
        for p in (health, user):
            p.stop.set()
        await asyncio.gather(*tasks)
    statuses = [s for s, _ in results]
    h = [ms for phase, _, ms in health.samples if phase == "flood"]
    u = [(status, ms) for phase, status, ms in user.samples if phase == "flood"]
    samples = [("health", *s) for s in health.samples] + [("normal user", *s) for s in user.samples]
    return samples, {
        "answered_200": statuses.count(200), "refused_503": statuses.count(503),
        "other": len(statuses) - statuses.count(200) - statuses.count(503), "flood_seconds": flood_s,
        "health_checks": len(h), "health_median_ms": statistics.median(h), "health_max_ms": max(h),
        "user_requests": len(u), "user_refused": sum(s == 503 for s, _ in u),
        "user_median_ms": statistics.median(ms for _, ms in u), "user_max_ms": max(ms for _, ms in u)}


def start_harness(extra_env, tmp, port=8765):
    env = {**os.environ, "PIG_DEMO_DISABLE_DOS_DEFENCE": "false", **extra_env,
           "PIG_DATABASE_URL": f"sqlite:///{tmp}/dos.db"}
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "--factory", "lab.harness_app:create_app",
                             "--port", str(port), "--log-level", "error"], cwd=ROOT, env=env)
    for _ in range(300):
        try:
            if httpx.get(f"http://127.0.0.1:{port}/api/health").status_code == 200:
                return proc, f"http://127.0.0.1:{port}"
        except httpx.HTTPError:
            time.sleep(0.2)
    stop(proc)
    raise SystemExit("The stand-in app (lab/harness_app.py) did not start. Run step 1 first so models/guardrail.joblib exists.")


def stop(proc):
    # Stop the server and any worker processes it started (Windows does not stop them by itself)
    try:
        children = psutil.Process(proc.pid).children(recursive=True)
    except psutil.NoSuchProcess:
        children = []
    proc.terminate()
    proc.wait()
    _, still_running = psutil.wait_procs(children, timeout=5)    # give workers a moment to exit cleanly
    for child in still_running:
        try:
            child.terminate()
        except psutil.NoSuchProcess:
            pass
    psutil.wait_procs(still_running, timeout=10)


def server_memory_mb(pid):
    # The server plus any worker processes, so the cost of one model copy per process shows up
    if not pid:
        return None
    main = psutil.Process(pid)
    return sum(p.memory_info().rss for p in [main, *main.children(recursive=True)]) / 1e6


def attack_server(mode, base_url, pid, slow_text, typical, reps, body=True):
    body_rows, flood_rows, samples = [], [], []
    rss_at_start = psutil.Process(pid).memory_info().rss if pid else None
    memory_at_start = server_memory_mb(pid)
    for rep in range(min(reps, BODY_REPS) if body else 0):
        for chunked in (False, True):
            body_rows.append({"mode": mode, "rep": rep,
                              **asyncio.run(body_attack(base_url, pid, rss_at_start, chunked))})
    for rep in range(reps):
        s, summary = asyncio.run(flood(base_url, slow_text, typical))
        flood_rows.append({"mode": mode, "rep": rep, **summary, "server_memory_at_start_mb": memory_at_start})
        samples += [{"mode": mode, "rep": rep, "who": who, "phase": p, "status": st, "ms": ms}
                    for who, p, st, ms in s]
        time.sleep(1)
    return body_rows, flood_rows, samples


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default="direct")
    ap.add_argument("--label", default="after", help="name for this run, e.g. before, after-threads")
    ap.add_argument("--reps", type=int, default=FLOOD_REPS)
    args = ap.parse_args()

    inputs = crafted_inputs()
    cost = measure_cost(inputs)
    cost.to_csv(TAB_DIR / "dos_cost.csv", index=False)
    print("3a. Time per prediction (in-process, 20 runs each)\n" + cost.to_string(index=False))
    slowest = cost.iloc[1:].sort_values("median_ms").iloc[-1]["input"]
    ratio = cost.set_index("input").loc[slowest, "median_ms"] / cost.iloc[0]["median_ms"]
    print(f"Flood input: {slowest}, which costs {ratio:.1f}x a typical prompt")

    results = []
    if args.target == "direct":
        with tempfile.TemporaryDirectory() as tmp:
            for mode, extra_env, body in SERVERS:
                print(f"\nAttacking the stand-in server: {mode}")
                proc, url = start_harness(extra_env, tmp)
                try:
                    results.append(attack_server(mode, url, proc.pid, inputs[slowest], inputs["typical prompt"],
                                                 args.reps, body))
                finally:
                    stop(proc)
        suffix = "harness"
    else:
        results.append(attack_server(args.label, args.target, None, inputs[slowest], inputs["typical prompt"], args.reps))
        suffix = "api_" + re.sub(r"[^A-Za-z0-9_-]+", "_", args.label)

    body, floods, samples = (pd.DataFrame(sum((r[i] for r in results), [])) for i in range(3))
    body.to_csv(TAB_DIR / f"dos_body_{suffix}.csv", index=False)
    floods.to_csv(TAB_DIR / f"dos_flood_{suffix}.csv", index=False)
    samples.to_csv(TAB_DIR / f"dos_samples_{suffix}.csv", index=False)
    pd.set_option("display.width", 200)
    print(f"\n3b. One {BODY_MB} MB request, with and without Content-Length\n" + body.round(2).to_string(index=False))
    print(f"\n3c. Flood of {FLOOD_SIZE} requests\n" + floods.round(1).to_string(index=False))

    # The same results as lowest-to-highest ranges per server, ready for the README table
    def span(col, digits=0):
        return lambda g: f"{g[col].min():,.{digits}f} to {g[col].max():,.{digits}f}"
    summary = pd.DataFrame([{
        "mode": mode,
        "answered": span("answered_200")(g), "refused_503": span("refused_503")(g),
        "flood_s": span("flood_seconds", 1)(g), "health_max_ms": span("health_max_ms")(g),
        "user_median_ms": span("user_median_ms")(g), "user_max_ms": span("user_max_ms")(g),
        "user_refused": f"{g['user_refused'].sum()} of {g['user_requests'].sum()}",
        "server_mb": "n/a" if g["server_memory_at_start_mb"].isna().all() else f"{g['server_memory_at_start_mb'].iloc[0]:,.0f}",
    } for mode, g in floods.groupby("mode", sort=False)])
    summary.to_csv(TAB_DIR / f"dos_summary_{suffix}.csv", index=False)
    print(f"\nREADME table (ranges over {args.reps} floods; server_mb = server memory at start)\n"
          + summary.to_string(index=False))
