#pragma once
#include <string>
#include <string_view>
#include <vector>

namespace Atomizer {
    // We return a simple struct that N-API logic can easily convert to JS Array
    struct AtomResult {
        std::string content; // For now, we copy to string to return to JS
        // Optimally, we would return {start, length} and let JS slice,
        // but creating a new V8 string from C++ string is often cleaner for the API.
    };

    class Atomizer {
    public:
        // Main Entry point
        static std::vector<std::string> Atomize(const std::string& content, const std::string& strategy, size_t maxChunkSize = 512);

    private:
        // Strategy: "code" (Line-based + Bracket balancing)
        static std::vector<std::string> SplitCode(const std::string& content, size_t maxChunkSize);

        // Strategy: "prose" (Sentence/Paragraph based)
        static std::vector<std::string> SplitProse(const std::string& content, size_t maxChunkSize);
    };
}