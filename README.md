# TRACE

**TRACE** is an open, minimal, and verifiable provenance layer for **AI-generated and AI-transformed content**.

TRACE defines a clear, opinionated **AI provenance profile** built on top of existing standards such as **C2PA**, starting with **video** and designed to scale across all modalities.

---

## What TRACE Is

TRACE provides:

* A **semantic provenance profile for AI content**

* A **verifiable chain of custody** for generated and transformed media

* **Clear, human-readable verification results**

* A **reference open-source implementation**

TRACE focuses on **provenance**, not detection.

---

## What TRACE Is Not

TRACE does **not**:

* detect all AI-generated content

* infer intent, truth, or factual accuracy

* resist extreme adversarial attacks (e.g. screen recording)

* replace human judgment

* act as a content moderation system

Inconclusive results are valid outcomes.

---

## Why TRACE Exists

AI systems can now generate highly realistic content at scale, breaking implicit trust in digital media.

While standards like **C2PA** provide a strong foundation for provenance, they are intentionally generic. TRACE fills the gap by defining:

* how **AI generation and transformation** should be declared;

* how provenance should be **interpreted**;

* how verification results should be **communicated**.

TRACE complements C2PA — it does not compete with it.

---

## Architecture Overview

TRACE is structured as:

* **Shared Core (media-agnostic)**

  * provenance manifest

  * cryptographic signature

  * independent verification

* **Media Profiles**

  * `video-profile` (v0.1 — current)

  * `image-profile` (future)

  * `audio-profile` (future)

  * `text-profile` (future)

---

## Current Scope (MVP)

The current MVP implements:

* Video provenance (`video-profile v0.1`)

* Offline assets (MP4 / WebM)

* Signed provenance manifests

* Mandatory sidecar files

* Optional container metadata embedding

* Local verification

---

## How TRACE Works

### 1. Stamp

After final video encoding, TRACE:

* computes a cryptographic hash of the asset;

* creates a provenance manifest;

* signs the manifest;

* attaches it to the asset.

### 2. Verify

TRACE verification:

* extracts the manifest;

* validates the signature;

* recomputes the asset hash;

* produces a clear verification report.

---

## Verification Results

TRACE verification produces one of three outcomes:

* **VALID** — provenance present and cryptographically verified

* **INVALID** — provenance present but invalid or tampered

* **INCONCLUSIVE** — provenance missing or unverifiable

TRACE never emits false positives.

---

## Compatibility with C2PA

TRACE is fully compatible with **C2PA (Content Provenance and Authenticity)**.

TRACE:

* can be encapsulated within C2PA manifests;

* acts as an AI-specific semantic profile;

* does not modify or replace the C2PA specification.

C2PA is treated as a foundational provenance layer.

---

## Future Work (Not Part of the MVP)

Potential future extensions include:

* invisible watermark integration

* segment-based hashing

* live video support

* public key directories

* full multimodal profiles

These are explicitly out of scope for v0.1.

---

## Repository Structure

```
/spec
  trace-spec-v0.1.md

/cli
  trace-stamp
  trace-verify

/examples
  sample.mp4
  sample.prov.json
  sample.prov.sig
```

---

## Installation

```bash
npm install
npm run build
```

## Usage

### Stamping a video

```bash
npm run stamp -- <video-file>
```

### Verifying a video

```bash
npm run verify -- <video-file>
```

---

## Status

TRACE is currently **experimental** and intended as a **reference implementation**.

Feedback, critique, and contributions are encouraged.

---

## License

TRACE is released under the **Apache 2.0 License**.

---

## Contributing

Contributions are welcome.

Please focus on:

* correctness over completeness;

* clarity over complexity;

* explicit limitations over implicit assumptions.

---

## Acknowledgements

TRACE builds on the work of the **C2PA** community and related open standards for content provenance.

