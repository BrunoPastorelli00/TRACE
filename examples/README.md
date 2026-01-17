# TRACE Examples

This directory contains example files demonstrating TRACE provenance.

> **Note**: For comprehensive usage documentation, see [USAGE.md](../USAGE.md).

## Files

- `sample.mp4` - A sample video file (placeholder - replace with an actual video file)
- `sample.prov.json` - Example provenance manifest
- `sample.prov.sig` - Example signature file

## Example Files

### Provenance Manifest (`sample.prov.json`)

This file shows the structure of a TRACE provenance manifest. The manifest includes:

- Specification version and media profile
- Provider information (ID, name, public key)
- Operation type (`ai_generated` or `ai_transformed`)
- Model information (ID and version)
- Timestamps
- Input/output hashes
- Claims and nonce

### Signature File (`sample.prov.sig`)

This file contains the base64-encoded Ed25519 signature of the canonical JSON manifest.

## Running Examples

### Prerequisites

1. Build the project:
   ```bash
   npm install
   npm run build
   ```

2. Add a test video file:
   ```bash
   # Copy or create a video file in this directory
   # For example: cp ~/my-video.mp4 examples/test-video.mp4
   ```

### Example 1: Stamping an AI-Generated Video

```bash
npm run stamp -- examples/test-video.mp4 \
  --operation ai_generated \
  --provider-id "example-provider" \
  --provider-name "Example Provider" \
  --model-id "example-model" \
  --model-version "1.0.0"
```

This will create:
- `test-video.prov.json` - The provenance manifest
- `test-video.prov.sig` - The cryptographic signature
- `trace-key.pem` - Private key (if auto-generated)
- `trace-key.pub.pem` - Public key (if auto-generated)

### Example 2: Stamping an AI-Transformed Video

First, compute the input hash:

```bash
# Using Node.js (after building)
node -e "const { computeFileHash } = require('../dist/index.js'); console.log(computeFileHash('examples/input.mp4'));"
```

Then stamp the transformed output:

```bash
npm run stamp -- examples/transformed-video.mp4 \
  --operation ai_transformed \
  --provider-id "example-provider" \
  --provider-name "Example Provider" \
  --model-id "example-model" \
  --model-version "1.0.0" \
  --input-hash "sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730"
```

### Example 3: Verifying a Video

```bash
npm run verify -- examples/test-video.mp4
```

Expected output:
- `✓ VALID` - If provenance is valid
- `✗ INVALID` - If provenance is invalid
- `? INCONCLUSIVE` - If provenance files are missing or unverifiable

### Example 4: Using Custom Keys

```bash
# First, generate keys (or use existing ones)
# The CLI will auto-generate keys, but you can use custom ones:

npm run stamp -- examples/test-video.mp4 \
  --operation ai_generated \
  --provider-id "example-provider" \
  --provider-name "Example Provider" \
  --model-id "example-model" \
  --model-version "1.0.0" \
  --key ./my-custom-key.pem
```

## Complete Example Workflow

Here's a complete example workflow:

```bash
# 1. Build the project
npm install
npm run build

# 2. Add a test video (replace with your video)
# cp ~/my-video.mp4 examples/test.mp4

# 3. Stamp the video
npm run stamp -- examples/test.mp4 \
  --operation ai_generated \
  --provider-id "test-provider" \
  --provider-name "Test Provider" \
  --model-id "test-model" \
  --model-version "1.0.0"

# 4. Verify the video
npm run verify -- examples/test.mp4

# Expected: ✓ VALID - Provenance verified successfully
```

## Understanding the Manifest

The manifest file (`*.prov.json`) contains all the provenance information:

```json
{
  "spec_version": "0.1",
  "media_profile": "video",
  "provider": {
    "id": "example-provider",
    "name": "Example Provider",
    "public_key": "base64-encoded-public-key"
  },
  "operation": "ai_generated",
  "model": {
    "id": "example-model",
    "version": "1.0.0"
  },
  "timestamps": {
    "created_utc": "2024-01-01T12:00:00.000Z"
  },
  "input": {
    "hash": null
  },
  "output": {
    "hash": "sha256:...",
    "media_type": "video/mp4"
  },
  "claims": ["ai_generated"],
  "nonce": "random-hex-string"
}
```

Key fields:
- `spec_version`: TRACE specification version
- `operation`: `ai_generated` or `ai_transformed`
- `provider`: Information about the AI service/provider
- `model`: Model ID and version used
- `output.hash`: SHA-256 hash of the video file (verifies integrity)
- `input.hash`: SHA-256 hash of input video (for transformations)

## Programmatic Examples

See [USAGE.md](../USAGE.md) for programmatic API usage examples in TypeScript/JavaScript.

## Troubleshooting

If you encounter issues:

1. Ensure the project is built: `npm run build`
2. Check that video files exist and are valid MP4 or WebM files
3. Verify file paths are correct (relative to project root)
4. See the [troubleshooting section](../USAGE.md#troubleshooting) in USAGE.md

## Next Steps

- Read the full [USAGE.md](../USAGE.md) guide
- Check out the [TRACE Specification](../spec/trace-spec-v0.1.md)
- Review [CONTRIBUTING.md](../CONTRIBUTING.md) to contribute improvements

