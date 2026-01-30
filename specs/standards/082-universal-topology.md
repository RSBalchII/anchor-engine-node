# Universal Topology: Pointer-Based Architecture

**Status:** Implemented (v1.0) | **Topic:** Text vs. Numerical Unification

## 1. Core Philosophy: Physics over Philosophy
To achieve **Universal Data Analytics**, we distinguish between **Qualitative (Text)** and **Quantitative (Data)** atoms using a pointer-based system. We move from storing heavy content blobs to lightweight coordinate vectors.

## 2. The Universal Coordinate System
Every piece of data, whether prose or data, exists in physical space within a **Compound** (File).

### 2.1 The Compound (Container)
*   **ID:** `file_hash` (SimHash/MD5 of file)
*   **Path:** `C:/Projects/Data/production.csv`
*   **Role:** The immutable source of truth.

### 2.2 The Pointer (Coordinate)
Instead of duplicating text in the DB, we store the **Vector of Location**: `[Start_Byte, End_Byte]`.
*   **Retrieval:** The Engine uses `fseek` (or localized reads) to jump instantly to coordinates.

## 3. The Fork: Text vs. Numbers

### Path A: Textual Molecules (The Narrative)
*   **Input:** "The Dakota Access Pipeline increased pressure by 15%."
*   **Storage:** 
    *   **Atoms:** `#Dakota_Access_Pipeline`, `#Pressure`
    *   **Pointer:** `Bytes 500-550`
    *   **Content:** Stored as `String` (Cached) or fetched.
    *   **Properties:** `numeric_value: null`, `numeric_unit: null`
*   **Query:** Graph Traversal -> Pointer -> File Read.

### Path B: Numerical Molecules (The Metric)
*   **Input:** CSV Row `| 2024-01-01 | Well_592 | 1500 PSI |`
*   **Storage:**
    *   **Atoms:** `#Date`, `#Well_ID`, `#Pressure`
    *   **Pointer:** `Bytes 1024-1064`
    *   **Numeric Value:** `1500.0` (Stored for SQL-like math)
    *   **Unit:** `PSI`
*   **Query:** `SELECT * WHERE numeric_value > 1000`.

## 4. Database Schema (CozoDB)

> [!IMPORTANT]
> Numeric fields MUST be nullable (`Float?`, `String?`) to support the prose path without coercion errors.

```datalog
:create molecules {
    id: String,              # Unique ID (SimHash of sentence/row)
    compound_id: String,     # Link to parent file
    =>
    start_byte: Int,         # Coordinate Start
    end_byte: Int,           # Coordinate End
    type: String,            # 'prose', 'code', 'data'
    numeric_value: Float?,   # (Optional) For sorting/filtering. Null for prose.
    numeric_unit: String?    # (Optional) 'USD', 'PSI', 'CO2_Ton'. Null for prose.
}
```

## 5. Universal Query Example
*"Show me the profitability of wells with high injection pressure."*
1.  **AtomWalker:** Finds `#Profit` and `#Pressure`.
2.  **Numerical Query:** Scans `type='data'` for `#Pressure` > 1000.
3.  **Textual Query:** Scans `type='prose'` linked to `#Profit`.
4.  **Synthesis:** Combines hard stats with narrative context.
