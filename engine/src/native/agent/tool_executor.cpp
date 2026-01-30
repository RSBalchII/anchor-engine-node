#include "tool_executor.hpp"
#include <fstream>
#include <sstream>
#include <iostream>
#include <array>
#include <memory>
#include <stdexcept>
#include <regex>

// Minimal JSON parser for extracting tool and params
// In production, we could link nlohmann/json if needed

namespace ece {

namespace fs = std::filesystem;

std::string ToolExecutor::Execute(const std::string& json_command) {
    try {
        // Use regex to extract tool name
        std::regex tool_regex("\"tool\"\\s*:\\s*\"([^\"]+)\"");
        std::smatch tool_match;

        if (!std::regex_search(json_command, tool_match, tool_regex)) {
            return "Error: Invalid JSON format - no tool specified";
        }

        std::string tool = tool_match[1].str();

        // Extract params object
        std::regex params_regex("\"params\"\\s*:\\s*(\\{[^}]*\\})");
        std::smatch params_match;

        std::string params_obj = "{}"; // default empty object
        if (std::regex_search(json_command, params_match, params_regex)) {
            params_obj = params_match[1].str();
        }
        
        // Dispatch based on tool
        if (tool == "read_file") {
            // Extract path from params
            std::regex path_regex("\"path\"\\s*:\\s*\"([^\"]+)\"");
            std::smatch path_match;

            if (std::regex_search(params_obj, path_match, path_regex)) {
                std::string path = path_match[1].str();
                return ReadFile(path);
            } else {
                return "Error: read_file tool requires 'path' parameter";
            }
        }
        else if (tool == "write_file") {
            // Extract path and content from params
            std::regex path_regex("\"path\"\\s*:\\s*\"([^\"]+)\"");
            std::regex content_regex("\"content\"\\s*:\\s*\"([^\"]*)\"");

            std::smatch path_match, content_match;
            std::string path, content;

            if (std::regex_search(params_obj, path_match, path_regex)) {
                path = path_match[1].str();
            } else {
                return "Error: write_file tool requires 'path' parameter";
            }

            if (std::regex_search(params_obj, content_match, content_regex)) {
                content = content_match[1].str();
                // Handle escaped characters in content
                std::string unescaped_content;
                unescaped_content.reserve(content.length());
                for (size_t i = 0; i < content.length(); ++i) {
                    if (content[i] == '\\' && i + 1 < content.length()) {
                        switch (content[i + 1]) {
                            case 'n': unescaped_content += '\n'; i++; break;
                            case 't': unescaped_content += '\t'; i++; break;
                            case 'r': unescaped_content += '\r'; i++; break;
                            case '\\': unescaped_content += '\\'; i++; break;
                            case '"': unescaped_content += '"'; i++; break;
                            default: unescaped_content += content[i]; break;
                        }
                    } else {
                        unescaped_content += content[i];
                    }
                }
                content = unescaped_content;
            } else {
                return "Error: write_file tool requires 'content' parameter";
            }

            return WriteFile(path, content);
        }
        else if (tool == "list_dir") {
            // Extract path from params, default to current directory
            std::regex path_regex("\"path\"\\s*:\\s*\"([^\"]+)\"");
            std::smatch path_match;

            std::string path = ".";
            if (std::regex_search(params_obj, path_match, path_regex)) {
                path = path_match[1].str();
            }

            return ListDir(path);
        }
        else if (tool == "exec_shell") {
            // Extract command from params
            std::regex cmd_regex("\"command\"\\s*:\\s*\"([^\"]+)\"");
            std::smatch cmd_match;

            if (std::regex_search(params_obj, cmd_match, cmd_regex)) {
                std::string cmd = cmd_match[1].str();
                return ExecShell(cmd);
            } else {
                return "Error: exec_shell tool requires 'command' parameter";
            }
        }
        else if (tool == "search_memory") {
            // Extract query from params
            std::regex query_regex("\"query\"\\s*:\\s*\"([^\"]+)\"");
            std::smatch query_match;

            if (std::regex_search(params_obj, query_match, query_regex)) {
                std::string query = query_match[1].str();
                return SearchMemory(query);
            } else {
                return "Error: search_memory tool requires 'query' parameter";
            }
        }
        else {
            return "Error: Unknown tool '" + tool + "'";
        }
    }
    catch (const std::exception& e) {
        return "Error: Exception in Execute - " + std::string(e.what());
    }
    catch (...) {
        return "Error: Unknown exception in Execute";
    }
}

std::string ToolExecutor::ReadFile(const std::string& path) {
    try {
        if (!fs::exists(path)) {
            return "Error: File not found - " + path;
        }
        
        if (!fs::is_regular_file(path)) {
            return "Error: Path is not a regular file - " + path;
        }
        
        std::ifstream f(path);
        if (!f.is_open()) {
            return "Error: Cannot open file - " + path;
        }
        
        std::stringstream buffer;
        buffer << f.rdbuf();
        return buffer.str();
    }
    catch (const std::exception& e) {
        return "Error: Exception reading file " + path + " - " + std::string(e.what());
    }
    catch (...) {
        return "Error: Unknown exception reading file " + path;
    }
}

std::string ToolExecutor::WriteFile(const std::string& path, const std::string& content) {
    try {
        // Create directory if it doesn't exist
        fs::path p(path);
        if (p.parent_path() != "") {
            fs::create_directories(p.parent_path());
        }
        
        std::ofstream f(path);
        if (!f.is_open()) {
            return "Error: Cannot create/write file - " + path;
        }
        
        f << content;
        f.close();
        
        return "Success: Written " + std::to_string(content.size()) + " bytes to " + path;
    }
    catch (const std::exception& e) {
        return "Error: Exception writing file " + path + " - " + std::string(e.what());
    }
    catch (...) {
        return "Error: Unknown exception writing file " + path;
    }
}

std::string ToolExecutor::ListDir(const std::string& path) {
    try {
        if (!fs::exists(path)) {
            return "Error: Directory not found - " + path;
        }
        
        if (!fs::is_directory(path)) {
            return "Error: Path is not a directory - " + path;
        }
        
        std::string result;
        for (const auto& entry : fs::directory_iterator(path)) {
            result += entry.path().filename().string();
            if (entry.is_directory()) {
                result += "/";
            }
            result += "\n";
        }
        return result;
    }
    catch (const std::exception& e) {
        return "Error: Exception listing directory " + path + " - " + std::string(e.what());
    }
    catch (...) {
        return "Error: Unknown exception listing directory " + path;
    }
}

std::string ToolExecutor::ExecShell(const std::string& cmd) {
    try {
        std::array<char, 128> buffer;
        std::string result;
        
#ifdef _WIN32
        // Windows implementation
        std::unique_ptr<FILE, decltype(&_pclose)> pipe(_popen(cmd.c_str(), "r"), _pclose);
#else
        // Unix-like implementation
        std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(cmd.c_str(), "r"), pclose);
#endif
        
        if (!pipe) {
            return "Error: Failed to execute command - " + cmd;
        }
        
        while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
            result += buffer.data();
        }
        
        return result;
    }
    catch (const std::exception& e) {
        return "Error: Exception executing command '" + cmd + "' - " + std::string(e.what());
    }
    catch (...) {
        return "Error: Unknown exception executing command '" + cmd + "'";
    }
}

std::string ToolExecutor::SearchMemory(const std::string& query) {
    // This would connect back to ECE's search functionality
    // For now, return a placeholder response
    return "Search functionality would connect to ECE's Tag-Walker protocol for query: " + query;
}

} // namespace ece