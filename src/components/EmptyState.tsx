interface EmptyStateProps {
  icon?: string;
  message: string;
}

export default function EmptyState({ icon = '📭', message }: EmptyStateProps) {
  return (
    <div className="card empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <p>{message}</p>
    </div>
  );
}
