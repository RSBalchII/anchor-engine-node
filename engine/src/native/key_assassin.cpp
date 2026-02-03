#include <napi.h>
#include <string>
#include <string_view>

// Conditional compilation for RE2
#ifdef USE_RE2
#include <re2/re2.h>
#endif

namespace ECE {

    class KeyAssassin {
    public:
        // Static method: Takes string, returns clean string
        static std::string Cleanse(std::string_view dirty_content) {
            std::string result(dirty_content); // Copy for modification

#ifdef USE_RE2
            // Optimized implementation using RE2
            // Remove JSON wrapper patterns
            RE2 jsonWrapper(R"("response_content"\s*:\s*")([^"]*)(")");
            result = RE2::Replace(result, jsonWrapper, "$1");

            // Remove common artifact patterns
            RE2 artifactPattern(R"(\{(?:[^{}]*)?"response_content"\s*:\s*"([^"]*)"(?:[^}]*)?\})");
            RE2::Replace(&result, artifactPattern, "$1");

            // Remove escaped quotes
            RE2 escapedQuotes(R"(\\")");
            RE2::Replace(&result, escapedQuotes, "\"");

            // Remove metadata patterns
            RE2 metadataPattern(R"("metadata"\s*:\s*\{[^}]*\},?\s*)");
            RE2::Replace(&result, metadataPattern, "");
#else
            // Fallback implementation using string operations
            // Remove common JSON wrapper patterns
            size_t pos = 0;
            while ((pos = result.find("\"response_content\": \"", pos)) != std::string::npos) {
                size_t start = pos;
                size_t contentStart = start + 19; // Length of "\"response_content\": \""
                size_t end = result.find("\"", contentStart);
                if (end != std::string::npos) {
                    std::string content = result.substr(contentStart, end - contentStart);
                    result.replace(start, end - start + 2, content); // +2 for the two quotes
                    pos = start + content.length();
                } else {
                    pos += 19;
                }
            }

            // Remove common artifact patterns
            pos = 0;
            while ((pos = result.find("{\"response_content\": \"", pos)) != std::string::npos) {
                size_t start = pos;
                size_t contentStart = start + 22; // Length of "{\"response_content\": \""
                size_t end = result.find("\"}", contentStart);
                if (end != std::string::npos) {
                    std::string content = result.substr(contentStart, end - contentStart);
                    result.replace(start, end - start + 3, content); // +3 for {"}
                    pos = start + content.length();
                } else {
                    pos += 22;
                }
            }

            // Remove escaped quotes
            pos = 0;
            while ((pos = result.find("\\\"", pos)) != std::string::npos) {
                result.replace(pos, 2, "\"");
                pos += 1;
            }

            // Remove common metadata patterns
            pos = 0;
            while ((pos = result.find("\"metadata\": {", pos)) != std::string::npos) {
                size_t start = pos;
                size_t end = result.find("},", start);
                if (end != std::string::npos) {
                    result.erase(start, end - start + 2); // +2 for },
                    pos = start;
                } else {
                    pos += 13;
                }
            }
#endif

            // Additional cleanup: remove leading/trailing whitespace and normalize
            size_t start = result.find_first_not_of(" \t\n\r");
            if (start == std::string::npos) {
                return ""; // string is all whitespace
            }
            size_t end = result.find_last_not_of(" \t\n\r");
            result = result.substr(start, end - start + 1);

            return result;
        }
    };

    // N-API Wrapper
    Napi::String CleanseWrapped(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();

        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
            return Napi::String::New(env, "");
        }

        std::string input = info[0].As<Napi::String>().Utf8Value();

        // Execute
        std::string result = ECE::KeyAssassin::Cleanse(input);

        return Napi::String::New(env, result);
    }
}