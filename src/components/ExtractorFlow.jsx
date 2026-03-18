import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api';

export default function ExtractorFlow({
  fileId,
  onError,
  showResultsInWorkspace,
  onExtractionComplete,
}) {
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [thumbnails, setThumbnails] = useState({}); // page_number -> base64
  const [extracting, setExtracting] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
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

  // Fetch pages with tables (from LlamaParse prefilter)
  const fetchPages = useCallback(async () => {
    if (!fileId) return;
    setLoadingPages(true);
    try {
      const res = await api.getPages(fileId);
      const pagesData = res?.data?.pages_with_tables || res?.data?.pages || [];
      // Deduplicate by page_index
      const uniquePages = pagesData.filter(
        (p, i, arr) => arr.findIndex((x) => x.page_index === p.page_index) === i
      );
      setPages(uniquePages);
      setSelectedPages(new Set());
    } catch (e) {
      onErrorRef.current?.(api.getErrorMessage(e, 'Failed to load pages'));
    } finally {
      setLoadingPages(false);
    }
  }, [fileId]);

  // Fetch all PDF thumbnails via PyMuPDF (always correct)
  const fetchThumbnails = useCallback(async () => {
    if (!fileId) return;
    setLoadingThumbs(true);
    try {
      const res = await api.getAllThumbnails(fileId, 300);
      const map = {};
      (res?.thumbnails || []).forEach((t) => {
        map[t.page_number] = t.image;
      });
      setThumbnails(map);
    } catch (e) {
      console.error('Failed to load thumbnails:', e);
    } finally {
      setLoadingThumbs(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchPages();
    fetchThumbnails();
  }, [fetchPages, fetchThumbnails]);

  const togglePage = (pageIndex) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  };

  const handleExtract = async () => {
    if (selectedPages.size === 0) return;
    setExtracting(true);
    try {
      const indices = Array.from(selectedPages).sort((a, b) => a - b);
      const res = await api.extract(fileId, indices);
      const tables = res?.data?.extracted_tables || res?.extracted_tables;
      if (res?.success && tables) {
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

  return (
    <div ref={containerRef} className={`extractor-flow-card ${narrow ? 'extractor-flow-narrow' : ''}`}>
      <div className="extractor-flow-label">
        Select pages to extract
        {pages.length > 0 && ` (${pages.length} page${pages.length !== 1 ? 's' : ''} with tables)`}
      </div>

      {(loadingPages || loadingThumbs) && <p className="extractor-flow-loading">Loading pages…</p>}

      {pages.length > 0 && (
        <div className="extractor-flow-pages-grid">
          {pages.map((page) => {
            const idx = page.page_index;
            const pageNum = page.page_number || idx + 1;
            const isSelected = selectedPages.has(idx);
            // Match thumbnail by page_number (1-based PDF page from PyMuPDF)
            const thumbB64 = thumbnails[pageNum];
            return (
              <button
                key={idx}
                type="button"
                className={`extractor-flow-page-card ${isSelected ? 'extractor-flow-page-card-selected' : ''}`}
                onClick={() => togglePage(idx)}
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
                  {thumbB64 ? (
                    <img
                      src={`data:image/png;base64,${thumbB64}`}
                      alt={`Page ${pageNum}`}
                      className="extractor-flow-page-preview-img"
                    />
                  ) : (
                    <div className="extractor-flow-page-preview-placeholder">
                      {pageNum}
                    </div>
                  )}
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
          onClick={() => { fetchPages(); fetchThumbnails(); }}
          disabled={loadingPages || loadingThumbs}
        >
          Refresh pages
        </button>
      </div>
    </div>
  );
}
