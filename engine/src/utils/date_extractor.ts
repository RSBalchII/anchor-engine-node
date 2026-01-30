/**
 * Date Extraction Utility
 * Extracts timestamps from text content or filenames using regex patterns.
 */

export function extractDateFromContent(text: string): number | null {
    // Limit scope to header for performance (first 2000 chars)
    const scanText = text.length > 2000 ? text.substring(0, 2000) : text;

    // Patterns
    const patterns = [
        // ISO 8601: 2025-01-24 or 2025/01/24
        /\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/,
        // US: 01/24/2025
        /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
        // Text: Jan 24, 2025 or January 24th, 2025
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})\b/i
    ];

    for (const pattern of patterns) {
        const match = scanText.match(pattern);
        if (match) {
            // Validate date
            const parsed = Date.parse(match[0]);
            if (!isNaN(parsed)) {
                return parsed;
            }
        }
    }
    return null;
}
