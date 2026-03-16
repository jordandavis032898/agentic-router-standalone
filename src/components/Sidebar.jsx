import { useRef } from 'react';

const TABS = [
  { id: 'edgar', label: 'EDGAR', description: 'Disabled demo flow' },
  { id: 'extract', label: 'Extract', description: 'Disabled demo flow' },
  { id: 'rag', label: 'Advanced chatbot', description: 'Disabled demo flow' },
];

const ADMIN_TAB = { id: 'admin', label: 'Admin', description: 'User management' };

export default function Sidebar({
  activeTab,
  onTabChange,
  fileId,
  filename,
  onPdfUpload,
  uploading = false,
  onLogout,
  userEmail = null,
  userRole = 'user',
  className = '',
}) {
  const fileInputRef = useRef(null);
  const tabs = userRole === 'admin' ? [...TABS, ADMIN_TAB] : TABS;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onPdfUpload) onPdfUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <aside className={`sidebar ${className}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">◇</span>
        <span className="sidebar-brand-name">Accelerate79ers (demo UI)</span>
      </div>
      {userEmail && (
        <div className="sidebar-user">
          <span className="sidebar-user-email" title={userEmail}>
            {userEmail}
          </span>
        </div>
      )}

      <div className="sidebar-section sidebar-upload-section">
        <div className="sidebar-label">PDF</div>
        <label className={`sidebar-upload-area ${uploading ? 'sidebar-upload-area-uploading' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="sidebar-upload-input"
            aria-label="Upload PDF"
            disabled={uploading}
          />
          <span className="sidebar-upload-label">
            {uploading
              ? 'Uploading…'
              : filename
                ? filename
                : 'Choose a PDF to upload'}
          </span>
        </label>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-label">Flows</div>
          <ul className="sidebar-list sidebar-list-tabs">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  className={`sidebar-item sidebar-tab ${activeTab === tab.id ? 'sidebar-tab-active' : ''}`}
                  onClick={() => onTabChange?.(tab.id)}
                  title={tab.description}
                >
                  <span className="sidebar-tab-row">
                    <span className="sidebar-item-icon">◇</span>
                    <span className="sidebar-item-title">{tab.label}</span>
                  </span>
                  {tab.description && (
                    <span className="sidebar-item-desc">{tab.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Document</div>
          <div className="sidebar-workspace">
            {fileId ? (
              <p className="sidebar-workspace-file">{filename || fileId}</p>
            ) : (
              <p className="sidebar-workspace-empty">No document uploaded yet.</p>
            )}
          </div>
        </div>
      </nav>

      {onLogout && (
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      )}
    </aside>
  );
}
