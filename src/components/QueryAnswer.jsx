export default function QueryAnswer({ question, answer, chunks }) {
  return (
    <div className="query-answer">
      <div className="query-question-block">
        <span className="query-label">Question</span>
        <p className="query-question">{question}</p>
      </div>
      <div className="query-answer-block">
        <span className="query-label">Answer</span>
        <div className="query-answer-prose">
          <p>{answer}</p>
        </div>
      </div>
      {chunks && chunks.length > 0 && (
        <div className="query-chunks-block">
          <span className="query-label">Sources ({chunks.length})</span>
          <ul className="query-chunks-list">
            {chunks.map((chunk, idx) => (
              <li key={idx} className="query-chunk">
                <span className="query-chunk-text">{chunk.content || chunk.text || (typeof chunk === 'string' ? chunk : JSON.stringify(chunk))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
