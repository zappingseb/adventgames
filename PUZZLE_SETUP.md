# Puzzle Game Setup Guide

This guide explains how to set up and upload puzzle images to Google Cloud Storage for the jigsaw puzzle game.

## Overview

The puzzle game splits images on-the-fly in the browser using canvas. You only need to upload the full images to Cloud Storage - the game will handle splitting them into pieces automatically.

## Image Storage Structure

Puzzle images are stored in the `advent-game-runner` bucket with the following structure:

```
puzzles/
  {puzzle_id}/
    image.png (or image.jpg) - Full image for puzzle
    preview.png (or preview.jpg) - Preview/thumbnail image
    metadata.json - Puzzle metadata (optional)
```

## Step 1: Prepare Your Images

1. Choose images you want to use as puzzles
2. Create a preview/thumbnail version (recommended size: 200x200px or similar)
3. Ensure the main image is in PNG or JPG format

## Step 2: Create Metadata (Optional)

Create a `metadata.json` file for each puzzle with the following structure:

```json
{
  "title": "My Puzzle",
  "description": "A description of the puzzle"
}
```

## Step 3: Organize Files Locally

Create a local directory structure matching Cloud Storage:

```
puzzles/
  puzzle1/
    image.jpg
    preview.jpg
    metadata.json
  puzzle2/
    image.png
    preview.png
    metadata.json
```

## Step 4: Upload to Google Cloud Storage

Use the provided upload script which automatically compresses images to max 500KB using ImageMagick.

### Using the Upload Script

**Prerequisites:**
- ImageMagick installed (`brew install imagemagick`)
- Node.js installed
- `gcloud-storage-admin-key.json` in the project root

**Usage:**

```bash
./scripts/uploadPuzzles.sh [puzzles-directory]
```

If no directory is specified, it defaults to `./uploadpuzzle`.

**What the script does:**
1. Checks for ImageMagick and Node.js
2. Compresses all images to max 500KB (maintains quality as much as possible)
3. Creates preview images if they don't exist
4. Uploads compressed images to Google Cloud Storage
5. Shows progress and file sizes

**Example:**
```bash
# Upload from default directory (./uploadpuzzle)
./scripts/uploadPuzzles.sh

# Upload from custom directory
./scripts/uploadPuzzles.sh ./my-puzzles
```

The script will:
- Compress `image.png/jpg` files to max 500KB
- Compress `preview.png/jpg` files to max 500KB
- Create preview images automatically if missing
- Upload everything to `puzzles/{puzzle_id}/` in Cloud Storage

### Manual Upload via Google Cloud Console

1. Go to Google Cloud Console > Cloud Storage
2. Navigate to the `advent-game-runner` bucket
3. Create a `puzzles/` folder if it doesn't exist
4. For each puzzle:
   - Create a folder: `puzzles/{puzzle_id}/`
   - Upload `image.png` (or `.jpg`)
   - Upload `preview.png` (or `.jpg`)
   - Upload `metadata.json` (optional)

## Naming Conventions

- Puzzle IDs should be lowercase, use hyphens or underscores (e.g., `puzzle-1`, `my_puzzle`)
- Image files can be named `image.png`, `image.jpg`, `preview.png`, or `preview.jpg`
- The API will try PNG first, then JPG as fallback

## API Endpoints

Once uploaded, puzzles are accessible via:

- `GET /api/puzzles` - List all available puzzles
- `GET /api/puzzles/:puzzleId/preview` - Get preview image URL
- `GET /api/puzzles/:puzzleId/image` - Get full puzzle image URL

## Testing

After uploading, test the puzzle game:

1. Navigate to `/puzzle` in the application
2. You should see your puzzles in the selection screen
3. Select a puzzle and difficulty level
4. The game should load and split the image automatically

## Notes

- Images are split on-the-fly in the browser - no pre-splitting needed
- The game supports Easy (6 pieces), Medium (24 pieces), and Hard (48 pieces) difficulty levels
- Piece counts adjust automatically based on device orientation (portrait/landscape)
- Images should be reasonably sized (recommended: 800x600 to 1920x1080) for best performance

