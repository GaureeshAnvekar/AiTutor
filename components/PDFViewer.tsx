"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
//import { PDFViewer as PDFViewerLib, EventBus, PDFLinkService, PDFFindController } from "pdfjs-dist/web/pdf_viewer";
import * as pdfjsViewer from "pdfjs-dist/web/pdf_viewer";
import "pdfjs-dist/web/pdf_viewer.css";
import { eventDispatcher, EVENTS } from "@/lib/eventDispatcher";

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
  const pdfViewerRef = useRef<any>(null);
  const [isPdfSet, setIsPdfSet] = useState(false);
  const isInitializedRef = useRef(false);
  const initializationInProgressRef = useRef(false);
  const currentUrlRef = useRef<string>("");
  const [chatMetadata, setChatMetadata] = useState<any>(null);
  const mountedRef = useRef(true);
  const [overlayBoxes, setOverlayBoxes] = useState<Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
    type: string; // "text" or "image"
  }>>([]);
  const pillSpansRef = useRef<Array<HTMLElement>>([]);
  const currChunkIdRef = useRef<string>("");
  const currFindChunkIdxRef = useRef(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
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
        url,
        currentUrl: currentUrlRef.current
      });

      // Check if already initialized for this URL or initialization in progress
      if (!containerRef.current || 
          (isInitializedRef.current && currentUrlRef.current === url) || 
          initializationInProgressRef.current) {
        console.log('Skipping PDF initialization - already initialized, in progress, or missing container');
        return;
      }

      console.log('Starting PDF initialization...');
      
      // Immediately mark as in progress to prevent race conditions
      initializationInProgressRef.current = true;
      
      // Clean up any existing viewer first
      if (pdfViewerRef.current) {
        console.log('Cleaning up existing PDF viewer');
        try {
          pdfViewerRef.current.setDocument(null);
          pdfViewerRef.current.cleanup?.();
        } catch (error) {
          console.warn('Error during PDF viewer cleanup:', error);
        }
        pdfViewerRef.current = null;
      }
      
      // Mark as initialized and store current URL
      isInitializedRef.current = true;
      currentUrlRef.current = url;
      
      const container = containerRef.current!;
      const viewer = container.querySelector(".pdfViewer")!;

      // Clear any existing content in the viewer
      viewer.innerHTML = '';

      const eventBus = new pdfjsViewer.EventBus();

      
      const linkService = new pdfjsViewer.PDFLinkService({ eventBus });


      const findController = new pdfjsViewer.PDFFindController({
        eventBus,
        linkService,
      });


      const pdfViewer = new pdfjsViewer.PDFViewer({
        container: container,
        viewer,
        eventBus,
        linkService,
        findController: findController,
        textLayerMode: 2,
      });
      linkService.setViewer(pdfViewer);
      pdfViewerRef.current = pdfViewer;

      

      const loadingTask = pdfjsLib.getDocument(url);
      const pdfDoc = await loadingTask.promise;
      setPdfDoc(pdfDoc);

      console.log("Setting document to PDF viewer");
      pdfViewer.setDocument(pdfDoc);
      linkService.setDocument(pdfDoc);

      eventBus.on('pagesinit', () => {
        console.log('Pages initialized');
        if (mountedRef.current) {
          setIsLoading(false);
          setIsPdfSet(true);
        }
        // Reset the in-progress flag when initialization is complete
        initializationInProgressRef.current = false;
        
        if (pdfViewerRef.current) {
          pdfViewerRef.current.scrollPageIntoView({
            pageNumber: 1,
            //destArray: [null, { name: "XYZ" }, 0, 0, 1],
          });
        }

        /*
        eventBus.dispatch("find", {
          query: "is a local vector database",
          caseSensitive: false,
          highlightAll: true,
          findPrevious: false,
          type: "",
        });*/



      });

      // Add error handling for PDF loading
      loadingTask.promise.catch((error: any) => {
        console.error('PDF loading error:', error);
        if (mountedRef.current) {
          setError("Failed to load PDF");
          setIsLoading(false);
        }
        initializationInProgressRef.current = false;
        isInitializedRef.current = false;
      });

      /*
      eventBus.on('textlayerrendered', (evt) => {
        //console.log('Page rendered: ', evt.pageNumber);


        const textLayers = document.querySelectorAll(".textLayer");
        //console.log("textLayers: ", textLayers);
        textLayers.forEach(layer => {
          console.log("inside");
          const spans = Array.from(layer.querySelectorAll("span"));
          console.log("spans: ", spans);
          spans.forEach((span: HTMLElement) => {
            if (span.textContent?.includes("Dolby")) {
              console.log("dolby");
              span.style.backgroundColor = "yellow";
            }
          });
        });


      });*/

    };

    load().catch((error) => {
      console.error('PDF load error:', error);
      if (mountedRef.current) {
        setError("Failed to load PDF");
        setIsLoading(false);
      }
      initializationInProgressRef.current = false;
      isInitializedRef.current = false;
    });
  }, [url]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        // Clean up PDF viewer
        if (pdfViewerRef.current) {
          pdfViewerRef.current.cleanup?.();
          pdfViewerRef.current = null;
        }
      } catch (error) {
        console.warn('Error during PDF viewer cleanup:', error);
      } finally {
        // Reset initialization flags on unmount
        mountedRef.current = false;
        isInitializedRef.current = false;
        initializationInProgressRef.current = false;
        currentUrlRef.current = "";
      }
    };
  }, []);

  // Reset initialization flags when URL changes
  useEffect(() => {
    if (currentUrlRef.current !== url && mountedRef.current) {
      isInitializedRef.current = false;
      initializationInProgressRef.current = false;
      setIsPdfSet(false);
      setError("");
      setChatMetadata(null);
      setOverlayBoxes([]);
    }
  }, [url]);


  const checkSpanText = (spanText: string, pillChunkText: string) => {
    return (spanText != '' && /[a-z]/.test(spanText) && pillChunkText.includes(spanText) || spanText.includes(pillChunkText));
  }


  // Insert overlay boxes into their respective PDF pages
  useEffect(() => {
    if (overlayBoxes.length === 0) return;

    const insertOverlays = () => {
      overlayBoxes.forEach(async box => {
        const pageElement = document.querySelector(`.page[data-page-number="${box.pageNumber}"]`) as HTMLElement;
        if (pageElement) {
          const existingOverlay = pageElement.querySelector(`[data-overlay-id="${box.id}"]`);
          if (!existingOverlay) {
            const page = await pdfDoc.getPage(box.pageNumber);
            const viewport = page.getViewport({ scale: 1.0 });
            const y = viewport.height - (box.y + box.height);
            
            const overlayDiv = document.createElement('div');
            overlayDiv.setAttribute('data-overlay-id', box.id);
            overlayDiv.className = `absolute pointer-events-none border-2 ${box.type === "image" ? "border-red-500 bg-red-100 bg-opacity-20" : "border-blue-500 bg-blue-100 bg-opacity-20"}`;
            overlayDiv.style.left = `${box.x + 20}px`;
            overlayDiv.style.top = `${y + 20}px`;
            overlayDiv.style.width = `${box.width + 30}px`;
            overlayDiv.style.height = `${box.height + 30}px`;
            overlayDiv.style.boxShadow = box.type === "image" ? '0 0 0 5px rgba(239, 68, 68, 0.5)' : '0 0 0 5px rgba(59, 130, 246, 0.5)';
            overlayDiv.style.zIndex = '10';
            
            const labelDiv = document.createElement('div');
            labelDiv.className = `absolute -top-6 left-0 text-white text-xs px-1 py-0.5 rounded text-nowrap ${box.type === "image" ? "bg-red-500" : "bg-blue-500"}`;
            labelDiv.textContent = `${box.type === "image" ? "Image" : "Text"} - Page ${box.pageNumber}`;
            
            overlayDiv.appendChild(labelDiv);
            pageElement.appendChild(overlayDiv);
            
            // Scroll the page element into view
            setTimeout(() => {
              if (pageElement) {
                pageElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start',
                  inline: 'nearest'
                });
              }
            }, 10);
          }
        }
      });
    };

    insertOverlays();
  }, [overlayBoxes, pdfDoc]);

  // Listen for chat metadata events
  useEffect(() => {
    const handleChatMetadata = (data: any) => {
      try {
        const {relevantChunks, metadata, timestamp, chunkId} = data;
        
        pdfViewerRef.current.scrollPageIntoView({
          pageNumber: metadata.pageNumber,
        });

        /*
        console.log("currChunkId: ", chunkId);
        console.log("currChunkIdRef.current: ", currChunkIdRef.current);
        console.log("spans length: ", pillSpansRef.current.length);
        if (chunkId == currChunkIdRef.current) {
          currFindChunkIdxRef.current++;
          currFindChunkIdxRef.current = currFindChunkIdxRef.current % pillSpansRef.current.length;
          pillSpansRef.current[currFindChunkIdxRef.current].focus({ preventScroll: false });
          console.log("currFindChunkIdxRef.current: ", currFindChunkIdxRef.current);
          return;
        }
        console.log('PDFViewer received chat metadata:', data);*/
        if (mountedRef.current) {
          setChatMetadata(data);
        }
        
        if (!relevantChunks || relevantChunks.length === 0) {
          return;
        }
        
        const pillChunk = relevantChunks[0];
        const chunkType = pillChunk.type || pillChunk.metadata?.type || "text";
        
        // Clear previous overlay boxes
        setOverlayBoxes([]);
        
        // Handle image-type chunks with bounding box overlay
        if (chunkType === "image") {
          if (pillChunk.metadata && 
              pillChunk.metadata.bboxX !== undefined && 
              pillChunk.metadata.bboxY !== undefined &&
              pillChunk.metadata.bboxWidth !== undefined &&
              pillChunk.metadata.bboxHeight !== undefined) {
            
            const overlayBox = {
              id: `overlay-image-chunk-${pillChunk.metadata.pageNumber}-${chunkId}`,
              x: pillChunk.metadata.bboxX,
              y: pillChunk.metadata.bboxY,
              width: pillChunk.metadata.bboxWidth,
              height: pillChunk.metadata.bboxHeight,
              pageNumber: pillChunk.metadata.pageNumber || 1,
              type: "image"
            };
            
            console.log('Created image overlay box:', overlayBox);
            setOverlayBoxes([overlayBox]);
          }
          return; // Skip text highlighting for image chunks
        }
        
        // Handle text-type chunks with text highlighting
        let pillChunkText = pillChunk.text;
        pillChunkText = pillChunkText.normalize("NFKC").replace(/[\s\u00A0\u200B\u2028\u2029]+/g, "").toLowerCase().trim().replace(/\s+/g, "").replace(/['"`]+/g, "");

        
        const textLayers = document.querySelectorAll(`.page[data-page-number="${metadata.pageNumber}"] .textLayer`);
        const newSpans: HTMLElement[] = [];

        textLayers.forEach(layer => {
          const spans = Array.from(layer.querySelectorAll('span[dir="ltr"]'));
          let currSection = "";
          let startPtr = 0, endPtr = 0;
          let found = false;

          spans.forEach((span: Element) => {
            //console.log(span.textContent);
          });
          //console.log("PILL CHUNK TEXT: ", pillChunkText);
          while (endPtr < spans.length) {
            currSection += spans[endPtr].textContent?.normalize("NFKC").replace(/[\s\u00A0\u200B\u2028\u2029]+/g, "").toLowerCase().trim().replace(/\s+/g, "").replace(/['"`]+/g, "");
            console.log("currSection: ", currSection);
            console.log("pill text: ", pillChunkText);
            console.log("endPtr: ", endPtr);
            console.log("spans length: ", spans.length);
            console.log("check ", currSection.includes(pillChunkText));
            if (currSection.includes(pillChunkText)) {
              console.log("INSIDE");
              console.log("Match found:", currSection);
              found = true;
              break; // or handle match
            } else endPtr++;
          }
          console.log("found: ", found);
          // trim excess spans
          if (found) {
            while (startPtr < spans.length) {
              const removeLength = spans[startPtr].textContent?.replace(/\s+/g, "").toLowerCase().trim().length;
              currSection = currSection.slice(removeLength);
              if (!currSection.includes(pillChunkText)) {
                startPtr = Math.max(0, startPtr - 0);
                break;
              } else startPtr++;
            }
            endPtr = Math.min(endPtr + 0, spans.length - 1);
            while (startPtr <= endPtr) {
              const span = spans[startPtr] as HTMLElement;
              span.style.border = "0.7px solid red";
              span.setAttribute("tabindex", "-1");  // 👈 make it focusable
              span.focus({ preventScroll: false }); 
              // Randomly add border-radius to make some look like circles
              if (Math.random() > 0.5) {
                span.style.borderRadius = "50%";
              }
              startPtr++;
            }
          }
          
          /*spans.forEach((span: HTMLElement, index: number) => {
            const spanText = span.textContent?.toLowerCase().trim();
            if (checkSpanText(spanText, pillChunkText)) {

              console.log("span.textContent: ", spanText);
              console.log("pillChunkText: ", pillChunkText);
              span.style.border = "1px solid red";
              span.setAttribute("tabindex", "-1");  // 👈 make it focusable
              span.focus({ preventScroll: false }); 
              // Randomly add border-radius to make some look like circles
              if (Math.random() > 0.5) {
                span.style.borderRadius = "50%";
              }
              newSpans.push(span);
              console.log("newspans: ", newSpans);
              

            }
          });*/
        });
        pillSpansRef.current = newSpans;
        currChunkIdRef.current = chunkId;
        currFindChunkIdxRef.current = 0;
        
        // Scroll to the first highlighted span for text chunks
        if (newSpans.length > 0) {
          setTimeout(() => {
            newSpans[0].scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            });
          }, 100); // Small delay to ensure highlighting is complete
        }
      } catch (error) {
        console.error('Error handling chat metadata:', error);
      }
  


      
      // Clear previous overlay boxes
      //setOverlayBoxes([]);
      /*
      if (data.relevantChunks && data.relevantChunks.length > 0) {
        // Focus on only the first chunk's metadata
        const firstChunk = data.relevantChunks[0];
        
        if (firstChunk.metadata && 
            firstChunk.metadata.bboxX !== undefined && 
            firstChunk.metadata.bboxY !== undefined &&
            firstChunk.metadata.bboxWidth !== undefined &&
            firstChunk.metadata.bboxHeight !== undefined) {
          
          const overlayBox = {
            id: `overlay-first-chunk-${firstChunk.metadata.pageNumber}`,
            x: firstChunk.metadata.bboxX,
            y: firstChunk.metadata.bboxY,
            width: firstChunk.metadata.bboxWidth,
            height: firstChunk.metadata.bboxHeight,
            pageNumber: firstChunk.metadata.pageNumber || 1,
          };
          
          console.log('Created overlay box for first chunk:', overlayBox);
          setOverlayBoxes([overlayBox]);
          
          // Navigate to the first chunk's page
          const firstRelevantPage = firstChunk.metadata.pageNumber || 1;
          console.log(`Navigating to relevant page: ${firstRelevantPage}`);
          
          // Scroll to the first relevant chunk
          if (onPageChange) {
            onPageChange(firstRelevantPage);
          }
          
          // Scroll to the specific position
          pdfViewerRef.current!.scrollPageIntoView({
            pageNumber: firstRelevantPage,
            destArray: [null, { name: "XYZ" }, firstChunk.metadata.bboxX, firstChunk.metadata.bboxY, 1],
          });
        }
      }*/
    };

    eventDispatcher.on(EVENTS.CHAT_METADATA_RECEIVED, handleChatMetadata);
    
    return () => {
      eventDispatcher.off(EVENTS.CHAT_METADATA_RECEIVED, handleChatMetadata);
    };
  }, [onPageChange]);

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

      {/* Chat metadata indicator */}
      {chatMetadata && (
        <div className="absolute top-2 right-2 bg-green-100 border border-green-300 rounded-lg p-2 z-20 max-w-xs">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">
              Found {chatMetadata.relevantChunks?.length || 0} relevant sections
            </span>
          </div>
          {chatMetadata.searchQuery && (
            <p className="text-xs text-green-600 mt-1 truncate">
              "{chatMetadata.searchQuery}"
            </p>
          )}
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