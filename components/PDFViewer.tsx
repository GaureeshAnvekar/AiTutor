"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { PDFViewer as PDFViewerLib, EventBus, PDFLinkService } from "pdfjs-dist/web/pdf_viewer";
import "pdfjs-dist/web/pdf_viewer.css";

// Use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

interface PDFViewerProps {
  url: string;
  page?: number;
  onPageChange?: (page: number) => void;
  onTotalPages?: (total: number) => void;
}

export default function PDFViewer({ url, page = 1, onPageChange, onTotalPages }: PDFViewerProps) {
  console.log("inside PDFViewer");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfViewerRef = useRef<PDFViewerLib | null>(null);
  const [isPdfSet, setIsPdfSet] = useState(false);
  const isInitializedRef = useRef(false);
  const initializationInProgressRef = useRef(false);

  /*
  const renderPage = useCallback(async (pdf: any, pageNum: number) => {
    try {
      // Cancel any existing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      setIsLoading(true);
      const pdfPage = await pdf.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale: scale });
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext("2d");
      if (!context) return;
      
      // Clear the canvas completely
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set new dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Create new render task
      const renderTask = pdfPage.render({ 
        canvasContext: context, 
        viewport: viewport 
      });
      
      renderTaskRef.current = renderTask;
      
      await renderTask.promise;
      renderTaskRef.current = null;
      
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error("Error rendering PDF page:", err);
        setError("Failed to render PDF page");
      }
    } finally {
      setIsLoading(false);
    }
  }, [scale]);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Cancel any existing render task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        
        // Clear canvas before loading new PDF
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext("2d");
          if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        
        const pdf = await pdfjsLib.getDocument(url).promise;
        pdfRef.current = pdf;

        const totalPages = pdf.numPages;

        if (onTotalPages) {
          onTotalPages(totalPages);
        }

        const currentPage = Math.min(page, totalPages);
        await renderPage(pdf, currentPage);

        if (onPageChange && currentPage !== page) {
          onPageChange(currentPage);
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [url, renderPage]);

  useEffect(() => {
    if (pdfRef.current && page) {
      renderPage(pdfRef.current, page);
    }
  }, [page, renderPage]);
  */

  useEffect(() => {
    const load = async () => {
      console.log('PDF useEffect triggered', {
        hasContainer: !!containerRef.current,
        isInitialized: isInitializedRef.current,
        initializationInProgress: initializationInProgressRef.current,
        isPdfSet,
        url
      });

      // Check if already initialized or initialization in progress
      if (!containerRef.current || isInitializedRef.current || initializationInProgressRef.current) {
        console.log('Skipping PDF initialization - already initialized, in progress, or missing container');
        return;
      }

      console.log('Starting PDF initialization...');
      
      // Immediately mark as in progress to prevent race conditions
      initializationInProgressRef.current = true;
      
      // Clean up any existing viewer first
      if (pdfViewerRef.current) {
        console.log('Cleaning up existing PDF viewer');
        pdfViewerRef.current.setDocument(null);
        pdfViewerRef.current.cleanup?.();
        pdfViewerRef.current = null;
        

      }
      
      // Mark as initialized
      isInitializedRef.current = true;
      
      const container = containerRef.current!;
      const viewer = container.querySelector(".pdfViewer")!;

      // Clear any existing content in the viewer
      viewer.innerHTML = '';

      const eventBus = new EventBus();

      
      const linkService = new PDFLinkService({ eventBus });

      const pdfViewer = new PDFViewerLib({
        container: container,
        viewer,
        eventBus,
        linkService,
      });
      linkService.setViewer(pdfViewer);
      pdfViewerRef.current = pdfViewer;

      const loadingTask = pdfjsLib.getDocument(url);
      const pdfDoc = await loadingTask.promise;

      console.log("Setting document to PDF viewer");
      pdfViewer.setDocument(pdfDoc);
      linkService.setDocument(pdfDoc);

      eventBus.on('pagesinit', () => {
        console.log('Pages initialized');
        setIsLoading(false);
        setIsPdfSet(true);
        // Reset the in-progress flag when initialization is complete
        initializationInProgressRef.current = false;
        pdfViewerRef.current!.scrollPageIntoView({
          pageNumber: 1,
          destArray: [null, { name: "XYZ" }, 0, 0, 1],
        });
      });

      setIsLoading(false);
      setIsPdfSet(true);
      // Reset the in-progress flag when initialization is complete
      initializationInProgressRef.current = false;


      // Jump to page 1 initially
      //pdfViewer.currentPageNumber = 1;
    };

    load();
  }, [url]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      // Clean up PDF viewer
      if (pdfViewerRef.current) {
        pdfViewerRef.current.cleanup?.();
        pdfViewerRef.current = null;
      }
      // Reset initialization flags on unmount
      isInitializedRef.current = false;
      initializationInProgressRef.current = false;
    };
  }, []);

  // Reset initialization flags when URL changes
  useEffect(() => {
    isInitializedRef.current = false;
    initializationInProgressRef.current = false;
    setIsPdfSet(false);
  }, [url]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading page {page}...</p>
          </div>
        </div>
      )}


    <div
    ref={containerRef}
    className="pdfViewerContainer overflow-auto absolute"
    style={{ width: "100%", height: "80vh", position: "absolute" }}
    >
      <div className="pdfViewer"></div>
    </div>

      {/*
      <canvas 
        ref={canvasRef} 
        className="border shadow-lg rounded-lg max-w-full h-auto"
        style={{ maxHeight: "80vh" }}
      />*/}
    </div>
  );
}