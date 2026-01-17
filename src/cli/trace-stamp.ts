#!/usr/bin/env node

/**
 * TRACE Stamp CLI
 * 
 * Creates provenance manifests for video files
 * Implements TRACE Spec v0.1
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createPublicKey } from 'crypto';
import {
  createManifest,
  saveSidecarFiles,
  generateKeyPair,
  getSidecarPaths,
  Operation,
  Provider,
  Model
} from '../index.js';

const program = new Command();

program
  .name('trace-stamp')
  .description('Stamp a video file with TRACE provenance')
  .version('0.1.0')
  .argument('<video-file>', 'Path to the video file to stamp')
  .requiredOption('-o, --operation <operation>', 'Operation type (ai_generated, ai_transformed)')
  .requiredOption('--provider-id <id>', 'Provider identifier')
  .requiredOption('--provider-name <name>', 'Provider name')
  .requiredOption('--model-id <id>', 'Model identifier')
  .requiredOption('--model-version <version>', 'Model version')
  .option('-k, --key <path>', 'Path to private key file (generates new key if not provided)')
  .option('--provider-key <path>', 'Path to provider public key file (extracted from private key if not provided)')
  .option('--input-hash <hash>', 'Input hash for transformation operations (sha256:... format)')
  .action(async (videoFile: string, options) => {
    try {
      // Validate video file exists
      if (!existsSync(videoFile)) {
        console.error(`Error: Video file not found: ${videoFile}`);
        process.exit(1);
      }

      // Validate operation
      const operation = options.operation as Operation;
      if (!['ai_generated', 'ai_transformed'].includes(operation)) {
        console.error(`Error: Invalid operation: ${operation}. Must be 'ai_generated' or 'ai_transformed'`);
        process.exit(1);
      }

      // Load or generate private key
      let privateKey: string;
      let publicKey: string | undefined;
      
      if (options.key && existsSync(options.key)) {
        privateKey = readFileSync(options.key, 'utf-8');
      } else {
        console.log('Generating new Ed25519 key pair...');
        const keyPair = generateKeyPair();
        privateKey = keyPair.privateKey;
        publicKey = keyPair.publicKey;
        
        // Save private key if path provided
        if (options.key) {
          writeFileSync(options.key, privateKey, 'utf-8');
          const publicKeyPath = options.key.replace(/\.(pem|key)$/, '.pub.pem');
          writeFileSync(publicKeyPath, publicKey, 'utf-8');
          console.log(`Private key saved to: ${options.key}`);
          console.log(`Public key saved to: ${publicKeyPath}`);
        } else {
          // Save to default location
          const defaultKeyPath = join(process.cwd(), 'trace-key.pem');
          writeFileSync(defaultKeyPath, privateKey, 'utf-8');
          const publicKeyPath = join(process.cwd(), 'trace-key.pub.pem');
          writeFileSync(publicKeyPath, publicKey, 'utf-8');
          console.log(`Private key saved to: ${defaultKeyPath}`);
          console.log(`Public key saved to: ${publicKeyPath}`);
        }
      }

      // Get provider public key
      let providerPublicKey: string;
      if (options.providerKey && existsSync(options.providerKey)) {
        const providerKeyPem = readFileSync(options.providerKey, 'utf-8');
        providerPublicKey = Buffer.from(providerKeyPem).toString('base64');
      } else if (publicKey) {
        providerPublicKey = Buffer.from(publicKey).toString('base64');
      } else {
        // Extract from private key
        const publicKeyObj = createPublicKey({ key: privateKey, format: 'pem' });
        const publicKeyPem = publicKeyObj.export({ format: 'pem', type: 'spki' }) as string;
        providerPublicKey = Buffer.from(publicKeyPem).toString('base64');
      }

      // Create provider and model objects
      const provider: Provider = {
        id: options.providerId,
        name: options.providerName,
        public_key: providerPublicKey
      };

      const model: Model = {
        id: options.modelId,
        version: options.modelVersion
      };

      // Validate input hash format if provided
      let inputHash: string | null = options.inputHash || null;
      if (inputHash && !inputHash.startsWith('sha256:')) {
        console.error(`Error: Input hash must be in sha256:... format`);
        process.exit(1);
      }

      // For transformation operations, input hash should be provided
      if (operation === 'ai_transformed' && !inputHash) {
        console.warn('Warning: Transformation operation should include input hash');
      }

      console.log(`Creating provenance manifest for: ${videoFile}`);
      console.log(`Operation: ${operation}`);
      console.log(`Provider: ${provider.name} (${provider.id})`);
      console.log(`Model: ${model.id} v${model.version}`);

      // Create manifest
      const { manifest, signature } = createManifest(
        videoFile,
        operation,
        provider,
        model,
        privateKey,
        inputHash
      );

      // Save sidecar files
      saveSidecarFiles(videoFile, manifest, signature);

      console.log('✓ Provenance manifest created successfully');
      const { manifestPath, signaturePath } = getSidecarPaths(videoFile);
      console.log(`  Manifest: ${manifestPath}`);
      console.log(`  Signature: ${signaturePath}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
