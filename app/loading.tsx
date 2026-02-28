export default function Loading() {
  return (
    <div className="route-loading" role="status" aria-live="polite" aria-label="Loading page">
      <div className="route-loading__bar" />
      <div className="route-loading__skeleton" />
    </div>
  );
}
