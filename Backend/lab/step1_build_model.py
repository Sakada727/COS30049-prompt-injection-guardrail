"""
Step 1: build the model the app serves.
Run from backend/:   python -m lab.step1_build_model
"""
import hashlib
import json

import joblib
import numpy as np
import pandas as pd
import scipy.sparse as sp
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score
from sklearn.svm import LinearSVC

from app.model.normalise import a2_normalize, prepare
from lab.common import MODEL_PATH, TAB_DIR, A2Target, a2_path, load_a2_csv, vectorise

SEED = 42
STRESS = ["test_obfuscated", "test_notinject", "test_temporal"]

# 1. Parity check
a2 = A2Target()
main = load_a2_csv("dataset_main")
rebuilt = vectorise(a2.word_vec, a2.char_vec, main["text"].map(a2_normalize))
reference = sp.load_npz(a2_path("data", "tfidf", "X_main.npz")).tocsr()
differing = abs(rebuilt - reference).nnz
print(f"1. Parity: {differing} of {reference.shape[0]} x {reference.shape[1]} cells differ from X_main.npz")
assert differing == 0, "app/model/normalise.py no longer matches the A2 normaliser"

# 2. Refit with the A2 settings (TFIDF.ipynb and SVM.ipynb) on prepare() text
main["clean"] = main["text"].map(lambda t: prepare(t, enabled=True))
train, val = main[main.split == "train"], main[main.split == "val"]
changed = int((main["clean"] != main["text"].map(a2_normalize)).sum())
print(f"2. A3 hardening changes {changed} of {len(main)} prompts ({changed / len(main):.1%}); refitting")
word_vec = TfidfVectorizer(analyzer="word", ngram_range=(1, 2), lowercase=True, min_df=2, max_df=0.95,
                           sublinear_tf=True, max_features=200_000, token_pattern=r"(?u)\b\w+\b",
                           dtype=np.float32).fit(train["clean"])
char_vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), lowercase=True, min_df=3,
                           sublinear_tf=True, max_features=300_000, dtype=np.float32).fit(train["clean"])
svm = LinearSVC(C=0.1, class_weight="balanced", max_iter=10_000, random_state=SEED)
svm.fit(vectorise(word_vec, char_vec, train["clean"]), train["label"])

# 3. Calibrate: fit a sigmoid that turns the SVM's distance from the boundary into a
# probability, on data the SVM never trained on. FrozenEstimator keeps the SVM unchanged.
model = CalibratedClassifierCV(FrozenEstimator(svm), method="sigmoid")
model.fit(vectorise(word_vec, char_vec, val["clean"]), val["label"])
bundle = {"word_vec": word_vec, "char_vec": char_vec, "model": model, "threshold": 0.5,
          "labels": {0: "allowed", 1: "blocked"}, "sklearn_version": sklearn.__version__,
          "normaliser": "app/model/normalise.py prepare()"}


def ece(y, p, bins=10):
    # Expected calibration error: average gap between confidence and accuracy, per confidence bin
    idx = np.minimum((p * bins).astype(int), bins - 1)
    return sum(abs(p[idx == b].mean() - y[idx == b].mean()) * (idx == b).mean()
               for b in range(bins) if (idx == b).any())


# 4. Compare with the A2 system
sets = {"val": val, "test": main[main.split == "test"], **{s: load_a2_csv(s) for s in STRESS}}
rows = []
for name, df in sets.items():
    y = df["label"].to_numpy()
    p = model.predict_proba(vectorise(word_vec, char_vec, [prepare(t, enabled=True) for t in df["text"]]))[:, 1]
    for system, pred in [("A2", a2.blocked(df["text"].tolist()).astype(int)), ("A3", (p >= 0.5).astype(int))]:
        rows.append({"set": name, "system": system, "n": len(y),
                     "accuracy": accuracy_score(y, pred),
                     "macro_f1": f1_score(y, pred, average="macro") if len(set(y)) > 1 else None,
                     "attack_recall": pred[y == 1].mean() if (y == 1).any() else None,
                     "benign_blocked": pred[y == 0].mean() if (y == 0).any() else None,
                     "brier": brier_score_loss(y, p) if system == "A3" else None,
                     "ece": ece(y, p) if system == "A3" else None})
table = pd.DataFrame(rows).round(4)
table.to_csv(TAB_DIR / "model_comparison.csv", index=False)
print("4. A2 vs A3 (A3 = refitted + calibrated):")
print(table.to_string(index=False))

MODEL_PATH.parent.mkdir(exist_ok=True)
joblib.dump(bundle, MODEL_PATH)
digest = hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
MODEL_PATH.with_suffix(".sha256").write_text(digest + "\n")
(TAB_DIR / "build_log.json").write_text(json.dumps(
    {"parity_cells_differing": differing, "prompts_changed_by_hardening": changed,
     "sklearn_version": sklearn.__version__, "sha256": digest}, indent=2))
print(f"Saved {MODEL_PATH.name} ({MODEL_PATH.stat().st_size / 1e6:.1f} MB), sha256 {digest[:16]}...")
