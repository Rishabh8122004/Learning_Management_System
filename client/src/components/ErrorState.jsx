// The same calm "something went wrong" box everywhere: what happened, and a way to try again.
function ErrorState({ message, onRetry, title = "Unable to load data" }) {
  return (
    <div className="error-state" role="alert">
      <h2>{title}</h2>

      <p>{message || "Please try again."}</p>

      {onRetry && (
        <button type="button" className="secondary-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
