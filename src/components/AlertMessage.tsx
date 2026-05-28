interface AlertMessageProps {
  type: 'success' | 'error' | 'warning' | '';
  message: string;
}

export default function AlertMessage({ type, message }: AlertMessageProps) {
  if (!message || !type) return null;

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--success)',
          border: 'rgba(16, 185, 129, 0.2)'
        };
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.08)',
          color: 'var(--danger)',
          border: 'rgba(239, 68, 68, 0.25)'
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--warning)',
          border: 'rgba(245, 158, 11, 0.2)'
        };
      default:
        return { bg: 'transparent', color: 'inherit', border: 'transparent' };
    }
  };

  const { bg, color, border } = getStyles();

  return (
    <div
      role="alert"
      style={{
        marginBottom: '1.5rem',
        padding: '0.85rem 1rem',
        borderRadius: '8px',
        fontSize: '0.9rem',
        border: `1px solid ${border}`,
        background: bg,
        color: color,
      }}
    >
      {message}
    </div>
  );
}
