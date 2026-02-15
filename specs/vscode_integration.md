# VSCode Integration

## Configure VSCode (example for 'Custom OpenAI endpoint')
- Open `Settings` → `Extensions` → `Chat` or the settings for the Chat provider you use
- Add a custom endpoint with URL: `http://localhost:8000/v1/chat/completions`
- Model: `ece-core`
- If API key is required, set a secret with key `Authorization` value `Bearer <API_KEY>` for the provider
- Set `stream` to `true` where the provider supports it

## Quick test with curl

### Normal (non-streaming)
```powershell
$body = @{
    model = 'ece-core'
    messages = @(
        @{ role = 'system'; content = 'You are a helpful assistant for VSCode.' },
        @{ role = 'user'; content = 'List the top-level files in the repository' }
    )
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/v1/chat/completions' -Body $body -ContentType 'application/json' -Headers @{ Authorization = 'Bearer <API_KEY_HERE>' }
```

### Streaming (SSE)
```powershell
$body = @{
    model = 'ece-core'
    messages = @(
        @{ role = 'system'; content = 'You are a helpful assistant for VSCode.' },
        @{ role = 'user'; content = 'Summarize the repository' }
    )
    stream = $true
} | ConvertTo-Json -Depth 4

# Using curl you can receive SSE chunks as they arrive:
curl -N -H "Authorization: Bearer <API_KEY_HERE>" -H "Content-Type: application/json" -X POST "http://localhost:8000/v1/chat/completions" -d $body
```
