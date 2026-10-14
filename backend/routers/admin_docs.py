"""Admin: the knowledge base. Upload files, type entries, change who can see them."""
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..config import settings
from ..deps import db, require_admin
from ..rag import ingest
from ..rag.embeddings import EmbeddingError
from ..schemas import Access, DocPatch, EntryIn

router = APIRouter(prefix="/api/admin/documents", tags=["admin: knowledge"], dependencies=[Depends(require_admin)])


def public_doc(d: dict, with_content: bool = False) -> dict:
    out = {
        "id": str(d["_id"]), "title": d["title"], "filename": d.get("filename"), "size": d.get("size", 0),
        "access": d["access"], "kind": d["kind"], "status": d["status"], "chunks": d.get("chunks", 0),
        "error": d.get("error"), "createdAt": d["createdAt"].isoformat(),
    }
    if with_content:
        out["content"] = d["content"]
    return out


def _get(database, doc_id: str) -> dict:
    try:
        doc = database.documents.find_one({"_id": ObjectId(doc_id)})
    except InvalidId:
        doc = None
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


def _friendly(exc: Exception) -> str:
    if isinstance(exc, ingest.IngestError):
        return str(exc)
    if isinstance(exc, EmbeddingError):
        return "The embedding service is busy or unavailable. Try again in a minute."
    return "Something went wrong while processing this file."


@router.get("")
def list_documents(database=Depends(db)):
    return {"documents": [public_doc(d) for d in database.documents.find().sort("createdAt", -1)]}


@router.post("", status_code=201)
def upload(files: list[UploadFile] = File(...), access: Access = Form("public"), database=Depends(db)):
    created, errors = [], []
    for f in files:
        name = f.filename or "file"
        data = f.file.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            errors.append({"file": name, "message": f"Over the {settings.max_upload_bytes // (1024 * 1024)} MB limit."})
            continue
        try:
            for entry in ingest.parse_upload(name, data, access):
                doc = ingest.create_document(
                    database, title=entry["title"], content=entry["content"], access=entry["access"],
                    kind="file", filename=name, size=len(data),
                )
                created.append(public_doc(doc))
        except Exception as exc:
            errors.append({"file": name, "message": _friendly(exc)})
    if not created and errors:
        raise HTTPException(422, {"errors": errors})
    return {"documents": created, "errors": errors}


@router.post("/entries", status_code=201)
def create_entry(body: EntryIn, database=Depends(db)):
    try:
        doc = ingest.create_document(database, title=body.title.strip(), content=body.content.strip(),
                                     access=body.access, kind="entry")
    except Exception as exc:
        raise HTTPException(422, {"errors": [{"file": body.title, "message": _friendly(exc)}]})
    return {"document": public_doc(doc)}


@router.get("/{doc_id}")
def get_document(doc_id: str, database=Depends(db)):
    return {"document": public_doc(_get(database, doc_id), with_content=True)}


@router.patch("/{doc_id}")
def patch_document(doc_id: str, body: DocPatch, database=Depends(db)):
    doc = _get(database, doc_id)
    text_changed = (body.title is not None and body.title != doc["title"]) or \
                   (body.content is not None and body.content != doc["content"])
    if text_changed:
        changes = {k: v for k, v in {"title": body.title, "content": body.content}.items() if v is not None}
        database.documents.update_one({"_id": doc["_id"]}, {"$set": changes})
        doc = {**doc, **changes}
        if body.access:
            doc["access"] = body.access
            database.documents.update_one({"_id": doc["_id"]}, {"$set": {"access": body.access}})
        try:
            doc = ingest.reindex_document(database, doc)
        except Exception as exc:
            database.documents.update_one({"_id": doc["_id"]}, {"$set": {"status": "failed", "error": _friendly(exc)}})
            raise HTTPException(422, {"errors": [{"file": doc["title"], "message": _friendly(exc)}]})
    elif body.access and body.access != doc["access"]:
        ingest.set_access(database, doc["_id"], body.access)
        doc = _get(database, doc_id)
    return {"document": public_doc(doc)}


@router.post("/{doc_id}/reindex")
def reindex(doc_id: str, database=Depends(db)):
    doc = _get(database, doc_id)
    try:
        return {"document": public_doc(ingest.reindex_document(database, doc))}
    except Exception as exc:
        raise HTTPException(422, {"errors": [{"file": doc["title"], "message": _friendly(exc)}]})


@router.delete("/{doc_id}")
def delete_document(doc_id: str, database=Depends(db)):
    doc = _get(database, doc_id)
    ingest.delete_document(database, doc["_id"])
    return {"ok": True}
