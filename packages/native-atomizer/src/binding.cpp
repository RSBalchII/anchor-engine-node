#include <napi.h>
#include "atomizer.hpp"

// Atomizer Wrapper
Napi::Array AtomizeWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::Array::New(env);
    }

    std::string input = info[0].As<Napi::String>().Utf8Value();

    std::string strategy = "prose";
    if (info.Length() > 1 && info[1].IsString()) {
        strategy = info[1].As<Napi::String>().Utf8Value();
    }

    size_t maxChunkSize = 512; // default
    if (info.Length() > 2 && info[2].IsNumber()) {
        maxChunkSize = info[2].As<Napi::Number>().Int64Value();
    }

    std::vector<std::string> atoms = Atomizer::Atomizer::Atomize(input, strategy, maxChunkSize);

    Napi::Array result = Napi::Array::New(env, atoms.size());
    for (size_t i = 0; i < atoms.size(); i++) {
        result[i] = Napi::String::New(env, atoms[i]);
    }

    return result;
}

// The Initialization (Like module.exports)
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "atomize"), Napi::Function::New(env, AtomizeWrapped));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)