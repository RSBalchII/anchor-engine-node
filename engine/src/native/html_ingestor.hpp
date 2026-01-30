#pragma once
#include <napi.h>
#include <string>
#include <vector>

namespace ece {

class HtmlIngestor : public Napi::ObjectWrap<HtmlIngestor> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    HtmlIngestor(const Napi::CallbackInfo& info);

    // Exposed Methods (The "API" Node.js sees)
    Napi::Value ExtractContent(const Napi::CallbackInfo& info);
    Napi::Value ExtractMetadata(const Napi::CallbackInfo& info);

    // Internal Helpers (Pure C++ Speed)
    static std::string CleanHtml(const std::string& raw_html);
    static bool IsBlockElement(const std::string& tag_name);

private:
    static Napi::FunctionReference constructor;
};

} // namespace ece