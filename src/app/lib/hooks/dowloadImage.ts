import { useState } from 'react';
import { extractImagesFromBlocks, downloadImages } from '../utils/getImages';
import type { Block } from '../notion/types';
import JSZip from 'jszip';

export function useImageDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [zipBlob, setZipBlob] = useState<Blob | null>(null); // Store the ZIP blob
  const [downloadStats, setDownloadStats] = useState({ successful: 0, total: 0 }); // Track download statistics
  const [imageMapping, setImageMapping] = useState<Map<string, string>>(new Map()); // URL to filename mapping

  const prepareImagesZip = async (blocks: Block[], setError?: (error: string) => void) => {
    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: 0 });
    setZipBlob(null);
    setDownloadStats({ successful: 0, total: 0 });
    setImageMapping(new Map());

    try {
      // Extract image information from blocks
      const images = await extractImagesFromBlocks(blocks, setError);
      
      if (images.length === 0) {
        console.log('No images found in this page.');
        setIsDownloading(false);
        return { zipBlob: null, imageMapping: new Map<string, string>() };
      }

      console.log(`Found ${images.length} images to download`);
      setDownloadProgress({ current: 0, total: images.length });
      setDownloadStats({ successful: 0, total: images.length });

      // Download and zip images
      const { zipBlob, imageMapping: downloadedImageMapping } = await downloadImages(images, (current, total) => {
        setDownloadProgress({ current, total });
      });

      // Check if zip has any content
      if (zipBlob.size === 0) {
        console.warn('No images could be downloaded.');
        setDownloadStats({ successful: 0, total: images.length });
        if (setError) {
          setError('No s\'han pogut descarregar les imatges. Pot ser que els enllaços hagin caducat.');
        }
        return { zipBlob: null, imageMapping: new Map<string, string>() };
      }

      // Count successful downloads from the ZIP
      const zipContent = await JSZip.loadAsync(zipBlob);
      const successfulCount = Object.keys(zipContent.files).length;
      
      console.log('Images prepared successfully');
      setZipBlob(zipBlob);
      setImageMapping(downloadedImageMapping);
      setDownloadStats({ successful: successfulCount, total: images.length });
      return { zipBlob, imageMapping: downloadedImageMapping };

    } catch (error) {
      console.error('Error preparing images:', error);
      if (setError) {
        setError(`Error preparant les imatges: ${error instanceof Error ? error.message : 'Error desconegut'}`);
      }
      return { zipBlob: null, imageMapping: new Map<string, string>() };
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
    hasImages: zipBlob !== null,
    downloadStats,
    imageMapping
  };
}