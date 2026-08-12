"""
retrieval/ingest_knowledge.py
-------------------------------
Run this file whenever you add or change files in the top-level `data/`
folder (style guides, sample docs, content templates). It reads those
files and loads them into Chroma so the AI agents can retrieve them.

HOW TO RUN THIS:
    cd backend
    python -m retrieval.ingest_knowledge

You should re-run this any time someone on your team adds a new style
guide, sample doc, or template to the `data/` folder.
"""

import glob
import os

from retrieval.chroma_store import add_documents

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


def _chunk_text(text: str, max_chars: int = 1200) -> list[str]:
    """
    Splits a long document into smaller chunks. Chunking matters because
    retrieval works better over focused pieces of text rather than one
    giant document — it keeps search results specific and relevant.
    Splits on blank lines (paragraphs) first, then packs them up to
    max_chars per chunk.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks, current = [], ""
    for p in paragraphs:
        if len(current) + len(p) > max_chars and current:
            chunks.append(current.strip())
            current = ""
        current += p + "\n\n"
    if current.strip():
        chunks.append(current.strip())
    return chunks or [text]


def ingest_folder(folder_name: str, category: str) -> int:
    folder_path = os.path.join(DATA_DIR, folder_name)
    if not os.path.isdir(folder_path):
        return 0

    documents, ids, metadatas = [], [], []
    files = glob.glob(os.path.join(folder_path, "*.md")) + glob.glob(
        os.path.join(folder_path, "*.txt")
    )

    for filepath in files:
        filename = os.path.basename(filepath)
        with open(filepath, "r", encoding="utf-8") as f:
            text = f.read()

        for i, chunk in enumerate(_chunk_text(text)):
            documents.append(chunk)
            ids.append(f"{category}:{filename}:{i}")
            metadatas.append({"source": f"{folder_name}/{filename}", "category": category})

    if documents:
        add_documents(documents=documents, ids=ids, metadatas=metadatas)

    return len(documents)


def main():
    total = 0
    total += ingest_folder("style_guides", "style_guide")
    total += ingest_folder("sample_docs", "sample_doc")
    total += ingest_folder("content_templates", "content_template")

    print(f"Ingested {total} chunks into the Chroma knowledge base.")
    if total == 0:
        print(
            "No files found. Add .md files to data/style_guides, "
            "data/sample_docs, or data/content_templates and re-run this script."
        )


if __name__ == "__main__":
    main()
