/**
 * TRACE Metadata Embedding
 * 
 * Functions for embedding and extracting provenance manifests
 * in MP4/WebM container metadata
 * Implements TRACE Spec v0.1 Section 8.2 (Optional Container Embed)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

// TRACE UUID for MP4 UUID box: "TRACE-Prov-2024-v01"
// 16-byte UUID: 54 52 41 43 45 2d 50 72 6f 76 2d 32 30 32 34 2d
const TRACE_UUID = Buffer.from([
  0x54, 0x52, 0x41, 0x43, 0x45, 0x2d, 0x50, 0x72,
  0x6f, 0x76, 0x2d, 0x32, 0x30, 0x32, 0x34, 0x2d
]);

// TRACE tag name for WebM
const TRACE_WEBM_TAG = 'TRACEPROV';

export interface EmbeddedMetadata {
  manifest: string;
  signature: string;
}

/**
 * Embed provenance manifest and signature into MP4 file
 * Uses a custom UUID box in the 'meta' atom
 */
export function embedMetadataMP4(
  videoPath: string,
  manifest: string,
  signature: string
): void {
  let fileBuffer = readFileSync(videoPath);
  
  // Find moov box
  const moovBox = findAndParseBox(fileBuffer, 'moov');
  if (!moovBox) {
    throw new Error('MP4 file does not contain moov box');
  }
  
  // Find or create meta box in moov
  const existingMetaBox = findAndParseBox(moovBox.data, 'meta');
  let newMoovData: Buffer;
  
  const metadata = JSON.stringify({ manifest, signature });
  const metadataBuffer = Buffer.from(metadata, 'utf-8');
  
  let newMetaBox: Buffer;
  
  if (!existingMetaBox) {
    // Create new meta box
    newMetaBox = createMetaBox([{ uuid: TRACE_UUID, data: metadataBuffer }]);
  } else {
    // Update existing meta box - remove old TRACE UUID box if exists
    const uuidBoxes = extractUUIDBoxes(existingMetaBox.data);
    const otherUUIDBoxes = uuidBoxes.filter(box => !box.uuid.equals(TRACE_UUID));
    newMetaBox = createMetaBox([...otherUUIDBoxes, { uuid: TRACE_UUID, data: metadataBuffer }]);
  }
  
  // Replace or add meta box in moov
  const moovWithoutMeta = removeBoxFromBuffer(moovBox.data, 'meta');
  newMoovData = insertBox(moovWithoutMeta, newMetaBox);
  
  // Rebuild moov box
  const newMoovBox = createBox('moov', newMoovData);
  
  // Replace moov box in file
  const newFile = replaceBoxInFile(fileBuffer, 'moov', newMoovBox);
  
  writeFileSync(videoPath, newFile);
}

/**
 * Extract provenance manifest and signature from MP4 file
 */
export function extractMetadataMP4(videoPath: string): EmbeddedMetadata | null {
  if (!existsSync(videoPath)) {
    return null;
  }
  
  const fileBuffer = readFileSync(videoPath);
  const moovBox = findAndParseBox(fileBuffer, 'moov');
  if (!moovBox) {
    return null;
  }
  
  const metaBox = findAndParseBox(moovBox.data, 'meta');
  if (!metaBox) {
    return null;
  }
  
  // Find our UUID box
  const uuidBoxes = extractUUIDBoxes(metaBox.data);
  const traceBox = uuidBoxes.find(box => box.uuid.equals(TRACE_UUID));
  
  if (!traceBox) {
    return null;
  }
  
  // Parse JSON
  try {
    const metadata = JSON.parse(traceBox.data.toString('utf-8'));
    return {
      manifest: metadata.manifest,
      signature: metadata.signature
    };
  } catch {
    return null;
  }
}

/**
 * Embed provenance manifest and signature into WebM file
 * Uses a custom tag element (simplified implementation)
 */
export function embedMetadataWebM(
  videoPath: string,
  manifest: string,
  signature: string
): void {
  // WebM uses EBML - simplified implementation
  // Note: This is a basic implementation. For production, consider using
  // a proper EBML library or calling external tools like ffmpeg/mkvmerge
  
  const fileBuffer = readFileSync(videoPath);
  const metadata = JSON.stringify({ manifest, signature });
  
  // Create a simple tag at the end (this works but isn't ideal)
  // Production should use proper EBML structure
  const tagMarker = Buffer.from(`\n<!--TRACEPROV:${Buffer.from(metadata).toString('base64')}-->`, 'utf-8');
  
  writeFileSync(videoPath, Buffer.concat([fileBuffer, tagMarker]));
}

/**
 * Extract provenance manifest and signature from WebM file
 */
export function extractMetadataWebM(videoPath: string): EmbeddedMetadata | null {
  if (!existsSync(videoPath)) {
    return null;
  }
  
  const fileBuffer = readFileSync(videoPath);
  const tagMarker = '<!--TRACEPROV:';
  const tagMarkerBytes = Buffer.from(tagMarker, 'utf-8');
  
  const index = fileBuffer.lastIndexOf(tagMarkerBytes);
  if (index === -1) {
    return null;
  }
  
  const start = index + tagMarkerBytes.length;
  const end = fileBuffer.indexOf('-->', start);
  if (end === -1) {
    return null;
  }
  
  try {
    const base64Data = fileBuffer.subarray(start, end).toString('utf-8');
    const metadata = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));
    return {
      manifest: metadata.manifest,
      signature: metadata.signature
    };
  } catch {
    return null;
  }
}

/**
 * Box structure for MP4
 */
interface Box {
  size: number;
  type: string;
  data: Buffer;
  startOffset: number;
}

/**
 * Find and parse a box in buffer
 */
function findAndParseBox(buffer: Buffer, boxType: string, startOffset: number = 0): Box | null {
  const typeBytes = Buffer.from(boxType, 'ascii');
  let offset = startOffset;
  
  while (offset < buffer.length - 8) {
    let size = readUInt32BE(buffer, offset);
    const offsetStart = offset;
    
    // Handle extended size
    if (size === 1) {
      if (offset + 16 > buffer.length) break;
      size = Number(readUInt64BE(buffer, offset + 8));
      offset += 16;
    } else {
      offset += 4;
    }
    
    // Check type
    if (offset + 4 > buffer.length) break;
    const type = buffer.subarray(offset, offset + 4);
    
    if (type.equals(typeBytes)) {
      const dataStart = offset + 4;
      const dataEnd = offsetStart + size;
      
      // Handle version/flags for fullbox types
      let dataOffset = 0;
      if (['meta'].includes(boxType)) {
        dataOffset = 4; // Skip version(1) + flags(3)
      }
      
      const data = buffer.subarray(dataStart + dataOffset, dataEnd);
      
      return {
        size,
        type: boxType,
        data,
        startOffset: offsetStart
      };
    }
    
    offset = offsetStart + size;
    if (size === 0) break; // Prevent infinite loop
  }
  
  return null;
}

/**
 * Extract all UUID boxes from meta box data
 */
function extractUUIDBoxes(metaData: Buffer): Array<{ uuid: Buffer; data: Buffer }> {
  const boxes: Array<{ uuid: Buffer; data: Buffer }> = [];
  let offset = 0;
  
  while (offset < metaData.length - 8) {
    let size = readUInt32BE(metaData, offset);
    
    if (size === 0 || size > metaData.length - offset) break;
    if (size === 1) {
      // Extended size
      size = Number(readUInt64BE(metaData, offset + 8));
      offset += 16;
    } else {
      offset += 4;
    }
    
    if (offset + 4 > metaData.length) break;
    const type = metaData.subarray(offset, offset + 4);
    
    if (type.equals(Buffer.from('uuid'))) {
      if (offset + 24 > metaData.length) break;
      const uuid = metaData.subarray(offset + 8, offset + 24);
      const dataStart = offset + 24;
      const dataEnd = offset - (size === 1 ? 16 : 4) + size;
      const data = metaData.subarray(dataStart, dataEnd);
      
      boxes.push({ uuid, data });
    }
    
    offset = offset - (size === 1 ? 16 : 4) + size;
    if (size === 0) break;
  }
  
  return boxes;
}

/**
 * Create a UUID box
 */
function createUUIDBox(uuid: Buffer, data: Buffer): Buffer {
  const boxSize = 4 + 4 + 16 + data.length;
  const box = Buffer.allocUnsafe(boxSize);
  
  box.writeUInt32BE(boxSize, 0);
  box.write('uuid', 4, 'ascii');
  uuid.copy(box, 8);
  data.copy(box, 24);
  
  return box;
}

/**
 * Create a meta box with UUID boxes
 */
function createMetaBox(uuidBoxes: Array<{ uuid: Buffer; data: Buffer }>): Buffer {
  const uuidBoxBuffers = uuidBoxes.map(box => createUUIDBox(box.uuid, box.data));
  const metaData = Buffer.concat(uuidBoxBuffers);
  
  // Meta box: size(4) + type(4) + version/flags(4) + data
  const boxSize = 4 + 4 + 4 + metaData.length;
  const box = Buffer.allocUnsafe(boxSize);
  
  box.writeUInt32BE(boxSize, 0);
  box.write('meta', 4, 'ascii');
  box.writeUInt32BE(0, 8); // version(1) + flags(3) = 0
  metaData.copy(box, 12);
  
  return box;
}

/**
 * Create a box
 */
function createBox(type: string, data: Buffer): Buffer {
  const boxSize = 4 + 4 + data.length;
  const box = Buffer.allocUnsafe(boxSize);
  
  box.writeUInt32BE(boxSize, 0);
  box.write(type, 4, 'ascii');
  data.copy(box, 8);
  
  return box;
}

/**
 * Remove a box from buffer
 */
function removeBoxFromBuffer(buffer: Buffer, boxType: string): Buffer {
  const box = findAndParseBox(buffer, boxType);
  if (!box) return buffer;
  
  const before = buffer.subarray(0, box.startOffset);
  const after = buffer.subarray(box.startOffset + box.size);
  
  return Buffer.concat([before, after]);
}

/**
 * Insert a box into buffer (at end)
 */
function insertBox(buffer: Buffer, box: Buffer): Buffer {
  return Buffer.concat([buffer, box]);
}

/**
 * Replace a box in file
 */
function replaceBoxInFile(fileBuffer: Buffer, boxType: string, newBox: Buffer): Buffer {
  const box = findAndParseBox(fileBuffer, boxType);
  if (!box) return fileBuffer;
  
  const before = fileBuffer.subarray(0, box.startOffset);
  const after = fileBuffer.subarray(box.startOffset + box.size);
  
  return Buffer.concat([before, newBox, after]);
}

/**
 * Read UInt32BE
 */
function readUInt32BE(buffer: Buffer, offset: number): number {
  return buffer.readUInt32BE(offset);
}

/**
 * Read UInt64BE (returns BigInt as number for simplicity)
 */
function readUInt64BE(buffer: Buffer, offset: number): bigint {
  return buffer.readBigUInt64BE(offset);
}

/**
 * Detect media type from file extension
 */
export function getMediaType(filePath: string): 'mp4' | 'webm' | null {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'mp4') return 'mp4';
  if (ext === 'webm') return 'webm';
  return null;
}

/**
 * Embed metadata into video file (auto-detects format)
 */
export function embedMetadata(
  videoPath: string,
  manifest: string,
  signature: string
): void {
  const mediaType = getMediaType(videoPath);
  if (!mediaType) {
    throw new Error(`Unsupported media type for file: ${videoPath}. Supported: mp4, webm`);
  }
  
  if (mediaType === 'mp4') {
    embedMetadataMP4(videoPath, manifest, signature);
  } else if (mediaType === 'webm') {
    embedMetadataWebM(videoPath, manifest, signature);
  }
}

/**
 * Extract metadata from video file (auto-detects format)
 */
export function extractMetadata(videoPath: string): EmbeddedMetadata | null {
  const mediaType = getMediaType(videoPath);
  if (!mediaType) {
    return null;
  }
  
  if (mediaType === 'mp4') {
    return extractMetadataMP4(videoPath);
  } else if (mediaType === 'webm') {
    return extractMetadataWebM(videoPath);
  }
  
  return null;
}
