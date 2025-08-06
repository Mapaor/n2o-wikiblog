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
): Promise<Blob> {
  const zip = new JSZip();
  const total = images.length;
  let successCount = 0;
  let processedCount = 0;
  
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    processedCount = i + 1;
    
    try {
      console.log(`Downloading image ${processedCount}/${total}: ${image.filename}`);
      
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
      
      // Handle duplicate filenames by appending a counter
      let finalFilename = image.filename;
      let counter = 1;
      while (zip.file(finalFilename)) {
        const dotIndex = image.filename.lastIndexOf('.');
        if (dotIndex !== -1) {
          const name = image.filename.substring(0, dotIndex);
          const extension = image.filename.substring(dotIndex);
          finalFilename = `${name}_${counter}${extension}`;
        } else {
          finalFilename = `${image.filename}_${counter}`;
        }
        counter++;
      }
      
      zip.file(finalFilename, blob);
      successCount++;
      console.log(`✓ Successfully downloaded: ${finalFilename}`);
      
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
  
  return await zip.generateAsync({ type: 'blob' });
}