# Standard 012: Context Utility Manifest - The Invisible Infrastructure

## What Happened?
The Anchor Core system was originally conceived as a chat application, but has evolved into a unified cognitive infrastructure. The system now needs to transition from "active user input" to "passive observation" to function as truly invisible infrastructure like electricity - always present but never demanding attention.

## The Cost
- UI bloat with multiple chat interfaces competing for user attention
- Manual data entry required to populate context
- Users having to copy/paste information instead of automatic capture
- Architecture treating UI as primary rather than as debugging tool
- Missing opportunity to create true "ambient intelligence"

## The Rule
1. **Headless by Default**: All core functionality must operate without user interface interaction
   ```python
   # Core services run as background daemons
   daemon_services = [
       "memory_graph",      # CozoDB persistence
       "gpu_engine",        # WebLLM inference
       "context_capture",   # Screen/Audio observation
       "data_ingestion"     # Memory writing
   ]
   ```

2. **Passive Observation**: System captures context automatically rather than waiting for user input
   - **Eyes**: Automated screen sampling and OCR
   - **Ears**: Continuous audio transcription (when enabled)
   - **Memory**: Automatic ingestion without user intervention

3. **Architecture Priority**: `webgpu_bridge.py` is the nervous system; UIs are merely debugging/interaction tools
   - UIs are temporary visualization layers
   - Core logic exists independently of any UI
   - Background services operate without UI presence

4. **Invisible Utility**: The system should function like electricity - always available, rarely noticed, essential infrastructure
   - Zero user interaction required for core functions
   - Automatic context capture and storage
   - Seamless integration with user's workflow