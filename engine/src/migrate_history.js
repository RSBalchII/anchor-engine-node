const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

// Migration script to consolidate legacy session files
async function migrateHistory() {
  console.log('Starting legacy session migration...');

  // Find all session files
  const sessionsDir = path.join(__dirname, '..', '..', 'context', 'Coding-Notes', 'Notebook', 'history', 'important-context', 'sessions', 'raws');
  const pattern = path.join(sessionsDir, 'sessions_part_*.json');

  // Use glob to find all matching files
  const sessionFiles = glob.sync(pattern);

  if (sessionFiles.length === 0) {
    console.log('No session files found in the expected location.');
    // Try alternative path
    const altSessionsDir = path.join(__dirname, '..', '..', 'context', 'Coding-Notes', 'Notebook', 'history', 'important-context', 'sessions');
    const altPattern = path.join(altSessionsDir, 'sessions_part_*.json');
    const altSessionFiles = glob.sync(altPattern);

    if (altSessionFiles.length === 0) {
      console.log('No session files found in alternative location either.');
      return;
    }

    console.log(`Found ${altSessionFiles.length} session files in alternative location.`);
    processSessionFiles(altSessionFiles);
    return;
  }

  console.log(`Found ${sessionFiles.length} session files`);
  processSessionFiles(sessionFiles);
}

function processSessionFiles(sessionFiles) {
  // Sort files numerically (part_1, part_2, ..., part_10, etc.)
  sessionFiles.sort((a, b) => {
    const matchA = a.match(/part_(\d+)/);
    const matchB = b.match(/part_(\d+)/);

    if (matchA && matchB) {
      return parseInt(matchA[1]) - parseInt(matchB[1]);
    }
    return a.localeCompare(b);
  });

  let allSessions = [];

  for (const file of sessionFiles) {
    console.log(`Processing: ${path.basename(file)}`);
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Try to extract valid JSON from potentially corrupted files
      let data = extractValidJson(content);

      if (!data) {
        console.error(`Could not extract valid JSON from ${file}`);
        continue;
      }

      // Handle both list and object formats
      if (Array.isArray(data)) {
        allSessions = allSessions.concat(data);
      } else if (typeof data === 'object') {
        allSessions.push(data);
      } else {
        console.log(`Unexpected data format in ${file}, skipping...`);
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }

  console.log(`Merged ${allSessions.length} total sessions`);

  // Save to YAML file
  const outputDir = path.join(__dirname, '..', '..', 'context');
  const outputFile = path.join(outputDir, 'full_history.yaml');

  // Custom YAML representer for multiline strings
  yaml.representer = {
    ...yaml.representer,
    string: (data) => {
      if (data.includes('\n')) {
        return new yaml.types.Str(data, { style: '|' });
      }
      return data;
    }
  };

  try {
    const yamlContent = yaml.dump(allSessions, {
      lineWidth: -1,
      noRefs: true,
      skipInvalid: true
    });

    fs.writeFileSync(outputFile, yamlContent, 'utf8');
    console.log(`YAML file created: ${outputFile}`);

    // Also save as JSON for compatibility
    const jsonOutputFile = path.join(outputDir, 'full_history.json');
    fs.writeFileSync(jsonOutputFile, JSON.stringify(allSessions, null, 2), 'utf8');
    console.log(`JSON file created: ${jsonOutputFile}`);

  } catch (error) {
    console.error('Error saving YAML file:', error.message);
    return;
  }

  console.log('Migration completed successfully!');
}

// Function to extract valid JSON from potentially corrupted files
function extractValidJson(content) {
  try {
    // First, try to parse as regular JSON
    return JSON.parse(content);
  } catch (e) {
    // If that fails, clean the content and try again
    try {
      // Remove null bytes and other control characters that often corrupt JSON
      let cleanContent = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

      // Try to parse the cleaned content
      return JSON.parse(cleanContent);
    } catch (e2) {
      // If still failing, try to extract JSON array from the content
      try {
        // Find the main JSON array by looking for opening [ and closing ]
        const startIdx = cleanContent.indexOf('[');
        const endIdx = cleanContent.lastIndexOf(']');

        if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
          const arrayContent = cleanContent.substring(startIdx, endIdx + 1);

          // Try to parse the extracted array
          return JSON.parse(arrayContent);
        }
      } catch (e3) {
        // If all attempts fail, return null
        return null;
      }
    }
  }

  return null;
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateHistory().catch(console.error);
}

module.exports = { migrateHistory };