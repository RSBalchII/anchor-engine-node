# Atomic Taxonomy (V4) & Universal Data API

**Status:** Active | **Authority:** System Core

## 1. Abstract
This standard defines the **Atomic Taxonomy** (V4), replacing the legacy Chunk-based data topology with a granular structure comprising **Compounds**, **Molecules**, and **Atoms**. This shift enables the **Universal Data API**, allowing for precise, sentence-level retrieval and manipulation of enhanced context.

## 2. The Atomic Taxonomy
Data is no longer stored as arbitrary "chunks" but as structured chemical entities.

### 2.1 Compounds (Type: `file`)
*   **Definition:** The storable substance. Equivalent to a file or a complete document.
*   **Role:** The container for all constituent elements.
*   **Properties:**
    *   `compound_body`: The full text content.
    *   `molecular_signature`: SimHash of the entire content (for file-level deduplication).
*   **Analogy:** A "Page" in a book.

### 2.2 Molecules (Type: `fragment`)
*   **Definition:** The logical arrangement of atoms. Equivalent to a **sentence** or a discrete thought.
*   **Role:** The fundamental unit of retrieval (`Universal Data API`).
*   **Properties:**
    *   `content`: The sentence text.
    *   `sequence`: Positional index within the Compound.
    *   `tags`: Derived concepts.
*   **Granularity:** Retrieval targets Molecules, not Compounds. This reduces context window pollution (e.g., retrieving just the relevant function definition, not the whole file).

### 2.3 Atoms (Type: `concept`)
*   **Definition:** The fundamental unit of meaning. Equivalent to a keyword, entity, or tag.
*   **Role:** The connective tissue (Edges/Vertices) that links Molecules.
*   **Examples:** `#Project:ECE`, `#SimHash`, `IngestionService`.

## 3. The Universal Data API
By storing data as Molecules, we unlock a "Universal Data API."

*   **Query:** "How does SimHash work?"
*   **Legacy Result:** Returns the entire `refiner.ts` file (2000 lines).
*   **Universal API Result:** Returns 3 specific Molecules (Sentences) from `refiner.ts` that explain SimHash, plus 2 Molecules from `README.md`.
*   **Benefit:** 
    *   **High Signal/Noise Ratio:** 95%+ relevant content in context window.
    *   **Precision:** exact answers without hallucination.

## 4. Migration Guide (Legacy to V4)
*   **Refiner** → **AtomizerService**
*   **SimHash** → **Molecular Signature**
*   **Chunk** → **Molecule**

## 5. Persistence Strategy
*   **Table `compounds`**: Stores full file bodies (for reconstruction).
*   **Table `molecules`** (formerly `memory` fragment rows): Stores searchable sentences.
*   **Table `atoms`**: Stores global entities.
