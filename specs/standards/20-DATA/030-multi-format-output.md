# Standard 030: Multi-Format Output for Project Aggregation

## What Happened?
The `read_all.py` script in the root directory was only generating text and JSON outputs for project aggregation. To improve compatibility with various processing tools and follow the documentation policy of supporting YAML format, the script was updated to also generate a YAML version of the memory records.

## The Cost
- Limited output format options for downstream processing
- Inconsistency with the documentation policy that prefers YAML for configuration and data exchange
- Missing opportunity to provide easily readable structured data in YAML format
- Users had to convert JSON to YAML if they needed that format

## The Rule
1. **Multi-Format Output**: The `read_all.py` script must generate both JSON and YAML versions of memory records.

2. **YAML Formatting**: YAML output must use proper multiline string formatting (literal style with `|`) for content with line breaks to ensure readability.

3. **Consistent Naming**: Output files should follow consistent naming patterns:
   - `combined_text.txt` - Aggregated text content
   - `combined_memory.json` - Structured JSON memory records
   - `combined_text.yaml` - Structured YAML memory records

4. **Custom Representers**: Use custom YAML representers to handle multiline strings appropriately with the `|` indicator.

5. **Encoding Handling**: Ensure proper UTF-8 encoding for both input and output operations.

## Implementation
- Updated `read_all.py` to import and use the `yaml` module
- Added custom string representer for multiline content
- Created separate YAML output file with proper formatting
- Maintained all existing functionality while adding YAML support
- Used `yaml.dump()` with appropriate parameters for clean output