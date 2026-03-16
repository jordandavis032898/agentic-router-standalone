// The input bar no longer forwards keystrokes or submit events to the outside.
// It visually resembles an active command prompt but is effectively inert.
// Minor demo tweak: updated default placeholder and button label.

export default function CommandInput({ placeholder = 'Demo input is visually active only.' }) {
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
