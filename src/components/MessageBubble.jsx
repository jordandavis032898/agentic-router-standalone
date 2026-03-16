import { useState } from 'react';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      type="button"
      className="message-action message-action-copy"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label={copied ? 'Copied' : 'Copy'}
    >
      {copied ? 'Copied' : 'Copy text'}
    </button>
  );
}

export function UserBubble({ text }) {
  return (
    <div className="message message-user">
      <div className="message-avatar message-avatar-user" aria-hidden>
        You
      </div>
      <div className="message-bubble message-bubble-user">{text}</div>
    </div>
  );
}

export function AssistantBubble({ routeTag, explanation, text, copyText, children }) {
  return (
    <div className="message message-assistant">
      <div className="message-avatar message-avatar-assistant" aria-hidden>
        AI
      </div>
      <div className="message-bubble message-bubble-assistant">
        {(routeTag || copyText) && (
          <div className="message-bubble-header">
            {routeTag && <span className="message-tag">{routeTag}</span>}
            {copyText && <CopyButton text={copyText} />}
          </div>
        )}
        {explanation && <p className="message-explanation">{explanation}</p>}
        {text && <p className="message-text">{text}</p>}
        {children}
      </div>
    </div>
  );
}

export function SystemBubble({ text }) {
  return (
    <div className="message message-system">
      <div className="message-avatar message-avatar-system" aria-hidden />
      <div className="message-bubble message-bubble-system">{text}</div>
    </div>
  );
}
