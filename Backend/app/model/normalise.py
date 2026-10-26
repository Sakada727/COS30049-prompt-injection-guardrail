"""
Text normalisation: runs on every input before the model sees it.

Two layers, applied in this order by prepare():
  harden()       A3 additions for disguises the A2 normaliser misses
                 (measured in lab/step4_evasion.py). Leaves ordinary text unchanged.
  a2_normalize() Copied unchanged from notebooks/TFIDF.ipynb in Assignment 2.
                 lab/step1_build_model.py proves the copy is exact by rebuilding
                 the A2 file X_main.npz from it.

harden() changes 1.4% of the training prompts (IPA symbols, @mentions, "A.C.L.U."), so
step 1 refits the model on prepare() text. Any change to this file means re-running
step 1, or prediction no longer matches training.
"""
import base64
import re
import unicodedata

# A2 normaliser (verbatim from TFIDF.ipynb)
HOMOGLYPHS = {
    # Cyrillic lowercase
    "а": "a", "в": "b", "с": "c", "ԁ": "d", "е": "e", "һ": "h", "і": "i",
    "ј": "j", "к": "k", "ӏ": "l", "м": "m", "н": "h", "о": "o", "р": "p",
    "ѕ": "s", "т": "t", "υ": "u", "ѵ": "v", "ԝ": "w", "х": "x", "у": "y",
    # Cyrillic uppercase
    "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "І": "I", "Ј": "J",
    "К": "K", "М": "M", "О": "O", "Р": "P", "Ѕ": "S", "Т": "T", "Х": "X",
    "У": "Y", "Ԁ": "D",
    # Greek
    "α": "a", "ο": "o", "ν": "v", "ρ": "p", "τ": "t", "ι": "i", "κ": "k",
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
    "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
}
HOMOGLYPH_TABLE = str.maketrans(HOMOGLYPHS)

INVISIBLE = re.compile(
    "[\u200b\u200c\u200d\u200e\u200f\u2060\u2061\u2062\u2063\u2064\ufeff\u00ad]"
)
B64_RE = re.compile(r"(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{16,}={0,2}(?![A-Za-z0-9+/=])")

# Leetspeak (1gnor3 -> ignore). Applied ONLY to a text that has several
# mixed letter+digit tokens, so normal text like "mp3" or "4k" is left alone.
LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t"})
LEET_TOKEN = re.compile(
    r"\b(?=[A-Za-z0-9]{1,15}\b)(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*[013457])[A-Za-z0-9]+\b"
)                                # {1,15}: long tokens (base64 blobs) are skipped
MIN_LEET_TOKENS = 3


def _fix_leet(text):
    if len(LEET_TOKEN.findall(text)) < MIN_LEET_TOKENS:
        return text
    return LEET_TOKEN.sub(lambda m: m.group(0).translate(LEET), text)


def _decode_b64_blobs(text):
    # Append decoded text of any base64 blobs (keeps the original too).
    parts = []
    for blob in B64_RE.findall(text):
        try:
            raw = base64.b64decode(blob + "=" * (-len(blob) % 4), validate=True).decode("utf-8")
        except Exception:
            continue
        if raw and sum(c.isprintable() or c.isspace() for c in raw) / len(raw) > 0.95:
            parts.append(raw)
    return (text + " " + " ".join(parts)) if parts else text


def a2_normalize(text):
    if not isinstance(text, str):
        return ""
    text = INVISIBLE.sub("", text)                    # 1. zero-width chars
    text = unicodedata.normalize("NFKC", text)        # 2. full-width -> ascii
    text = text.translate(HOMOGLYPH_TABLE)            # 3. Cyrillic/Greek lookalikes
    text = unicodedata.normalize("NFKD", text)        # 4. split accents off letters
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = _decode_b64_blobs(text)                    # 5. base64 -> text
    text = _fix_leet(text)                            # 6. leetspeak (after base64)
    return re.sub(r"\s+", " ", text).strip()


# A3 hardening. Each rule answers one disguise in attacks/tricks.py that got past A2.

# Invisible characters: instead of a list (which an attacker steps around), remove every
# "format" character (Unicode category Cf: zero-width, bidi controls, tag characters...)
# plus the other default-ignorable code points that render as nothing.
IGNORABLE_RANGES = [(0x034F, 0x034F), (0x115F, 0x1160), (0x17B4, 0x17B5), (0x180B, 0x180F),
                    (0x3164, 0x3164), (0xFE00, 0xFE0F), (0xFFA0, 0xFFA0), (0xE0100, 0xE01EF)]


def _is_invisible(ch):
    cp = ord(ch)
    return unicodedata.category(ch) == "Cf" or any(lo <= cp <= hi for lo, hi in IGNORABLE_RANGES)


# Look-alike letters. Latin variants are folded by reading the character's Unicode name
# ("LATIN LETTER SMALL CAPITAL R" -> r), which covers hundreds of characters without a list.
# Other scripts need a table (subset of Unicode TR39 confusables).
LATIN_NAME = re.compile(r"^LATIN (?:SMALL |CAPITAL )?LETTER (?:SMALL CAPITAL |DOTLESS |SCRIPT )?([A-Z])(?: WITH .+)?$")
EXTRA_LOOKALIKES = str.maketrans({
    "ɑ": "a", "ɩ": "i", "ς": "c",                                       # Latin alpha/iota, Greek
    "օ": "o", "ս": "u", "ո": "n", "հ": "h", "ց": "g", "զ": "q",           # Armenian
    "ҽ": "e", "ү": "y", "ѡ": "w", "ԛ": "q", "ԍ": "g", "ӏ": "l",           # Cyrillic
})


def _fold_letter(ch):
    if ch.isascii() or not ch.isalpha():
        return ch
    name = unicodedata.name(ch, "")
    m = LATIN_NAME.match(name)
    if not m:
        return ch.translate(EXTRA_LOOKALIKES)
    return m.group(1) if name.startswith("LATIN CAPITAL") else m.group(1).lower()


def _fold_lookalikes(text):
    # Fold every word when most letters are Latin or Latin look-alikes (English in disguise);
    # otherwise only words that mix Latin with other letters, so genuine Russian, Greek or
    # Armenian text is left alone.
    folded = [_fold_letter(c) for c in text]
    letters = [f for c, f in zip(text, folded) if c.isalpha()]
    if letters and sum(f.isascii() for f in letters) >= 0.5 * len(letters):
        return "".join(folded)
    words = re.split(r"(\s+)", text)
    return "".join("".join(map(_fold_letter, w)) if any(c.isascii() and c.isalpha() for c in w)
                   else w for w in words)


# Leetspeak with symbols (@||, !gnore, previou$). A word counts as leet if it is made of
# letters, digits and these symbols, contains a symbol, and is not a price like "$100".
# A final "!" stays punctuation. Like the A2 digit rule, only applied when the text has
# several such words, so "$100", "hi!" or one email address are left alone.
LEET_WORD = re.compile(r"[A-Za-z0-9@$!|€¡]+")
LEET_SYMBOL_MAP = str.maketrans({"@": "a", "$": "s", "!": "i", "|": "l", "€": "e", "¡": "i"})


def _leet_core(word):
    core = word.rstrip("!")
    has_symbol = any(c in "@$!|€¡" for c in core)
    is_number = core.strip("@$!|€¡").isdigit()
    return core if has_symbol and len(core) >= 2 and not is_number else None


def _fix_leet_symbols(text):
    if sum(_leet_core(w) is not None for w in LEET_WORD.findall(text)) < MIN_LEET_TOKENS:
        return text

    def fix(m):
        word, core = m.group(0), _leet_core(m.group(0))
        return word if core is None else core.translate(LEET_SYMBOL_MAP) + word[len(core):]
    return LEET_WORD.sub(fix, text)


# Letters split by the same separator each time ("i g n o r e", "i.g.n.o.r.e", "i, g, n"):
# three or more single letters in a row are joined back into one word. A different gap
# between words ("i g n o r e   a l l") keeps the words apart.
SPLIT_WORD = re.compile(r"(?<![A-Za-z])[A-Za-z](?P<sep>[ .,:;\-_*/+~|]{1,3})(?:[A-Za-z](?P=sep))+[A-Za-z](?![A-Za-z])")


def _join_split_letters(text):
    return SPLIT_WORD.sub(lambda m: m.group(0).replace(m.group("sep"), ""), text)


def harden(text):
    if not isinstance(text, str):
        return ""
    text = unicodedata.normalize("NFKC", text)                 # so the rules below see plain letters
    text = "".join(c for c in text if not _is_invisible(c))     # 1. every invisible character
    text = _fold_lookalikes(text)                               # 2. look-alike letters
    text = _join_split_letters(text)                            # 3. "i g n o r e" -> "ignore"
    return _fix_leet_symbols(text)                              # 4. @ $ ! | in place of letters


def prepare(text, enabled=None):
    """What the app runs on every input. enabled=None reads the demo switch from settings."""
    if enabled is None:
        from app.security.settings import get_settings
        enabled = not get_settings().demo_disable_normaliser
    if not enabled:                                   # DEMO ONLY: raw text reaches the model
        return text if isinstance(text, str) else ""
    return a2_normalize(harden(text))
