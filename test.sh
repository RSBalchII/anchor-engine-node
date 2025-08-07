#!/bin/bash

curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEsk-or-v1-137f00ebcbd508c238a1051d9a2479f4b33469a83f0cbdb9a2692aad22869086Y \
  -d '{
  "model": "tngtech/deepseek-r1t2-chimera:free",
  "messages": [
    {
      "role": "user",
      "content": "What is the meaning of life?"
    }
  ]
}'