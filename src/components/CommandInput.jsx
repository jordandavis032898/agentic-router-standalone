import { useRef } from 'react';

export default function CommandInput({ value, onChange, onSubmit, placeholder = 'Ask or run a command…', disabled }) {
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value?.trim() && onSubmit) onSubmit();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="command-input-wrap" onSubmit={handleSubmit}>
      <div className="command-input-inner">
        <span className="command-input-prefix">›</span>
        <input
          ref={inputRef}
          type="text"
          className="command-input"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="command-input-submit"
          disabled={disabled || !value?.trim()}
          aria-label="Send"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
