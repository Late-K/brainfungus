interface PageLoadingProps {
  message?: string;
}

export default function PageLoading({
  message = "Loading...",
}: PageLoadingProps) {
  return (
    <div className="page-container">
      <p className="empty-state">{message}</p>
    </div>
  );
}
