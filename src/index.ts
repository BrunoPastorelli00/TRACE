/**
 * TRACE Core Library
 * 
 * Provides core functionality for creating and verifying provenance manifests
 * Implements TRACE Spec v0.1
 */

import { createHash, sign, verify, generateKeyPairSync, createPublicKey, KeyObject } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { randomBytes } from 'crypto';

export type Operation = 'ai_generated' | 'ai_transformed';
export type VerificationResult = 'VALID' | 'INVALID' | 'INCONCLUSIVE';
export type MediaType = 'video/mp4' | 'video/webm';

export interface Provider {
  id: string;
  name: string;
  public_key: string; // base64 encoded
}

export interface Model {
  id: string;
  version: string;
}

export interface ProvenanceManifest {
  spec_version: string;
  media_profile: string;
  provider: Provider;
  operation: Operation;
  model: Model;
  timestamps: {
    created_utc: string; // RFC3339
  };
  input: {
    hash: string | null; // sha256:... format or null
  };
  output: {
    hash: string; // sha256:... format
    media_type: MediaType;
  };
  claims: string[];
  nonce: string;
}

/**
 * Compute SHA-256 hash of a file and return in sha256:... format
 */
export function computeFileHash(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  const hashSum = createHash('sha256');
  hashSum.update(fileBuffer as any);
  const hashHex = hashSum.digest('hex');
  return `sha256:${hashHex}`;
}

/**
 * Generate an Ed25519 key pair for signing
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const keyPair = generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return {
    privateKey: keyPair.privateKey as string,
    publicKey: keyPair.publicKey as string
  };
}

/**
 * Extract public key from private key (Ed25519)
 * For Ed25519, we can derive the public key from the private key using Node.js crypto
 */
function extractPublicKey(privateKey: string): string {
  try {
    // For Ed25519, createPublicKey can extract the public key from the private key
    const publicKeyObj = createPublicKey({
      key: privateKey,
      format: 'pem'
    });
    const publicKeyPem = publicKeyObj.export({
      format: 'pem',
      type: 'spki'
    }) as string;
    return Buffer.from(publicKeyPem).toString('base64');
  } catch (error) {
    throw new Error(`Failed to extract public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a random nonce
 */
function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Canonical JSON serialization with lexicographically ordered keys
 */
function canonicalJSON(obj: any): string {
  // Sort keys recursively
  function sortKeys(o: any): any {
    if (o === null || typeof o !== 'object') {
      return o;
    }
    if (Array.isArray(o)) {
      return o.map(sortKeys);
    }
    const sorted: any = {};
    const keys = Object.keys(o).sort();
    for (const key of keys) {
      sorted[key] = sortKeys(o[key]);
    }
    return sorted;
  }
  
  return JSON.stringify(sortKeys(obj));
}

/**
 * Create a provenance manifest for a video file
 */
export function createManifest(
  videoPath: string,
  operation: Operation,
  provider: Provider,
  model: Model,
  privateKey: string,
  inputHash: string | null = null
): { manifest: ProvenanceManifest; signature: string } {
  // Compute file hash
  const outputHash = computeFileHash(videoPath);
  
  // Determine media type from extension
  const ext = videoPath.split('.').pop()?.toLowerCase() || 'mp4';
  const mediaType: MediaType = ext === 'webm' ? 'video/webm' : 'video/mp4';
  
  // Generate nonce
  const nonce = generateNonce();
  
  // Determine claims based on operation
  const claims = operation === 'ai_generated' 
    ? ['ai_generated'] 
    : ['ai_transformed'];
  
  // Create manifest
  const manifest: ProvenanceManifest = {
    spec_version: '0.1',
    media_profile: 'video',
    provider: {
      id: provider.id,
      name: provider.name,
      public_key: provider.public_key || extractPublicKey(privateKey)
    },
    operation,
    model: {
      id: model.id,
      version: model.version
    },
    timestamps: {
      created_utc: new Date().toISOString()
    },
    input: {
      hash: inputHash
    },
    output: {
      hash: outputHash,
      media_type: mediaType
    },
    claims,
    nonce
  };
  
  // Sign manifest with canonical JSON
  const manifestJson = canonicalJSON(manifest);
  const signature = signManifest(manifestJson, privateKey);
  
  return { manifest, signature };
}

/**
 * Sign a manifest using Ed25519
 */
function signManifest(manifestJson: string, privateKey: string): string {
  const data = Buffer.from(manifestJson, 'utf-8');
  const signObj = sign(null, data as any, privateKey);
  return signObj.toString('base64');
}

/**
 * Verify a provenance manifest
 */
export function verifyManifest(
  videoPath: string,
  manifestPath: string,
  signaturePath: string
): { result: VerificationResult; message: string } {
  // Check if files exist
  if (!existsSync(manifestPath)) {
    return {
      result: 'INCONCLUSIVE',
      message: 'Manifest file not found'
    };
  }
  
  if (!existsSync(signaturePath)) {
    return {
      result: 'INCONCLUSIVE',
      message: 'Signature file not found'
    };
  }
  
  if (!existsSync(videoPath)) {
    return {
      result: 'INCONCLUSIVE',
      message: 'Video file not found'
    };
  }
  
  try {
    // Read manifest and signature
    const manifestJson = readFileSync(manifestPath, 'utf-8');
    const manifest: ProvenanceManifest = JSON.parse(manifestJson);
    const signature = readFileSync(signaturePath, 'utf-8');
    
    // Verify signature using canonical JSON
    const canonicalJson = canonicalJSON(manifest);
    const publicKeyPem = Buffer.from(manifest.provider.public_key, 'base64').toString('utf-8');
    const publicKeyObj = createPublicKey(publicKeyPem);
    
    const data = Buffer.from(canonicalJson, 'utf-8');
    const signatureBuffer = Buffer.from(signature, 'base64');
    const signatureValid = verify(null, data as any, publicKeyObj, signatureBuffer as any);
    
    if (!signatureValid) {
      return {
        result: 'INVALID',
        message: 'Signature verification failed'
      };
    }
    
    // Compute current hash
    const currentHash = computeFileHash(videoPath);
    const manifestHash = manifest.output.hash;
    
    if (currentHash !== manifestHash) {
      return {
        result: 'INVALID',
        message: 'File hash mismatch - file may have been modified'
      };
    }
    
    return {
      result: 'VALID',
      message: 'Provenance verified successfully'
    };
  } catch (error) {
    return {
      result: 'INCONCLUSIVE',
      message: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get sidecar file paths for a video file
 */
export function getSidecarPaths(videoPath: string): {
  manifestPath: string;
  signaturePath: string;
} {
  const ext = videoPath.split('.').pop() || '';
  const baseName = basename(videoPath, `.${ext}`);
  const dir = dirname(videoPath);
  const basePath = join(dir, baseName);
  
  return {
    manifestPath: `${basePath}.prov.json`,
    signaturePath: `${basePath}.prov.sig`
  };
}

/**
 * Save manifest and signature to sidecar files
 */
export function saveSidecarFiles(
  videoPath: string,
  manifest: ProvenanceManifest,
  signature: string
): void {
  const { manifestPath, signaturePath } = getSidecarPaths(videoPath);
  
  // Save with canonical JSON
  const canonicalJson = canonicalJSON(manifest);
  writeFileSync(manifestPath, canonicalJson, 'utf-8');
  writeFileSync(signaturePath, signature, 'utf-8');
}
