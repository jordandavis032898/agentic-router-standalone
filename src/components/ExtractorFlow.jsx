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
  const [previews, setPreviews] = useState({});
  const [extracting, setExtracting] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const containerRef = useRef(null);
  const previewsRequested = useRef(new Set());

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
      previewsRequested.current = new Set();
      setPreviews({});
    } catch (e) {
      onErrorRef.current?.(api.getErrorMessage(e, 'Failed to load pages'));
    } finally {
      setLoadingPages(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Simple per-page blob fetch — same as Indian team's approach
  useEffect(() => {
    if (!fileId || pages.length === 0) return;
    pages.forEach(async (page) => {
      const idx = page.page_index;
      if (previewsRequested.current.has(idx)) return;
      previewsRequested.current.add(idx);
      try {
        const blob = await api.getPagePreview(fileId, idx);
        if (blob && blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setPreviews((prev) => ({ ...prev, [idx]: url }));
        }
      } catch {
        // preview not available
      }
    });
  }, [fileId, pages]);

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

      {loadingPages && <p className="extractor-flow-loading">Loading pages…</p>}

      {pages.length > 0 && (
        <div className="extractor-flow-pages-grid">
          {pages.map((page) => {
            const idx = page.page_index;
            const displayNum = idx + 1;
            const isSelected = selectedPages.has(idx);
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
                  {previews[idx] ? (
                    <img
                      src={previews[idx]}
                      alt={`Page ${displayNum}`}
                      className="extractor-flow-page-preview-img"
                    />
                  ) : (
                    <div className="extractor-flow-page-preview-placeholder">
                      {displayNum}
                    </div>
                  )}
                </div>
                <span className="extractor-flow-page-number">Page {displayNum}</span>
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
          onClick={fetchPages}
          disabled={loadingPages}
        >
          Refresh pages
        </button>
      </div>
    </div>
  );
}
