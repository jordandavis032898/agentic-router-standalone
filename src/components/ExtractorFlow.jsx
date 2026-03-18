import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api';

export default function ExtractorFlow({
  fileId,
  onError,
  showResultsInWorkspace,
  onExtractionComplete,
}) {
  const [pdfPages, setPdfPages] = useState([]);       // [{pdf_page, image}, ...]
  const [selectedPages, setSelectedPages] = useState(new Set()); // Set of 1-based page numbers
  const [extracting, setExtracting] = useState(false);
  const [extractionDone, setExtractionDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const containerRef = useRef(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 500);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fetchPdfPages = useCallback(async () => {
    if (!fileId) return;
    setLoading(true);
    try {
      const res = await api.getPdfPages(fileId, 300);
      setPdfPages(res?.pages || []);
      setSelectedPages(new Set());
    } catch (e) {
      onErrorRef.current?.(api.getErrorMessage(e, 'Failed to load PDF pages'));
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchPdfPages();
  }, [fetchPdfPages]);

  const togglePage = (pageNum) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  };

  const handleExtract = async () => {
    if (selectedPages.size === 0) return;
    setExtracting(true);
    try {
      const pageNumbers = Array.from(selectedPages).sort((a, b) => a - b);
      console.log('Extracting pages:', pageNumbers, 'from selectedPages Set:', Array.from(selectedPages));
      const res = await api.extractByPageNumbers(fileId, pageNumbers);
      console.log('Extract response:', JSON.stringify(res, null, 2).slice(0, 2000));
      const tables = res?.data?.extracted_tables;
      if (res?.success && tables) {
        setExtractionDone(true);
        if (showResultsInWorkspace && onExtractionComplete) {
          onExtractionComplete(tables);
        }
      } else {
        onError?.(res?.error?.message || 'Extraction failed');
      }
    } catch (e) {
      onError?.(api.getErrorMessage(e, 'Extraction failed'));
    } finally {
      setExtracting(false);
    }
  };

  if (extractionDone) {
    return (
      <div ref={containerRef} className={`extractor-flow-card ${narrow ? 'extractor-flow-narrow' : ''}`}>
        <div className="extractor-flow-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setExtractionDone(false);
              setSelectedPages(new Set());
            }}
          >
            Back to page selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`extractor-flow-card ${narrow ? 'extractor-flow-narrow' : ''}`}>
      <div className="extractor-flow-label">
        Select pages to extract
        {pdfPages.length > 0 && ` (${pdfPages.length} pages in PDF)`}
      </div>

      {loading && <p className="extractor-flow-loading">Loading pages…</p>}

      {pdfPages.length > 0 && (
        <div className="extractor-flow-pages-grid">
          {pdfPages.map((pg) => {
            const pageNum = pg.pdf_page;
            const isSelected = selectedPages.has(pageNum);
            return (
              <button
                key={pageNum}
                type="button"
                className={`extractor-flow-page-card ${isSelected ? 'extractor-flow-page-card-selected' : ''}`}
                onClick={() => togglePage(pageNum)}
              >
                <div className="extractor-flow-page-checkbox-wrap">
                  <span className={`extractor-flow-page-checkbox ${isSelected ? 'checked' : ''}`}>
                    {isSelected && (
                      <svg viewBox="0 0 16 16" fill="none">
                        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                </div>
                <div className="extractor-flow-page-preview-wrap">
                  <img
                    src={`data:image/png;base64,${pg.image}`}
                    alt={`Page ${pageNum}`}
                    className="extractor-flow-page-preview-img"
                  />
                </div>
                <span className="extractor-flow-page-number">Page {pageNum}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="extractor-flow-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={handleExtract}
          disabled={selectedPages.size === 0 || extracting}
        >
          {extracting
            ? 'Extracting…'
            : `Extract ${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''}`}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={fetchPdfPages}
          disabled={loading}
        >
          Refresh pages
        </button>
      </div>
    </div>
  );
}
