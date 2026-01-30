#!/bin/bash
# PROTOCOL: VACUUM
# Archives legacy repositories to focus on ECE_Core.

# Configuration
ARCHIVE_DIR="./archive"
mkdir -p "$ARCHIVE_DIR"

# List of Repositories to Archive (Add the ones you want to hide)
REPOS=(
  "text-to-handwriting"
  "obsidian-kindle-plugin"
  "react-weather-app"
  # Add more here...
)

echo "🧹 Initiating Vacuum Protocol..."

for repo in "${REPOS[@]}"; do
  echo "📦 Processing: $repo..."
  
  if [ -d "../$repo" ]; then
      # If local, move to archive folder
      mv "../$repo" "$ARCHIVE_DIR/"
      echo "   -> Moved to local archive."
  else
      # If not local, clone it specifically to archive it
      # gh repo clone "RSBalchII/$repo" "$ARCHIVE_DIR/$repo"
      echo "   -> Local folder not found. Skipping clone to save bandwidth."
  fi
  
  # Optional: Archive on GitHub (Uncomment to execute)
  # echo "   -> Archiving on GitHub..."
  # gh repo archive "RSBalchII/$repo" --confirm
done

echo "✅ Vacuum Complete. Signal-to-Noise Ratio Optimized."