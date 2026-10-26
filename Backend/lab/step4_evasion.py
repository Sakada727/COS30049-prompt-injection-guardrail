
#Step 4 (advanced security, section 2.8): detection evasion.

import argparse
import statistics
import time

import numpy as np
import pandas as pd

from app.model.normalise import a2_normalize, prepare
from lab.common import TAB_DIR, A2Target, DirectTarget, HttpTarget, load_a2_csv
from lab.tricks import EXPECTED_FAILURES, NEW_TRICKS, TRICKS, disguise

SEEDS = range(5)
MAX_BASE_CHARS = 3500


def evasion_runs(name, blocked, base):
    rows = []
    for trick in TRICKS:
        for seed in SEEDS:
            disguised = [disguise(t, trick, seed=seed * 100_000 + i) for i, t in enumerate(base)]
            evaded = int((~blocked(disguised)).sum())
            rows.append({"condition": name, "trick": trick, "new_in_a3": trick in NEW_TRICKS,
                         "seed": seed, "n": len(base), "evaded": evaded, "evasion_rate": evaded / len(base)})
        print(f"  {name:14s} {trick:14s} {rows[-1]['evasion_rate']:6.1%}")
    return rows


def benign_cost(name, blocked, sets):
    return [{"condition": name, "set": s, "n": len(df), "benign_blocked": float(blocked(df["text"].tolist()).mean())}
            for s, df in sets.items()]


def normaliser_time(texts):
    rows = []
    for name, fn in [("A2 normaliser", a2_normalize), ("A3 normaliser", lambda t: prepare(t, enabled=True))]:
        start = time.perf_counter()
        for t in texts:
            fn(t)
        rows.append({"normaliser": name, "mean_ms_per_prompt": (time.perf_counter() - start) * 1000 / len(texts)})
    return rows


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default="direct")
    ap.add_argument("--label", default="after", choices=["before", "after"])
    args = ap.parse_args()

    main = load_a2_csv("dataset_main")
    test = main[main.split == "test"]
    attacks = test[(test.label == 1) & (test.text.str.len() <= MAX_BASE_CHARS)]["text"].tolist()
    benign = {"test benign": test[test.label == 0], "NotInject": load_a2_csv("test_notinject")}
    a3, a2 = DirectTarget(normalise=True), A2Target()
    caught = a3.blocked(attacks) & a2.blocked(attacks)
    base = [t for t, c in zip(attacks, caught) if c]
    print(f"Base set: {len(base)} of {len(attacks)} test injections blocked undisguised by both models")

    if args.target == "direct":
        conditions = {"no normaliser": DirectTarget(normalise=False).blocked, "A2 system": a2.blocked,
                      "A3 normaliser": a3.blocked}
        suffix = "direct"
    else:
        conditions = {f"API ({args.label})": HttpTarget(args.target).blocked}
        suffix = f"api_{args.label}"

    runs, cost = [], []
    for name, blocked in conditions.items():
        runs += evasion_runs(name, blocked, base)
        cost += benign_cost(name, blocked, benign)
    runs = pd.DataFrame(runs)
    runs.to_csv(TAB_DIR / f"evasion_runs_{suffix}.csv", index=False)
    summary = (runs.groupby(["trick", "new_in_a3", "condition"], sort=False)["evasion_rate"]
               .agg(mean="mean", sd="std", low="min", high="max").reset_index())
    summary.to_csv(TAB_DIR / f"evasion_summary_{suffix}.csv", index=False)
    cost = pd.DataFrame(cost)
    cost.to_csv(TAB_DIR / f"evasion_cost_{suffix}.csv", index=False)

    wide = summary.pivot_table(index=["trick", "new_in_a3"], columns="condition", values="mean", sort=False)
    print("\nMean evasion rate over 5 seeds\n" + (wide * 100).round(1).to_string())

    # The three rows of the README table: A2 tricks, new tricks, and the expected failure
    group = summary["trick"].map(lambda t: "expected failure (chunked)" if t in EXPECTED_FAILURES
                                 else "new in A3 (mean)" if t in NEW_TRICKS else "from A2 (mean)")
    groups = (summary.assign(group=group).groupby(["group", "condition"], sort=False)["mean"].mean()
              .unstack("condition"))
    groups.to_csv(TAB_DIR / f"evasion_groups_{suffix}.csv")
    print("\nREADME table, mean evasion rate (%)\n" + (groups * 100).round(1).to_string())
    print(f"Largest standard deviation across seeds: {summary['sd'].max() * 100:.1f} points")
    print("\nCost: genuine benign prompts blocked\n" + cost.round(4).to_string(index=False))
    if args.target == "direct":
        timing = pd.DataFrame(normaliser_time(test["text"].tolist()))
        timing.to_csv(TAB_DIR / "evasion_normaliser_time.csv", index=False)
        print("\n" + timing.round(3).to_string(index=False))
