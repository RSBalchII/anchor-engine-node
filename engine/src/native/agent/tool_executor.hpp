#pragma once
#include <string>
#include <vector>
#include <filesystem>

namespace ece {

class ToolExecutor {
public:
    // Main Dispatcher: Parses JSON and routes to specific function
    static std::string Execute(const std::string& json_command);

private:
    // The "Hands"
    static std::string ReadFile(const std::string& path);
    static std::string WriteFile(const std::string& path, const std::string& content);
    static std::string ListDir(const std::string& path);
    static std::string SearchMemory(const std::string& query); // Connects back to ECE
    
    // Helper
    static std::string ExecShell(const std::string& cmd);
};

} // namespace ece