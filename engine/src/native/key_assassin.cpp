#include "key_assassin.hpp"
#include <vector>

namespace ECE {

    // Box Cutter: Check if codepoint is terminal UI noise
    static bool isTerminalNoise(uint32_t codepoint) {
        // Box Drawing (U+2500-U+257F)
        if (codepoint >= 0x2500 && codepoint <= 0x257F) return true;
        // Block Elements (U+2580-U+259F)
        if (codepoint >= 0x2580 && codepoint <= 0x259F) return true;
        // Geometric Shapes (U+25A0-U+25FF)
        if (codepoint >= 0x25A0 && codepoint <= 0x25FF) return true;
        // Miscellaneous Symbols (U+2600-U+26FF) - includes checkmarks, stars, etc.
        if (codepoint >= 0x2600 && codepoint <= 0x26FF) return true;
        // Dingbats (U+2700-U+27BF) - includes arrows, ornaments
        if (codepoint >= 0x2700 && codepoint <= 0x27BF) return true;
        return false;
    }

    // Decorative emoji to strip (broader range)
    static bool isDecorativeEmoji(uint32_t codepoint) {
        // Stars: ⭐ U+2B50
        if (codepoint == 0x2B50) return true;
        // Checkmarks: ✓ U+2713, ✔ U+2714
        if (codepoint == 0x2713 || codepoint == 0x2714) return true;
        // X marks: ❌ U+274C, ❎ U+274E
        if (codepoint == 0x274C || codepoint == 0x274E) return true;
        // Miscellaneous Symbols and Pictographs (U+1F300-U+1F5FF)
        if (codepoint >= 0x1F300 && codepoint <= 0x1F5FF) return true;
        // Emoticons (U+1F600-U+1F64F)
        if (codepoint >= 0x1F600 && codepoint <= 0x1F64F) return true;
        // Transport and Map Symbols (U+1F680-U+1F6FF)
        if (codepoint >= 0x1F680 && codepoint <= 0x1F6FF) return true;
        // Supplemental Symbols (U+1F900-U+1F9FF)
        if (codepoint >= 0x1F900 && codepoint <= 0x1F9FF) return true;
        return false;
    }

    std::string KeyAssassin::Cleanse(std::string_view input) {
        std::string result;
        result.reserve(input.size());

        bool escape = false;
        
        for (size_t i = 0; i < input.size(); ++i) {
            unsigned char c = static_cast<unsigned char>(input[i]);

            if (escape) {
                switch (c) {
                    case 'n': result += '\n'; break;
                    case 'r': break;
                    case 't': result += '\t'; break;
                    case '"': result += '"'; break;
                    case '\\': result += '\\'; break;
                    default: 
                        result += '\\'; 
                        result += c; 
                }
                escape = false;
                continue;
            }

            if (c == '\\') {
                escape = true;
                continue;
            }

            // --- BOX CUTTER PROTOCOL ---
            // Handle UTF-8 multi-byte sequences
            if (c >= 0x80) {
                uint32_t codepoint = 0;
                size_t seqLen = 0;

                if ((c & 0xE0) == 0xC0 && i + 1 < input.size()) {
                    seqLen = 2;
                    codepoint = ((c & 0x1F) << 6) | (static_cast<unsigned char>(input[i+1]) & 0x3F);
                } else if ((c & 0xF0) == 0xE0 && i + 2 < input.size()) {
                    seqLen = 3;
                    codepoint = ((c & 0x0F) << 12) | 
                                ((static_cast<unsigned char>(input[i+1]) & 0x3F) << 6) |
                                (static_cast<unsigned char>(input[i+2]) & 0x3F);
                } else if ((c & 0xF8) == 0xF0 && i + 3 < input.size()) {
                    seqLen = 4;
                    codepoint = ((c & 0x07) << 18) |
                                ((static_cast<unsigned char>(input[i+1]) & 0x3F) << 12) |
                                ((static_cast<unsigned char>(input[i+2]) & 0x3F) << 6) |
                                (static_cast<unsigned char>(input[i+3]) & 0x3F);
                }

                // Strip terminal noise and decorative emoji
                if (seqLen > 0 && (isTerminalNoise(codepoint) || isDecorativeEmoji(codepoint))) {
                    i += seqLen - 1; // Skip the rest of the multi-byte sequence
                    continue;
                }

                // Keep other UTF-8 characters
                if (seqLen > 0) {
                    for (size_t j = 0; j < seqLen && i + j < input.size(); ++j) {
                        result += input[i + j];
                    }
                    i += seqLen - 1;
                    continue;
                }
            }

            result += c;
        }

        // --- TRUNCATION CLEANUP ---
        // Remove [Truncated] and [...] artifacts at boundaries
        const std::string truncated = "[Truncated]";
        const std::string ellipsis = "[...]";
        
        size_t pos;
        while ((pos = result.find(truncated)) != std::string::npos) {
            result.erase(pos, truncated.length());
        }
        while ((pos = result.find(ellipsis)) != std::string::npos) {
            result.erase(pos, ellipsis.length());
        }

        return result;
    }
}
