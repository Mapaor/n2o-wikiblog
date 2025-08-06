import JSZip from 'jszip';
import { Block, ImageBlock } from '../notion/types';
import fetchData from './fetchData';

interface ImageInfo {
  url: string;
  filename: string;
  blockId: string;
}

export async function extractImagesFromBlocks(
  blocks: Block[], 
  setError?: (error: string) => void
): Promise<ImageInfo[]> {
  const images: ImageInfo[] = [];
  
  async function processBlock(block: Block): Promise<void> {
    if (block.type === 'image') {
      const imageBlock = block as ImageBlock;
      let imageUrl = '';
      let filename = '';
      
      if (imageBlock.image.type === 'file' && imageBlock.image.file) {
        const url = imageBlock.image.file.url;
        const cleanUrl = url.split(/[?#]/)[0];
        filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
        imageUrl = url; // Use full URL for downloading
      } else if (imageBlock.image.type === 'external' && imageBlock.image.external) {
        imageUrl = imageBlock.image.external.url;
        // Extract filename from URL or generate one
        const cleanUrl = imageUrl.split(/[?#]/)[0];
        filename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
        if (!filename || !filename.includes('.')) {
          filename = `external_image_${block.id.replace(/-/g, '')}.jpg`;
        }
      }
      
      if (imageUrl && filename) {
        console.log(`Found image: ${filename} (${imageBlock.image.type}) - URL: ${imageUrl.substring(0, 100)}...`);
        images.push({
          url: imageUrl,
          filename,
          blockId: block.id
        });
      } else {
        console.warn(`Skipped image block ${block.id}: missing URL or filename`, {
          type: imageBlock.image.type,
          hasFile: !!imageBlock.image.file,
          hasExternal: !!imageBlock.image.external,
          url: imageUrl,
          filename
        });
      }
    }
    
    // Process children recursively if they exist
    if (block.has_children) {
      try {
        // If children are already loaded, use them
        if (block.children && Array.isArray(block.children)) {
          await processAllBlocks(block.children as Block[]);
        } else {
          // Otherwise fetch them from the API (like processBlocks does)
          const children = await fetchData(block.id, setError);
          if (children && Array.isArray(children)) {
            await processAllBlocks(children as Block[]);
          }
        }
      } catch (error) {
        console.warn(`Error processing children of block ${block.id}:`, error);
        // Continue processing other blocks even if this one fails
      }
    }
  }
  
  // Process all blocks recursively
  async function processAllBlocks(blockList: Block[]): Promise<void> {
    for (const block of blockList) {
      await processBlock(block);
    }
  }
  
  await processAllBlocks(blocks);
  
  console.log(`Image extraction complete. Found ${images.length} images:`, 
    images.map(img => ({ filename: img.filename, blockId: img.blockId }))
  );
  
  return images;
}

export async function downloadImages(
  images: ImageInfo[],
  onProgress?: (current: number, total: number) => void
): Promise<{ zipBlob: Blob; imageMapping: Map<string, string> }> {
  const zip = new JSZip();
  const total = images.length;
  let successCount = 0;
  let processedCount = 0;
  const imageMapping = new Map<string, string>();
  let imageCounter = 1; // Counter for sequential naming
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    processedCount = i + 1;
    
    try {
      console.log(`Downloading image ${processedCount}/${total}: ${image.filename} -> image${imageCounter}`);
      
      const response = await fetch(image.url);
      if (!response.ok) {
        console.warn(`Failed to download image: ${image.filename} (${response.status} ${response.statusText})`);
        if (onProgress) onProgress(processedCount, total);
        continue;
      }
      
      const blob = await response.blob();
      
      // Ensure we have a valid image blob
      if (blob.size === 0) {
        console.warn(`Empty blob for image: ${image.filename}`);
        if (onProgress) onProgress(processedCount, total);
        continue;
      }
      
      // Get file extension from original filename or URL
      let extension = '';
      if (image.filename.includes('.')) {
        extension = image.filename.substring(image.filename.lastIndexOf('.'));
      } else {
        // Try to guess extension from content type
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
          extension = '.jpg';
        } else if (contentType?.includes('png')) {
          extension = '.png';
        } else if (contentType?.includes('gif')) {
          extension = '.gif';
        } else if (contentType?.includes('webp')) {
          extension = '.webp';
        } else {
          extension = '.jpg'; // Default fallback
        }
      }
      
      // Generate simple sequential filename
      const finalFilename = `image${imageCounter}${extension}`;
      imageCounter++;
      
      zip.file(finalFilename, blob);
      successCount++;
      console.log(`✓ Successfully downloaded: ${image.filename} -> ${finalFilename}`);
      
      // Add to image mapping (URL -> sequential filename)
      imageMapping.set(image.url, finalFilename);
      
      // Update progress after successful download
      if (onProgress) onProgress(processedCount, total);
      
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`✗ Error downloading image ${image.filename}:`, error);
      if (onProgress) onProgress(processedCount, total);
    }
  }
  
  console.log(`Successfully downloaded ${successCount}/${total} images`);
  
  if (successCount === 0) {
    throw new Error('No images could be downloaded');
  }
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { zipBlob, imageMapping };
}