"""
vector_store.py

Wraps Chroma - the vector database used for real long-term memory search
(RAG). Every message that passes through the backend gets embedded and
stored here; a new message triggers a similarity search over everything
past, and the most relevant handful get woven into the prompt.

NOTE ON THE EMBEDDING MODEL: no embedding_function is passed below, so
Chroma uses its own free, bundled local model (all-MiniLM-L6-v2, run
via ONNX - no GPU, no API key, no per-message cost). The first time
this runs, Chroma downloads that model once (a few dozen MB) and caches
it - this needs a working internet connection for that one-time
download. See backend/README.md if that download fails.
"""

import chromadb

CHROMA_PATH = "./chroma_data"

_client = None
_collections: dict[str, object] = {}


def get_collection(user_id: str):
    """Each user gets their own collection - keeps memories from different
    accounts (e.g. if this is ever used by more than one person) from ever
    mixing, without needing a shared 'user_id' filter on every query."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
    if user_id not in _collections:
        safe_name = f"memories_{user_id}"[:63]  # Chroma collection names have a length limit
        _collections[user_id] = _client.get_or_create_collection(name=safe_name)
    return _collections[user_id]


def index_messages(collection, items: list[tuple[str, str, dict]]) -> None:
    """
    items: list of (id, text, metadata) tuples.
    Uses upsert, not add - re-indexing the same id overwrites rather than
    duplicates, which is what lets the rest of the app re-send the same
    message id repeatedly without worrying about it.
    """
    if not items:
        return
    ids = [str(i[0]) for i in items]
    documents = [i[1] for i in items]
    metadatas = [i[2] for i in items]
    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)


def query_relevant_memories(collection, query_text: str, exclude_ids: set[str], top_k: int = 5) -> list[dict]:
    """Returns up to top_k past messages most semantically similar to query_text,
    skipping anything already directly present elsewhere in the current prompt."""
    count = collection.count()
    if count == 0:
        return []

    fetch_n = min(top_k + len(exclude_ids), count)
    results = collection.query(query_texts=[query_text], n_results=fetch_n)

    ids = results.get("ids", [[]])[0]
    docs = results.get("documents", [[]])[0]

    relevant = [{"id": id_, "text": doc} for id_, doc in zip(ids, docs) if id_ not in exclude_ids]
    return relevant[:top_k]
