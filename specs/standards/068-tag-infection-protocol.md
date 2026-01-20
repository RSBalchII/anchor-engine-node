# Standard 068: Tag Infection Protocol (Weak Supervision)

**Status:** Active
**Context:** High-Volume Data Tagging (1M+ Atoms) on Consumer Hardware.

## 1. The Problem: The "GPU Bottleneck"
Running a Large Language Model (LLM) or even a BERT embedding model on 1 million atoms takes days of GPU time and terabytes of VRAM/Compute.
* **Cost:** ~100ms per atom * 1,000,000 = 27 hours.
* **Result:** The system is too slow to react to real-time data ingestion (e.g., live chat logs).

## 2. The Solution: "Teacher-Student" Weak Supervision
We decouple **Understanding** (The Teacher) from **Application** (The Student).

### Phase A: Discovery (The Teacher)
* **Default Agent:** [GLiNER](file:///c:/Users/rsbiiw/Projects/ECE_Core/engine/src/services/tags/gliner.ts) (Zero-Shot Entity Recognition via ONNX).
* **High-Latency Fallback:** GLM-Edge LLM (side-channel).
* **Input:** A random sample of data (e.g., 20-50 atoms).
* **Registry:** `context/master_tags.json` (The "Virus Definition").
* **Output:** A list of **Viral Patterns** (e.g., `["Dory", "Jade", "ECE_Core"]`).
* **Frequency:** Low (Once per Dream Cycle).

### Phase B: Infection (The Student)
* **Agent:** `wink-nlp` (Statistical/Regex Engine).
* **Input:** The remaining **99.9%** of the dataset.
* **Task:** "Scan for these exact strings. If found, apply the tag."
* **Speed:** < 1ms per atom (CPU only).
* **Output:** Enriched Graph.

## 3. Implementation Rules
1.  **Master Tag List:** The system must maintain a `sovereign_tags.json` file. This is the persistent memory of the "Virus."
2.  **No Hallucinations:** The Student (Wink) performs **Hard Matching** only. It does not guess.
3.  **Feedback Loop:** If the Teacher finds a new entity (e.g., "DeepSeek"), it adds it to the Master List. The next Infection Cycle will automatically tag all historical mentions of "DeepSeek" in the entire database.

## 4. Architecture
```typescript
async function runInfectionCycle() {
  // 1. Teacher learns new names from recent data
  const newTags = await DiscoveryService.learn(sampleAtoms);
  await TagRegistry.register(newTags);

  // 2. Student applies names to ALL data (fast)
  await InfectorService.processBatch(allAtoms);
}
```
