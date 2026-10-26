
#Step 5: figures for the README and the video, drawn from the CSVs steps 3 and 4 wrote.

import matplotlib
import matplotlib.ticker
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from lab.common import FIG_DIR, TAB_DIR
from lab.step3_dos import FLOOD_SIZE
from lab.tricks import EXPECTED_FAILURES

SURFACE, INK, INK2, MUTED, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#898781", "#e1e0d9"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a"]          # categorical slots 1-3, fixed order
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "axes.edgecolor": GRID,
                     "axes.labelcolor": INK2, "xtick.color": MUTED, "ytick.color": INK2,
                     "figure.facecolor": SURFACE, "axes.facecolor": SURFACE})


def style(ax):
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.tick_params(length=0)


def fig_evasion():
    s = pd.read_csv(TAB_DIR / "evasion_summary_direct.csv")
    conditions = ["no normaliser", "A2 system", "A3 normaliser"]
    labels = {"no normaliser": "No normaliser (before)", "A2 system": "A2 system",
              "A3 normaliser": "A3 normaliser (after)"}
    tricks = list(dict.fromkeys(s["trick"]))
    n_a2 = int((~s.drop_duplicates("trick")["new_in_a3"]).sum())
    rows_y = [i + 1 if i < n_a2 else i + 2 for i in range(len(tricks))]   # room for two headers
    fig, ax = plt.subplots(figsize=(7.5, 7.6), dpi=200)
    bar_h = 0.26
    for i, trick in enumerate(tricks):
        for j, c in enumerate(conditions):
            row = s[(s.trick == trick) & (s.condition == c)].iloc[0]
            y = rows_y[i] + (j - 1) * bar_h
            ax.barh(y, row["mean"] * 100, height=bar_h, color=SERIES[j], edgecolor=SURFACE, linewidth=1.5,
                    label=labels[c] if i == 0 else None)
            if c == "A3 normaliser":                       # label only the headline series
                ax.text(row["mean"] * 100 + 1.2, y, f"{row['mean']:.1%}", va="center", fontsize=7.5, color=INK2)
    names = [f"{t}  (expected failure)" if t in EXPECTED_FAILURES else t for t in tricks]
    ax.set_yticks(rows_y, names)
    ax.invert_yaxis()
    for y, header in [(0.25, "Tricks from A2"), (n_a2 + 1.25, "New variations tested in A3")]:
        ax.text(-0.01, y, header, transform=ax.get_yaxis_transform(), ha="right", va="center",
                fontsize=9, color=INK, fontweight="bold")
    ax.set_ylim(len(tricks) + 1.6, -0.3)
    ax.set_xlim(0, 108)
    ax.set_xticks(range(0, 101, 25), [f"{v}%" for v in range(0, 101, 25)])
    ax.xaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_xlabel("Disguised injections that get through (mean of 5 seeds)")
    style(ax)
    n = int(pd.read_csv(TAB_DIR / "evasion_runs_direct.csv")["n"].iloc[0])
    fig.suptitle("Evasion rate by disguise", x=0.02, ha="left", fontsize=12, color=INK, fontweight="bold")
    ax.set_title(f"{n} test-set injections, each blocked when undisguised", loc="left", fontsize=9, color=INK2)
    ax.legend(loc="lower center", bbox_to_anchor=(0.45, -0.16), ncol=3, frameon=False, fontsize=8)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "fig1_evasion.png", facecolor=SURFACE)
    plt.close(fig)


MODE_LABELS = {"before": "Defence off (before)", "after": "Defence on (after)",
               "after: threads": "Defence on, threads", "after: processes": "Defence on, processes"}


def fig_dos():
    samples = pd.read_csv(TAB_DIR / "dos_samples_harness.csv").query("phase == 'flood'")
    floods = pd.read_csv(TAB_DIR / "dos_flood_harness.csv")
    modes = list(dict.fromkeys(floods["mode"]))                 # in the order step 3 ran them
    n = len(modes)
    width = 0.78 / n                                             # space for each mode inside a group
    fig, (left, right) = plt.subplots(1, 2, figsize=(8.8, 4.4), dpi=200, gridspec_kw={"width_ratios": [1.6, 1]})
    rng = np.random.default_rng(0)
    hollow_shown = False
    for g, who in enumerate(["health", "normal user"]):
        for j, mode in enumerate(modes):
            rows = samples[(samples.who == who) & (samples["mode"] == mode)]
            ms, refused = rows["ms"].to_numpy(), (rows["status"].astype(str) == "503").to_numpy()
            centre = g + (j - (n - 1) / 2) * width
            x = centre + rng.uniform(-width * 0.2, width * 0.2, len(ms))
            left.scatter(x[~refused], ms[~refused], s=22, color=SERIES[j], edgecolor=SURFACE, linewidth=1.1,
                         zorder=3, label=MODE_LABELS.get(mode, mode) if g == 0 else None)
            if refused.any():
                left.scatter(x[refused], ms[refused], s=22, facecolor=SURFACE, edgecolor=SERIES[j], linewidth=1.3,
                             zorder=3, label=None if hollow_shown else "Hollow = refused with 503")
                hollow_shown = True
            med = np.median(ms)
            left.hlines(med, centre - width * 0.32, centre + width * 0.32, color=INK, linewidth=1.5, zorder=4)
            left.text(centre + width * 0.34, med, f"{med:,.0f}", ha="left", va="center", fontsize=6.5, color=INK,
                      zorder=5, bbox={"boxstyle": "round,pad=0.15", "fc": SURFACE, "ec": "none", "alpha": 0.85})
    left.set_yscale("log")
    left.yaxis.set_minor_locator(matplotlib.ticker.NullLocator())
    left.set_ylim(1, 10000)
    left.set_yticks([10, 100, 1000], ["10 ms", "100 ms", "1 s"])
    left.set_xticks([0, 1], ["Health check", "Normal user's prompt"])
    left.yaxis.grid(True, color=GRID, linewidth=0.8)
    left.set_axisbelow(True)
    left.set_title("Wait during the flood (line and number = median, ms)", loc="left", fontsize=9, color=INK2)
    left.legend(loc="upper center", bbox_to_anchor=(0.5, -0.1), ncol=2, frameon=False, fontsize=7.5)
    style(left)

    answered = [floods[floods["mode"] == m]["answered_200"].mean() for m in modes]
    refused = [floods[floods["mode"] == m]["refused_503"].mean() for m in modes]
    y = list(range(n))
    right.barh(y, answered, height=0.42, color=INK2, edgecolor=SURFACE, linewidth=1.5, label="Answered (200)")
    right.barh(y, refused, left=answered, height=0.42, color=GRID, edgecolor=SURFACE, linewidth=1.5,
               label="Refused at once (503)")
    for i in y:
        right.text(answered[i] / 2, i, f"{answered[i]:.0f}", ha="center", va="center", fontsize=8, color="white")
        if refused[i] >= 8:
            right.text(answered[i] + refused[i] / 2, i, f"{refused[i]:.0f}", ha="center", va="center", fontsize=8, color=INK)
    right.set_yticks(y, [MODE_LABELS.get(m, m).replace(" (before)", "").replace(", ", ",\n") for m in modes])
    right.invert_yaxis()
    right.set_xlim(0, 100)
    right.set_xticks([0, 50, 100])
    right.set_title(f"The {FLOOD_SIZE} flood requests (mean of {floods['rep'].nunique()})", loc="left",
                    fontsize=9, color=INK2)
    right.legend(loc="upper center", bbox_to_anchor=(0.5, -0.1), ncol=1, frameon=False, fontsize=8)
    style(right)
    fig.suptitle("Flood of 100 slow requests: freeze vs refuse", x=0.02, ha="left", fontsize=12,
                 color=INK, fontweight="bold")
    fig.tight_layout()
    fig.savefig(FIG_DIR / "fig2_dos_flood.png", facecolor=SURFACE)
    plt.close(fig)


if __name__ == "__main__":
    fig_evasion()
    fig_dos()
    print("Saved", ", ".join(p.name for p in sorted(FIG_DIR.glob("fig*.png"))))
