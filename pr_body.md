🎯 **What:** The track snapshot mapping functions (`trackSnapshotColumns` and `trackSnapshotFromRow`) were previously untested. This PR adds test coverage to ensure correct mapping of input track metadata to normalized snapshot representations and backwards.
📊 **Coverage:** The new tests cover:
  - `trackSnapshotColumns`: Undefined/empty track objects, whitespace trimming for titles, correct rounding of fractional durations, and proper artist list sanitization (filtering out empty names, filling missing IDs, and stripping undefined fields).
  - `trackSnapshotFromRow`: Complete track mapping from normalized database row representation, resilient handling of empty or invalid JSON artist strings, and ensuring that missing duration/artwork columns do not inject `null` back into the client-facing track object (stripping keys entirely).
✨ **Result:** Improved test coverage and guaranteed consistency of track normalization during object mapping.
