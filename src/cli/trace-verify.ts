#!/usr/bin/env node

/**
 * TRACE Verify CLI
 * 
 * Verifies provenance manifests for video files
 */

import { Command } from 'commander';
import { existsSync } from 'fs';
import { verifyManifest, getSidecarPaths, VerificationResult } from '../index.js';

const program = new Command();

program
  .name('trace-verify')
  .description('Verify TRACE provenance for a video file')
  .version('0.1.0')
  .argument('<video-file>', 'Path to the video file to verify')
  .option('-m, --manifest <path>', 'Path to manifest file (auto-detected if not provided)')
  .option('-s, --signature <path>', 'Path to signature file (auto-detected if not provided)')
  .action(async (videoFile: string, options) => {
    try {
      // Validate video file exists
      if (!existsSync(videoFile)) {
        console.error(`Error: Video file not found: ${videoFile}`);
        process.exit(1);
      }

      // Determine manifest and signature paths
      let manifestPath: string;
      let signaturePath: string;

      if (options.manifest && options.signature) {
        manifestPath = options.manifest;
        signaturePath = options.signature;
      } else {
        const sidecarPaths = getSidecarPaths(videoFile);
        manifestPath = sidecarPaths.manifestPath;
        signaturePath = sidecarPaths.signaturePath;
      }

      console.log(`Verifying provenance for: ${videoFile}`);
      console.log(`Manifest: ${manifestPath}`);
      console.log(`Signature: ${signaturePath}`);
      console.log('');

      // Verify manifest
      const { result, message } = verifyManifest(videoFile, manifestPath, signaturePath);

      // Display result
      switch (result) {
        case 'VALID':
          console.log('✓ VALID');
          console.log(`  ${message}`);
          break;
        case 'INVALID':
          console.log('✗ INVALID');
          console.log(`  ${message}`);
          process.exit(1);
          break;
        case 'INCONCLUSIVE':
          console.log('? INCONCLUSIVE');
          console.log(`  ${message}`);
          process.exit(1);
          break;
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

