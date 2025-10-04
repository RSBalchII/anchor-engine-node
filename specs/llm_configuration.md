# LLM Configuration

The External Context Engine (ECE) now supports multiple LLM providers. The configuration for this is in the `config.yaml` file.

## Configuration Structure

The `llm` section of the `config.yaml` file has the following structure:

```yaml
llm:
  active_provider: ollama
  providers:
    ollama:
      model: "granite3.1-moe:3b-instruct-q8_0"
      api_base: "http://localhost:11434/v1"
    docker_desktop:
      model: "ai/mistral:latest"
      api_base: "http://localhost:12434/v1"
    llama_cpp:
      model_path: "/path/to/your/model.gguf"
      api_base: "http://localhost:8080/v1"
```

*   `active_provider`: This key specifies which provider to use. It can be `ollama`, `docker_desktop`, or `llama_cpp`.
*   `providers`: This is a dictionary containing the configuration for each provider.
    *   `ollama`: Configuration for the Ollama provider with the `granite3.1-moe:3b-instruct-q8_0` model.
    *   `docker_desktop`: Configuration for the Docker Desktop OpenAI-compatible endpoint with the `ai/mistral:latest` model.
    *   `llama_cpp`: Configuration for the Llama.cpp provider, specifying the path to the model file.

## Switching Providers (Manual Fallback)

To switch between providers, change the value of the `active_provider` key to the desired provider. For example, to use the Docker Desktop endpoint as a fallback, change the `active_provider` to `docker_desktop`:

```yaml
llm:
  active_provider: docker_desktop
  # ...
```
