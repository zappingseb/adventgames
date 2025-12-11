#!/bin/bash

# Upload puzzle images to Google Cloud Storage
# This script compresses images to max 500KB using ImageMagick and uploads them
#
# Usage: ./scripts/uploadPuzzles.sh [puzzles-directory]
# Default: ./uploadpuzzle

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get puzzles directory from argument or use default
PUZZLES_DIR="/Users/sew/Documents/git/adventgames/uploadpuzzle"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMP_DIR="$PROJECT_ROOT/temp-puzzle-uploads"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}✗ ImageMagick (convert) not found${NC}"
    echo "Please install ImageMagick: brew install imagemagick"
    exit 1
fi
echo -e "${GREEN}✓ ImageMagick found${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}"

# Check if puzzles directory exists
if [ ! -d "$PUZZLES_DIR" ]; then
    echo -e "${RED}✗ Puzzles directory not found: $PUZZLES_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Puzzles directory found: $PUZZLES_DIR${NC}"

# Check if gcloud-storage-admin-key.json exists
KEY_FILE="$PROJECT_ROOT/gcloud-storage-admin-key.json"
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}✗ Cloud Storage key file not found: $KEY_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Cloud Storage key file found${NC}"

# Create temp directory for compressed images
echo -e "${BLUE}Creating temporary directory for compressed images...${NC}"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Function to compress image to max 500KB
compress_image() {
    local input_file="$1"
    local output_file="$2"
    local max_size=500000  # 500KB in bytes
    
    echo -e "${YELLOW}  Compressing: $(basename "$input_file")${NC}"
    
    # Get current file size
    current_size=$(stat -f%z "$input_file" 2>/dev/null || stat -c%s "$input_file" 2>/dev/null)
    
    if [ "$current_size" -le "$max_size" ]; then
        echo -e "${GREEN}    Image already under 500KB, copying as-is${NC}"
        cp "$input_file" "$output_file"
        return 0
    fi
    
    # Try different quality levels to get under 500KB
    local quality=85
    local attempts=0
    local max_attempts=10
    
    while [ $attempts -lt $max_attempts ]; do
        # Convert image, reducing quality
        if [[ "$input_file" == *.png ]]; then
            # For PNG, convert to JPEG for better compression
            convert "$input_file" -quality $quality -strip "$output_file" 2>/dev/null || {
                # If conversion fails, try resizing
                convert "$input_file" -resize 80% -quality $quality -strip "$output_file" 2>/dev/null
            }
        else
            # For JPEG, just reduce quality
            convert "$input_file" -quality $quality -strip "$output_file" 2>/dev/null
        fi
        
        # Check new size
        new_size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
        
        if [ "$new_size" -le "$max_size" ]; then
            echo -e "${GREEN}    Compressed to ${new_size} bytes (quality: $quality)${NC}"
            return 0
        fi
        
        # Reduce quality further
        quality=$((quality - 10))
        attempts=$((attempts + 1))
    done
    
    # If still too large, resize the image
    echo -e "${YELLOW}    Still too large, resizing image...${NC}"
    convert "$input_file" -resize 70% -quality 75 -strip "$output_file" 2>/dev/null
    
    new_size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
    if [ "$new_size" -le "$max_size" ]; then
        echo -e "${GREEN}    Compressed to ${new_size} bytes after resizing${NC}"
        return 0
    else
        echo -e "${YELLOW}    Warning: Image still ${new_size} bytes (target: ${max_size} bytes)${NC}"
        return 0  # Continue anyway
    fi
}

# Process each puzzle directory
echo -e "${BLUE}Processing puzzles...${NC}"
puzzle_count=0

# Check if directory contains subdirectories or files directly
has_subdirs=false
for item in "$PUZZLES_DIR"/*; do
    if [ -d "$item" ]; then
        has_subdirs=true
        break
    fi
done

if [ "$has_subdirs" = true ]; then
    # Process subdirectories (puzzle1/, puzzle2/, etc.)
    echo -e "${BLUE}Found puzzle subdirectories${NC}"
    for puzzle_dir in "$PUZZLES_DIR"/*; do
        if [ ! -d "$puzzle_dir" ]; then
            continue
        fi
        
        puzzle_id=$(basename "$puzzle_dir")
        echo -e "${BLUE}Processing puzzle: $puzzle_id${NC}"
        
        # Create temp directory for this puzzle
        temp_puzzle_dir="$TEMP_DIR/$puzzle_id"
        mkdir -p "$temp_puzzle_dir"
        
        # Process image file
        image_found=false
        for ext in png jpg jpeg PNG JPG JPEG; do
            img_file="$puzzle_dir/image.$ext"
            if [ -f "$img_file" ]; then
                compress_image "$img_file" "$temp_puzzle_dir/image.jpg"
                image_found=true
                break
            fi
        done
        
        if [ "$image_found" = false ]; then
            echo -e "${YELLOW}  ⚠ No image file found (looking for image.png/jpg)${NC}"
        fi
        
        # Process preview file
        preview_found=false
        for ext in png jpg jpeg PNG JPG JPEG; do
            prev_file="$puzzle_dir/preview.$ext"
            if [ -f "$prev_file" ]; then
                compress_image "$prev_file" "$temp_puzzle_dir/preview.jpg"
                preview_found=true
                break
            fi
        done
        
        if [ "$preview_found" = false ]; then
            echo -e "${YELLOW}  ⚠ No preview file found (looking for preview.png/jpg)${NC}"
            # Create preview from main image if available
            if [ "$image_found" = true ]; then
                echo -e "${BLUE}  Creating preview from main image...${NC}"
                convert "$temp_puzzle_dir/image.jpg" -resize 200x200^ -gravity center -extent 200x200 "$temp_puzzle_dir/preview.jpg" 2>/dev/null || true
            fi
        fi
        
        # Copy metadata.json if it exists
        if [ -f "$puzzle_dir/metadata.json" ]; then
            cp "$puzzle_dir/metadata.json" "$temp_puzzle_dir/metadata.json"
            echo -e "${GREEN}  ✓ Copied metadata.json${NC}"
        fi
        
        puzzle_count=$((puzzle_count + 1))
        echo ""
    done
else
    # Process image files directly in the directory
    echo -e "${BLUE}Found image files directly in directory${NC}"
    for img_file in "$PUZZLES_DIR"/*; do
        # Check if file exists and is a regular file
        if [ ! -f "$img_file" ]; then
            continue
        fi
        
        # Check if it's an image file
        filename=$(basename "$img_file")
        is_image=false
        for ext in png jpg jpeg PNG JPG JPEG; do
            if [[ "$filename" == *.$ext ]]; then
                is_image=true
                break
            fi
        done
        
        if [ "$is_image" = false ]; then
            continue
        fi
        
        # Skip if it's already a preview or metadata file
        if [[ "$filename" == preview.* ]] || [[ "$filename" == metadata.* ]]; then
            continue
        fi
        
        # Use filename (without extension) as puzzle ID
        puzzle_id="${filename%.*}"
        echo -e "${BLUE}Processing puzzle: $puzzle_id${NC}"
        
        # Create temp directory for this puzzle
        temp_puzzle_dir="$TEMP_DIR/$puzzle_id"
        mkdir -p "$temp_puzzle_dir"
        
        # Compress main image
        compress_image "$img_file" "$temp_puzzle_dir/image.jpg"
        
        # Create preview from main image
        echo -e "${BLUE}  Creating preview from main image...${NC}"
        convert "$temp_puzzle_dir/image.jpg" -resize 200x200^ -gravity center -extent 200x200 "$temp_puzzle_dir/preview.jpg" 2>/dev/null || true
        
        # Check for metadata file with same base name
        metadata_file="$PUZZLES_DIR/${puzzle_id}.json"
        if [ -f "$metadata_file" ]; then
            cp "$metadata_file" "$temp_puzzle_dir/metadata.json"
            echo -e "${GREEN}  ✓ Found metadata.json${NC}"
        fi
        
        puzzle_count=$((puzzle_count + 1))
        echo ""
    done
fi

if [ $puzzle_count -eq 0 ]; then
    echo -e "${RED}✗ No puzzle directories found in $PUZZLES_DIR${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo -e "${GREEN}✓ Processed $puzzle_count puzzle(s)${NC}"
echo -e "${BLUE}Uploading to Google Cloud Storage...${NC}"

# Run Node.js upload script
cd "$PROJECT_ROOT"
node scripts/uploadPuzzles.js "$TEMP_DIR"

# Cleanup
echo -e "${BLUE}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Upload complete!${NC}"

