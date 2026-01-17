# TRACE Spec v0.1 — Open Provenance Protocol for AI-Generated Content

**Status:** Draft

**Scope:** MVP (Video Profile)

## 1. Objective

Define the TRACE protocol: a minimal, open, and verifiable approach for recording and validating the provenance of content generated or transformed by AI systems, designed to be multimodal, with an initial focus on video.

This specification defines a media-specific profile (video-profile v0.1) built on a shared core.

## 2. General Architecture

TRACE is composed of:

**Shared Core (media-agnostic):**
- provenance manifest;
- cryptographic signature;
- independent verification.

**Media Profiles:**
- video-profile (v0.1 — this document);
- image-profile (future);
- audio-profile (future);
- text-profile (future).

## 3. Terminology

- **Asset**: The final content file delivered to a user (e.g., MP4, WebM)
- **Manifest**: A canonical JSON document describing provenance
- **Provider**: The entity that generates or transforms the content (AI system, editor, platform)
- **Stamp**: The act of creating, signing, and attaching a manifest to an asset
- **Verify**: The act of validating signature, integrity, and consistency

## 4. Flow

### 4.1 Stamp (Generation or Transformation)

1. Content generation or transformation is completed
2. Final encoding of the asset
3. Cryptographic hash of the asset is computed
4. Provenance manifest is created
5. Manifest is cryptographically signed
6. Manifest is attached to the asset (sidecar mandatory, embed optional)

### 4.2 Verify (Verification)

1. Manifest is extracted
2. Signature is verified
3. Asset hash is recomputed
4. Hashes are compared
5. A verification report is produced

## 5. Provenance Manifest

### 5.1 Format

- UTF-8 encoded JSON
- Canonical serialization
- Lexicographically ordered keys

### 5.2 Required Fields

```json
{
  "spec_version": "0.1",
  "media_profile": "video",
  "provider": {
    "id": "string",
    "name": "string",
    "public_key": "base64"
  },
  "operation": "ai_generated | ai_transformed",
  "model": {
    "id": "string",
    "version": "string"
  },
  "timestamps": {
    "created_utc": "RFC3339"
  },
  "input": {
    "hash": "sha256:..." | null
  },
  "output": {
    "hash": "sha256:...",
    "media_type": "video/mp4 | video/webm"
  },
  "claims": ["ai_generated", "ai_transformed"],
  "nonce": "string"
}
```

## 6. Hashing

- **Mandatory algorithm**: SHA-256
- The hash MUST be computed over the exact final asset file delivered
- Hash format: `sha256:<hex-encoded-hash>`
- Any modification to the asset invalidates integrity verification

## 7. Cryptographic Signature

- **Mandatory algorithm**: Ed25519
- The signature MUST cover the full canonical manifest
- Signature encoding: Base64

## 8. Attachment to the Asset

### 8.1 Sidecar (Mandatory for MVP)

- `asset.ext`
- `asset.prov.json`
- `asset.prov.sig`

The sidecar is considered the canonical attachment mechanism for v0.1.

### 8.2 Container Embed (Optional)

Manifest MAY be embedded in container metadata (e.g., MP4 / WebM)

Metadata removal through re-encoding is expected behavior

## 9. Chain of Custody

For transformation operations:

- `input.hash` MUST reference the hash of the source asset
- A new manifest MUST be generated for the output
- Multiple transformations are represented as successive manifests, forming an auditable chain.

## 10. Verification Results

### 10.1 Verification States

- **VALID** — Signature valid and asset hash matches
- **INVALID** — Signature invalid or hash mismatch
- **INCONCLUSIVE** — Manifest missing, incomplete, or unverifiable

### 10.2 Verifier Requirements

A verifier MUST:

- never infer authorship without a valid manifest;
- never emit false positives;
- clearly communicate limitations.

## 11. Compatibility with C2PA

TRACE is designed to be compatible with C2PA (Content Provenance and Authenticity).

Specifically, TRACE:

- MAY be encapsulated within C2PA manifests;
- MAY act as a semantic AI profile layered on top of C2PA;
- does NOT replace or modify the C2PA specification.

C2PA is treated as a foundational provenance layer.

## 12. Known Threats and Limitations

- Metadata removal during re-encoding
- Separation of sidecar files from assets
- Screen recording or analog capture

These behaviors are expected and are not considered protocol failures.

## 13. Out of Scope

- Probabilistic detection
- Invisible watermarking
- Live streaming
- Remote or centralized verification
- Legal identity of end users

## 14. License

This specification is distributed under the Apache 2.0 License.
