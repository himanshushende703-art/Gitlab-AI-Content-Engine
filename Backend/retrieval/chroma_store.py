"""
retrieval/chroma_store.py
--------------------------
This file implements the "Retrieval and Knowledge Layer" from the PRD
(section 6.2 / 7.2). This is what was completely missing before.

WHAT PROBLEM DOES THIS SOLVE?
Without this, the AI agents only ever see whatever raw text the user
pastes into the form. They have no memory of GitLab's style guide, past
documentation, or approved examples — so tone and terminology are
inconsistent every time.

With this: before drafting starts, we search a small local knowledge
base (style guides, sample docs, content templates) for anything
relevant to the current request, and hand those results to the
context_reader agent as extra grounding material.

WHAT IS CHROMA?
Chroma is a "vector database." Instead of searching text by exact
keyword match, it converts text into numbers (embeddings) that capture
meaning, so a search for "dark mode" can also find a doc that talks
about "theme switching" even without the exact words matching.
It runs locally — no signup, no API key, stores data in a folder on
your disk (backend/chroma_data/).
"""

import os

import chromadb

# UPDATED FOR DEPLOYMENT:
# Pehle yeh path hardcoded local folder tha, jo Render/Railway ke free
# tier par restart hote hi khaali ho jaata hai (ephemeral disk).
# Ab CHROMA_PATH env var se control hota hai — agar Render par
# Persistent Disk attach kiya hai to uska mount path yahan set karein
# (e.g. CHROMA_PATH=/var/data/chroma). Env var na ho to same default
# local folder use hoga jaisa pehle tha.
CHROMA_PATH = os.getenv(
    "CHROMA_PATH",
    os.path.join(os.path.dirname(__file__), "..", "chroma_data"),
)

_client = chromadb.PersistentClient(path=CHROMA_PATH)

# One collection holds everything: style guides, sample docs, templates.
# Each document is tagged with a "category" so we can filter later if needed.
_collection = _client.get_or_create_collection(name="gitlab_knowledge")


def add_documents(documents: list[str], ids: list[str], metadatas: list[dict]) -> None:
    """
    Adds documents to the knowledge base. Chroma automatically converts
    each document into an embedding using its built-in default model —
    no separate embedding API call or key needed.

    Uses `upsert` instead of `add` so re-running the ingest script never
    creates duplicate entries.
    """
    _collection.upsert(documents=documents, ids=ids, metadatas=metadatas)


def query_relevant(query_text: str, n_results: int = 3) -> list[dict]:
    """
    Searches the knowledge base for the most relevant chunks to a given
    query (usually the user's source_text). Returns a list of dicts:
        [{"content": "...", "source": "style_guides/voice.md", "category": "..."}]
    Returns an empty list if the knowledge base hasn't been populated yet
    (this is safe — the workflow still runs, just without extra grounding).
    """
    count = _collection.count()
    if count == 0:
        return []

    n_results = min(n_results, count)
    results = _collection.query(query_texts=[query_text], n_results=n_results)

    hits = []
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    for doc, meta in zip(documents, metadatas):
        hits.append(
            {
                "content": doc,
                "source": meta.get("source", "unknown"),
                "category": meta.get("category", "unknown"),
            }
        )
    return hits


def collection_count() -> int:
    return _collection.count()