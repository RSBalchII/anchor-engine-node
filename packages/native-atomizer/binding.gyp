{
  "targets": [
    {
      "target_name": "native_atomizer",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "./src/binding.cpp",
        "./src/atomizer.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 0,
              "AdditionalOptions": ["/std:c++17"]
            }
          }
        }],
        ["OS=='linux'", {
          "cflags_cc": [ "-std=c++17", "-O3" ],
          "cflags": [ "-O3" ]
        }],
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "NO",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "SDKROOT": "macosx",
            "OTHER_CPLUSPLUSFLAGS": [
              "-std=c++17",
              "-stdlib=libc++",
              "-O3"
            ],
            "OTHER_LDFLAGS": [
              "-stdlib=libc++"
            ]
          },
          "cflags_cc": ["-std=c++17", "-stdlib=libc++", "-O3"],
          "ldflags": ["-stdlib=libc++"]
        }]
      ]
    }
  ]
}