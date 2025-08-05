import { useState } from 'react';
import { extractImagesFromBlocks, downloadImages } from '../utils/getImages';
import type { Block } from '../notion/types';

export function useImageDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [zipBlob, setZipBlob] = useState<Blob | null>(null); // Store the ZIP blob

  const prepareImagesZip = async (blocks: Block[]) => {
    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: 0 });
    setZipBlob(null);

    try {
      // Extract image information from blocks
      const images = extractImagesFromBlocks(blocks);
      
      if (images.length === 0) {
        console.log('No images found in this page.');
        setIsDownloading(false);
        return null;
      }

      console.log(`Found ${images.length} images to download`);
      setDownloadProgress({ current: 0, total: images.length });

      // Download and zip images
      const zipBlob = await downloadImages(images, (current, total) => {
        setDownloadProgress({ current, total });
      });

      // Check if zip has any content
      if (zipBlob.size === 0) {
        console.warn('No images could be downloaded.');
        return null;
      }

      console.log('Images prepared successfully');
      setZipBlob(zipBlob);
      return zipBlob;

    } catch (error) {
      console.error('Error preparing images:', error);
      return null;
    } finally {
      setIsDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const downloadZip = (pageId: string) => {
    if (!zipBlob) {
      alert('No hi ha imatges preparades per descarregar.');
      return;
    }

    // Create download link
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notion-page-${pageId}-images.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    prepareImagesZip,
    downloadZip,
    isDownloading,
    downloadProgress,
    hasImages: zipBlob !== null
  };
}