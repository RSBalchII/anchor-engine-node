cmake_minimum_required(VERSION 3.15)
project(ece_native)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 1. Node.js & N-API Setup
# Find Node.js and Node-API includes
set(CMAKE_JS_INC "" CACHE STRING "Path to node-addon-api includes")
if(CMAKE_JS_INC STREQUAL "")
    # Try to find node-addon-api automatically
    execute_process(
        COMMAND node -p "require('node-addon-api').include"
        OUTPUT_VARIABLE NODE_ADDON_API_PATH
        OUTPUT_STRIP_TRAILING_WHITESPACE
        ERROR_QUIET
    )
    if(NODE_ADDON_API_PATH)
        string(REPLACE "\"" "" NODE_ADDON_API_PATH ${NODE_ADDON_API_PATH})
        set(CMAKE_JS_INC ${NODE_ADDON_API_PATH})
    endif()
endif()

# 2. AVX2 SIMD Detection (The Speed Boost)
if(MSVC)
    # Enable AVX2 and optimization flags for MSVC
    add_compile_options(/arch:AVX2 /O2 /Ob2 /DNAPI_DISABLE_CPP_EXCEPTIONS)
else()
    add_compile_options(-mavx2 -O3 -march=native)
endif()

# 3. Dependencies (RE2 - Conditional)
# Check if RE2 is available
find_path(RE2_INCLUDE_DIR re2/re2.h
    PATHS ${CMAKE_CURRENT_SOURCE_DIR}/deps/re2
          /usr/include
          /usr/local/include
          /opt/local/include
          "C:/vcpkg/installed/${VCPKG_TARGET_TRIPLET}/include"
)

find_library(RE2_LIBRARY
    NAMES re2
    PATHS ${CMAKE_CURRENT_SOURCE_DIR}/deps/lib
          /usr/lib
          /usr/local/lib
          /opt/local/lib
          "C:/vcpkg/installed/${VCPKG_TARGET_TRIPLET}/lib"
)

# 4. Source Files
set(SOURCES
    src/native/main.cpp
    src/native/key_assassin.cpp
    src/native/atomizer.cpp
    src/native/fingerprint.cpp
    src/native/html_ingestor.cpp
    src/native/agent/tool_executor.cpp
)

# 5. Build the Shared Library (.node)
add_library(${PROJECT_NAME} SHARED ${SOURCES})

# Set properties for Node.js addon
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "")
set_target_properties(${PROJECT_NAME} PROPERTIES SUFFIX ".node")

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_JS_INC}
    ${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api
)

if(RE2_INCLUDE_DIR)
    target_include_directories(${PROJECT_NAME} PRIVATE ${RE2_INCLUDE_DIR})
    if(RE2_LIBRARY)
        target_link_libraries(${PROJECT_NAME} ${RE2_LIBRARY})
        target_compile_definitions(${PROJECT_NAME} PRIVATE USE_RE2)
    endif()
endif()

# 6. Platform-specific settings
if(WIN32)
    target_compile_definitions(${PROJECT_NAME} PRIVATE _WIN32_WINNT=0x0600)
    set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_DEFINITIONS "NAPI_DISABLE_CPP_EXCEPTIONS")
else()
    if(APPLE)
        set_target_properties(${PROJECT_NAME} PROPERTIES
            SUFFIX ".node"
            MACOSX_RPATH TRUE
        )
    else()
        set_target_properties(${PROJECT_NAME} PROPERTIES SUFFIX ".node")
    endif()
endif()

# Link with Node.js library
if(WIN32)
    target_link_libraries(${PROJECT_NAME} "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api/node_api.lib")
endif()