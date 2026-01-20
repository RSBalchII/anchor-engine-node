
/**
 * Date Extractor Utility (Standard 072)
 * 
 * Scans text for narrative dates to override file timestamps.
 * Prioritizes:
 * 1. ISO format [YYYY-MM-DD]
 * 2. Written format (January 20, 2024)
 * 3. Compact format (2024/01/20)
 */

export function extractDateFromContent(content: string): number | null {
    if (!content || content.length === 0) return null;

    // Scan only the first 500 characters for performance
    const scanText = content.substring(0, 500);

    // 1. Explicit Timestamp Tag [2024-01-20T10:00:00] or [2024-01-20]
    const isoTag = scanText.match(/\[(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?)\]/);
    if (isoTag) {
        const date = new Date(isoTag[1]);
        if (!isNaN(date.getTime())) return date.getTime();
    }

    // 2. Standard ISO 2024-01-20 (surrounded by whitespace or boundaries)
    const iso = scanText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) {
        const date = new Date(iso[1]);
        if (!isNaN(date.getTime())) return date.getTime();
    }

    // 3. Written English (January 20, 2024 or Jan 20 2024)
    const written = scanText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i);
    if (written) {
        const dateString = `${written[1]} ${written[2]} ${written[3]}`;
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) return date.getTime();
    }

    // 4. Chat Log Timestamp format: "2024/01/20 10:30" or "01/20/2024"
    // CAUTION: US vs EU formats ambiguity. We assume US (MM/DD/YYYY) or YYYY/MM/DD.

    // YYYY/MM/DD
    const isoSlash = scanText.match(/\b(\d{4})\/(\d{2})\/(\d{2})\b/);
    if (isoSlash) {
        const date = new Date(`${isoSlash[1]}-${isoSlash[2]}-${isoSlash[3]}`);
        if (!isNaN(date.getTime())) return date.getTime();
    }

    return null; // Fallback to file timestamp
}
