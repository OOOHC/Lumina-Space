interface ErrorScreenProps {
  onRetry: () => void;
}

export function LoadingScreen() {
  return (
    <div className="status-screen" role="status">
      <p className="status-wordmark">Lumina Space</p>
      <p className="status-message">Preparing the exhibition…</p>
    </div>
  );
}

export function ScenePreparingOverlay() {
  return (
    <div className="scene-preparing" role="status" aria-live="polite">
      <p className="status-wordmark">Lumina Space</p>
      <p className="status-message">Lighting the exhibition…</p>
      <span className="scene-preparing-line" aria-hidden="true" />
    </div>
  );
}

export function EmptyScreen() {
  return (
    <div className="status-screen">
      <p className="status-wordmark">Lumina Space</p>
      <p className="status-message">This exhibition has no photographs yet.</p>
    </div>
  );
}

export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div className="status-screen" role="alert">
      <p className="status-wordmark">Lumina Space</p>
      <p className="status-message">The exhibition could not be loaded.</p>
      <button type="button" className="text-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
