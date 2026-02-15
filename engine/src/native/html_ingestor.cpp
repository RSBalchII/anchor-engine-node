#include "html_ingestor.hpp"
#include <sstream>
#include <algorithm>
#include <cctype>
#include <unordered_set>

namespace ece {

// Initialize the class and export it to Node.js
Napi::Object HtmlIngestor::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "HtmlIngestor", {
        InstanceMethod("extractContent", &HtmlIngestor::ExtractContent),
        InstanceMethod("extractMetadata", &HtmlIngestor::ExtractMetadata)
    });

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("HtmlIngestor", func);
    return exports;
}

Napi::FunctionReference HtmlIngestor::constructor;

// Constructor
HtmlIngestor::HtmlIngestor(const Napi::CallbackInfo& info) : Napi::ObjectWrap<HtmlIngestor>(info) {
    // Constructor implementation if needed
}

// Extract content from HTML
Napi::Value HtmlIngestor::ExtractContent(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }

    std::string html = info[0].As<Napi::String>().Utf8Value();
    std::string cleanContent = CleanHtml(html);

    return Napi::String::New(env, cleanContent);
}

// Extract metadata from HTML
Napi::Value HtmlIngestor::ExtractMetadata(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }

    std::string html = info[0].As<Napi::String>().Utf8Value();

    // Create a result object
    Napi::Object result = Napi::Object::New(env);

    // For now, just return a basic structure
    // In a full implementation, this would extract title, meta tags, etc.
    result.Set("title", Napi::String::New(env, ""));
    result.Set("description", Napi::String::New(env, ""));
    result.Set("tags", Napi::Array::New(env));

    return result;
}

// Internal helper to clean HTML
std::string HtmlIngestor::CleanHtml(const std::string& raw_html) {
    std::string clean;
    clean.reserve(raw_html.length()); // Reserve space for efficiency

    bool in_script = false;
    bool in_style = false;
    bool in_tag = false;

    for (size_t i = 0; i < raw_html.length(); ++i) {
        char c = raw_html[i];

        if (c == '<') {
            // Check for script or style tags
            if (i + 6 < raw_html.length() &&
                (raw_html.substr(i, 7) == "<script" ||
                 raw_html.substr(i, 7) == "<SCRIPT" ||
                 (i + 7 < raw_html.length() && raw_html.substr(i, 8) == "<script " && std::isspace(static_cast<unsigned char>(raw_html[i+7]))) ||
                 (i + 7 < raw_html.length() && raw_html.substr(i, 8) == "<SCRIPT " && std::isspace(static_cast<unsigned char>(raw_html[i+7]))))) {
                in_script = true;
            } else if (i + 5 < raw_html.length() &&
                      (raw_html.substr(i, 6) == "<style" ||
                       raw_html.substr(i, 6) == "<STYLE" ||
                       (i + 6 < raw_html.length() && raw_html.substr(i, 7) == "<style " && std::isspace(static_cast<unsigned char>(raw_html[i+6]))) ||
                       (i + 6 < raw_html.length() && raw_html.substr(i, 7) == "<STYLE " && std::isspace(static_cast<unsigned char>(raw_html[i+6]))))) {
                in_style = true;
            }

            in_tag = true;
            continue;
        }

        if (c == '>') {
            in_tag = false;

            // Check if this is a closing script or style tag
            if (in_script && i + 8 < raw_html.length()) {
                // Look back to see if we just closed a script tag
                size_t pos = i;
                while (pos > 0 && raw_html[pos] != '<') pos--;
                if (pos > 0 && (raw_html.substr(pos, 9) == "</script>" || raw_html.substr(pos, 9) == "</SCRIPT>")) {
                    in_script = false;
                }
            } else if (in_style && i + 7 < raw_html.length()) {
                // Look back to see if we just closed a style tag
                size_t pos = i;
                while (pos > 0 && raw_html[pos] != '<') pos--;
                if (pos > 0 && (raw_html.substr(pos, 8) == "</style>" || raw_html.substr(pos, 8) == "</STYLE>")) {
                    in_style = false;
                }
            }
            continue;
        }

        // Skip content inside script or style tags
        if (in_script || in_style) {
            continue;
        }

        // If we're in a tag, skip it
        if (in_tag) {
            continue;
        }

        // Preserve newlines
        if (c == '\n' || c == '\r') {
            if (clean.empty() || clean.back() != '\n') {
                clean += '\n';
            }
            continue;
        }

        // Convert HTML entities
        if (c == '&' && i + 1 < raw_html.length()) {
            // Look for common HTML entities
            if (i + 4 < raw_html.length() && raw_html.substr(i, 5) == "&amp;") {
                clean += '&';
                i += 4; // Skip the rest of the entity
                continue;
            } else if (i + 5 < raw_html.length() && raw_html.substr(i, 6) == "&lt;") {
                clean += '<';
                i += 3;
                continue;
            } else if (i + 5 < raw_html.length() && raw_html.substr(i, 6) == "&gt;") {
                clean += '>';
                i += 3;
                continue;
            } else if (i + 5 < raw_html.length() && raw_html.substr(i, 6) == "&quot;") {
                clean += '"';
                i += 5;
                continue;
            } else if (i + 4 < raw_html.length() && raw_html.substr(i, 5) == "&#39;") {
                clean += '\'';
                i += 4;
                continue;
            }
        }

        // Add character to clean content if it's not a tag character
        clean += c;
    }

    // Normalize whitespace
    std::string normalized;
    normalized.reserve(clean.length());
    bool last_was_space = false;

    for (char c : clean) {
        if (std::isspace(static_cast<unsigned char>(c))) {
            if (!last_was_space) {
                normalized += ' ';
                last_was_space = true;
            }
        } else {
            normalized += c;
            last_was_space = false;
        }
    }

    return normalized;
}

// Check if an element is a block-level element
bool HtmlIngestor::IsBlockElement(const std::string& tag_name) {
    static const std::unordered_set<std::string> block_elements = {
        "div", "p", "h1", "h2", "h3", "h4", "h5", "h6",
        "section", "article", "aside", "header", "footer",
        "nav", "main", "figure", "figcaption", "form",
        "table", "tbody", "thead", "tr", "td", "th",
        "ul", "ol", "li", "dl", "dt", "dd", "blockquote",
        "pre", "hr", "br", "address", "fieldset", "legend"
    };

    std::string lower_tag = tag_name;
    std::transform(lower_tag.begin(), lower_tag.end(), lower_tag.begin(), ::tolower);

    return block_elements.count(lower_tag) > 0;
}

} // namespace ece