# TRACE Examples

This directory contains example files demonstrating TRACE provenance.

## Files

- `sample.mp4` - A sample video file (placeholder)
- `sample.prov.json` - Example provenance manifest
- `sample.prov.sig` - Example signature file

## Usage

To stamp a video file:

```bash
npm run stamp -- examples/sample.mp4 \
  --operation ai_generated \
  --provider-id "example-provider" \
  --provider-name "Example Provider" \
  --model-id "example-model" \
  --model-version "1.0.0"
```

For transformation operations, include the input hash:

```bash
npm run stamp -- examples/output.mp4 \
  --operation ai_transformed \
  --provider-id "example-provider" \
  --provider-name "Example Provider" \
  --model-id "example-model" \
  --model-version "1.0.0" \
  --input-hash "sha256:..."
```

To verify a video file:

```bash
npm run verify -- examples/sample.mp4
```

## Note

The example files are placeholders. Replace `sample.mp4` with an actual video file to test TRACE functionality.

