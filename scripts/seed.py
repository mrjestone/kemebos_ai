"""Load the sample knowledge into MongoDB (embeds it with Gemini).

    python -m scripts.seed            # add entries that are missing
    python -m scripts.seed --reset    # delete all seed entries first, then reload

Also creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD.
"""
import json
import sys
from pathlib import Path

from pymongo.operations import SearchIndexModel

from backend.config import settings
from backend.db import ensure_admin, ensure_indexes, get_db
from backend.rag import ingest, store

DATA = Path(__file__).resolve().parent.parent / "data" / "knowledge.json"


def ensure_vector_index(db) -> None:
    """Create the Atlas Vector Search index (embedding + access filter) if it doesn't exist.
    Atlas builds it in about a minute; until then searches use the built-in fallback."""
    if "chunks" not in db.list_collection_names():
        db.create_collection("chunks")
    if any(i["name"] == store.VECTOR_INDEX for i in db.chunks.list_search_indexes()):
        print(f"Vector index '{store.VECTOR_INDEX}' already exists.")
        return
    db.chunks.create_search_index(SearchIndexModel(
        definition=store.vector_index_definition(settings.embed_dims), name=store.VECTOR_INDEX, type="vectorSearch"))
    print(f"Created vector index '{store.VECTOR_INDEX}' ({settings.embed_dims} dims, cosine, filter: access).")


def main(reset: bool = False) -> None:
    db = get_db()
    ensure_indexes(db)
    ensure_admin(db)

    if reset:
        for doc in db.documents.find({"kind": "seed"}):
            ingest.delete_document(db, doc["_id"])
        print("Removed existing seed entries.")

    ensure_vector_index(db)

    entries = json.loads(DATA.read_text(encoding="utf-8"))["entries"]
    existing = {d["title"] for d in db.documents.find({"kind": "seed"}, {"title": 1})}
    added = 0
    for e in entries:
        if e["title"] in existing:
            continue
        doc = ingest.create_document(db, title=e["title"], content=e["content"], access=e["access"], kind="seed")
        print(f"  + {e['title']:34} {e['access']:8} {doc['chunks']} chunk(s)")
        added += 1
    print(f"Done. {added} added, {len(entries) - added} already present.")


if __name__ == "__main__":
    main(reset="--reset" in sys.argv)
