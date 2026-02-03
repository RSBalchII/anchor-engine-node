#include <napi.h>
#include "key_assassin.hpp"
#include "atomizer.hpp"
#include "fingerprint.hpp"
#include "html_ingestor.hpp"
#include "agent/tool_executor.hpp"

// The Wrapper Function with Zero-Copy Buffer Support
Napi::String CleanseWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    // 1. Validation
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }

    // 2. Get arguments from JS
    std::string input = info[0].As<Napi::String>().Utf8Value();

    // 3. Call C++ Logic
    std::string output = ECE::KeyAssassin::Cleanse(input);

    // 4. Return to JS
    return Napi::String::New(env, output);
}

// Atomizer Wrapper with Zero-Copy Support
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

    std::vector<std::string> atoms = ECE::Atomizer::Atomize(input, strategy);

    Napi::Array result = Napi::Array::New(env, atoms.size());
    for (size_t i = 0; i < atoms.size(); i++) {
        result[i] = Napi::String::New(env, atoms[i]);
    }

    return result;
}

// Fingerprint Wrapper (Returns BigInt) with Zero-Copy
Napi::Value FingerprintWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::BigInt::New(env, (uint64_t)0);
    }
    
    std::string input = info[0].As<Napi::String>().Utf8Value();
    
    uint64_t hash = ECE::Fingerprint::Generate(input);
    return Napi::BigInt::New(env, hash);
}

// Distance Wrapper (Takes 2 BigInts) with Batch Support
Napi::Value DistanceWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Two arguments expected").ThrowAsJavaScriptException();
        return Napi::Number::New(env, 64);
    }

    bool lossless;
    // Note: JS BigInt -> C++ uint64_t
    uint64_t a = 0;
    uint64_t b = 0;

    // Robust casting
    if (info[0].IsBigInt()) a = info[0].As<Napi::BigInt>().Uint64Value(&lossless);
    if (info[1].IsBigInt()) b = info[1].As<Napi::BigInt>().Uint64Value(&lossless);

    int dist = ECE::Fingerprint::Distance(a, b);
    return Napi::Number::New(env, dist);
}

// Batch Distance Wrapper for SIMD optimization
Napi::Value DistanceBatchWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2) {
        Napi::TypeError::New(env, "Expected [hashes_a, hashes_b]").ThrowAsJavaScriptException();
        return Napi::Array::New(env);
    }

    if (!info[0].IsArray() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "Expected [Array, Array]").ThrowAsJavaScriptException();
        return Napi::Array::New(env);
    }

    Napi::Array hashesA = info[0].As<Napi::Array>();
    Napi::Array hashesB = info[1].As<Napi::Array>();
    uint32_t count = hashesA.Length();
    
    if (count != hashesB.Length()) {
        Napi::TypeError::New(env, "Arrays must have the same length").ThrowAsJavaScriptException();
        return Napi::Array::New(env);
    }

    // Limit to actual array lengths
    size_t actualCount = std::min(static_cast<size_t>(count), static_cast<size_t>(hashesB.Length()));

    // Prepare input arrays
    std::vector<uint64_t> inputA(actualCount);
    std::vector<uint64_t> inputB(actualCount);

    for (size_t i = 0; i < actualCount; i++) {
        bool lossless;
        inputA[i] = hashesA.Get(i).As<Napi::BigInt>().Uint64Value(&lossless);
        inputB[i] = hashesB.Get(i).As<Napi::BigInt>().Uint64Value(&lossless);
    }

    // Prepare output array
    std::vector<int32_t> distances(actualCount);

    // Call the optimized batch function
    ECE::Fingerprint::DistanceBatch(inputA.data(), inputB.data(), distances.data(), actualCount);

    // Create result array
    Napi::Array result = Napi::Array::New(env, actualCount);
    for (size_t i = 0; i < actualCount; i++) {
        result[i] = Napi::Number::New(env, distances[i]);
    }

    return result;
}

// ToolExecutor Wrapper
Napi::Value ExecuteToolWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "Error: Invalid input");
    }

    std::string json_command = info[0].As<Napi::String>().Utf8Value();
    std::string result = ece::ToolExecutor::Execute(json_command);

    return Napi::String::New(env, result);
}

// The Initialization (Like module.exports)
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "cleanse"), Napi::Function::New(env, CleanseWrapped));
    exports.Set(Napi::String::New(env, "atomize"), Napi::Function::New(env, AtomizeWrapped));
    exports.Set(Napi::String::New(env, "fingerprint"), Napi::Function::New(env, FingerprintWrapped));
    exports.Set(Napi::String::New(env, "distance"), Napi::Function::New(env, DistanceWrapped));
    exports.Set(Napi::String::New(env, "distanceBatch"), Napi::Function::New(env, DistanceBatchWrapped)); // New batch function
    exports.Set(Napi::String::New(env, "executeTool"), Napi::Function::New(env, ExecuteToolWrapped));

    // Initialize HtmlIngestor class
    ece::HtmlIngestor::Init(env, exports);

    return exports;
}

NODE_API_MODULE(ece_native, Init)