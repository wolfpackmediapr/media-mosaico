
import { useState, useEffect } from "react";

export const usePdfThumbnail = (file: File | null) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Clean up thumbnail URL when component unmounts or file changes
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);

  useEffect(() => {
    if (!file) {
      setThumbnailUrl(null);
      return;
    }

    const generateThumbnail = async () => {
      if (file.type !== 'application/pdf') return;
      
      setIsGenerating(true);
      try {
        // Create a blob URL for the PDF file
        const pdfUrl = URL.createObjectURL(file);
        
        // Load the PDF.js library dynamically
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set the worker source
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        // Get the first page
        const page = await pdf.getPage(1);
        
        // Set scale for the rendering
        const viewport = page.getViewport({ scale: 0.5 });
        
        // Create a canvas to render the page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Render the page to the canvas
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          // Convert canvas to blob URL
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbUrl = URL.createObjectURL(blob);
              setThumbnailUrl(thumbUrl);
            }
            setIsGenerating(false);
          }, 'image/png');
        }
        
        // Clean up PDF URL
        URL.revokeObjectURL(pdfUrl);
      } catch (error) {
        console.error('Error generating PDF thumbnail:', error);
        setIsGenerating(false);
      }
    };

    generateThumbnail();
  }, [file]);

  return { thumbnailUrl, isGenerating };
};
