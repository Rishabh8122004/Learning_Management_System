// Shown while a signed-in session is being restored: calm placeholder shapes instead of plain text.
function PageLoading() {
  return (
    <main className="page-loading" aria-busy="true">
      <div aria-hidden="true">
        <span className="skeleton page-loading-title" />
        <span className="skeleton page-loading-line" />
        <span className="skeleton page-loading-block" />
      </div>

      <p className="visually-hidden" role="status">
        Restoring your session…
      </p>
    </main>
  );
}

export default PageLoading;
