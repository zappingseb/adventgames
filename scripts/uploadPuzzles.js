#!/usr/bin/env node

/**
 * Upload puzzle images to Google Cloud Storage
 * 
 * Usage: node scripts/uploadPuzzles.js <puzzles-directory>
 * 
 * The puzzles directory should have the following structure:
 * puzzles/
 *   puzzle1/
 *     image.jpg (compressed)
 *     preview.jpg (compressed)
 *     metadata.json (optional)
 * 
 * This script is typically called from uploadPuzzles.sh which handles
 * image compression using ImageMagick.
 */

import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET_NAME = process.env.LIV_IMAGES_BUCKET_NAME || 'advent-game-runner';

async function uploadPuzzles(puzzlesDir) {
  // Initialize Google Cloud Storage
  const keyFilePath = path.join(__dirname, '..', 'gcloud-storage-admin-key.json');
  
  let storage;
  try {
    await fs.access(keyFilePath);
    storage = new Storage({
      keyFilename: keyFilePath,
    });
    console.log('✓ Found Cloud Storage key file');
  } catch (error) {
    console.error('✗ Cloud Storage key file not found at:', keyFilePath);
    console.error('Please ensure gcloud-storage-admin-key.json exists in the project root');
    process.exit(1);
  }

  const bucket = storage.bucket(BUCKET_NAME);
  
  // Check if bucket exists
  const [exists] = await bucket.exists();
  if (!exists) {
    console.error(`✗ Bucket ${BUCKET_NAME} does not exist`);
    process.exit(1);
  }

  console.log(`✓ Connected to bucket: ${BUCKET_NAME}`);

  // Read puzzles directory
  const puzzlesPath = path.resolve(puzzlesDir);
  console.log(`Reading puzzles from: ${puzzlesPath}`);

  try {
    const entries = await fs.readdir(puzzlesPath, { withFileTypes: true });
    const puzzleDirs = entries.filter(entry => entry.isDirectory());

    if (puzzleDirs.length === 0) {
      console.log('No puzzle directories found');
      return;
    }

    console.log(`Found ${puzzleDirs.length} puzzle(s) to upload\n`);

    for (const puzzleDir of puzzleDirs) {
      const puzzleId = puzzleDir.name;
      const puzzlePath = path.join(puzzlesPath, puzzleId);
      
      console.log(`Uploading puzzle: ${puzzleId}`);

      // Upload image file (compressed images are typically .jpg)
      const imageFiles = ['image.jpg', 'image.png'];
      let imageUploaded = false;
      for (const imageFile of imageFiles) {
        const imagePath = path.join(puzzlePath, imageFile);
        try {
          await fs.access(imagePath);
          // Always upload as .jpg for consistency (even if source was .png)
          const destPath = `puzzles/${puzzleId}/image.jpg`;
          await bucket.upload(imagePath, {
            destination: destPath,
          });
          const stats = await fs.stat(imagePath);
          const sizeKB = (stats.size / 1024).toFixed(2);
          console.log(`  ✓ Uploaded image.jpg (${sizeKB} KB)`);
          imageUploaded = true;
          break;
        } catch (error) {
          // File doesn't exist, try next
        }
      }

      if (!imageUploaded) {
        console.log(`  ⚠ No image file found (tried: ${imageFiles.join(', ')})`);
      }

      // Upload preview file (compressed images are typically .jpg)
      const previewFiles = ['preview.jpg', 'preview.png'];
      let previewUploaded = false;
      for (const previewFile of previewFiles) {
        const previewPath = path.join(puzzlePath, previewFile);
        try {
          await fs.access(previewPath);
          // Always upload as .jpg for consistency
          const destPath = `puzzles/${puzzleId}/preview.jpg`;
          await bucket.upload(previewPath, {
            destination: destPath,
          });
          const stats = await fs.stat(previewPath);
          const sizeKB = (stats.size / 1024).toFixed(2);
          console.log(`  ✓ Uploaded preview.jpg (${sizeKB} KB)`);
          previewUploaded = true;
          break;
        } catch (error) {
          // File doesn't exist, try next
        }
      }

      if (!previewUploaded) {
        console.log(`  ⚠ No preview file found (tried: ${previewFiles.join(', ')})`);
      }

      // Upload metadata file (optional)
      const metadataPath = path.join(puzzlePath, 'metadata.json');
      try {
        await fs.access(metadataPath);
        const destPath = `puzzles/${puzzleId}/metadata.json`;
        await bucket.upload(metadataPath, {
          destination: destPath,
        });
        console.log(`  ✓ Uploaded metadata.json`);
      } catch (error) {
        console.log(`  ⚠ No metadata.json found (optional)`);
      }

      console.log('');
    }

    console.log('✓ Upload complete!');
  } catch (error) {
    console.error('Error reading puzzles directory:', error);
    process.exit(1);
  }
}

// Get puzzles directory from command line
const puzzlesDir = process.argv[2];

if (!puzzlesDir) {
  console.error('Usage: node scripts/uploadPuzzles.js <puzzles-directory>');
  console.error('Example: node scripts/uploadPuzzles.js ./my-puzzles');
  process.exit(1);
}

uploadPuzzles(puzzlesDir).catch(error => {
  console.error('Upload failed:', error);
  process.exit(1);
});

