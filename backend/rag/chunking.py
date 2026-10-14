"""Split long text into overlapping, paragraph-aware chunks for embedding."""
import re

SIZE = 1400     # target characters per chunk (~250 words); keeps a typical entry in one piece
OVERLAP = 150   # characters repeated between chunks so facts aren't cut in half


def _split_long(paragraph: str, size: int) -> list[str]:
    parts, cur = [], ""
    for sentence in re.split(r"(?<=[.!?])\s+", paragraph):
        while len(sentence) > size:  # a single huge sentence: hard cut on a space
            cut = sentence.rfind(" ", 0, size)
            if cut <= 0:
                cut = size
            parts.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if cur and len(cur) + len(sentence) + 1 > size:
            parts.append(cur)
            cur = sentence
        else:
            cur = f"{cur} {sentence}".strip()
    if cur:
        parts.append(cur)
    return parts


def chunk_text(text: str, size: int = SIZE, overlap: int = OVERLAP) -> list[str]:
    text = re.sub(r"\r\n?", "\n", text).strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]

    units: list[str] = []
    for para in (p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()):
        units.extend([para] if len(para) <= size else _split_long(para, size))

    chunks: list[str] = []
    cur = ""
    for unit in units:
        if cur and len(cur) + len(unit) + 2 > size:
            chunks.append(cur)
            tail = cur[-overlap:]
            tail = tail[tail.find(" ") + 1:] if " " in tail else tail  # start on a word boundary
            cur = f"{tail}\n\n{unit}"
        else:
            cur = f"{cur}\n\n{unit}" if cur else unit
    if cur:
        chunks.append(cur)
    return chunks
