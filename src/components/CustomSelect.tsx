'use client';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  integratedMenu?: boolean;
  minimal?: boolean;
}

export default function CustomSelect({ value, onChange, options, integratedMenu = false, minimal = false }: CustomSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="filter-select"
      style={{
        background: minimal ? 'var(--bg-app)' : 'var(--bg-card)',
        color: 'var(--text-secondary)',
        padding: minimal ? '0.4rem 2rem 0.4rem 1rem' : '0.5rem 2rem 0.5rem 1rem',
        borderRadius: integratedMenu ? '8px' : '100px',
        fontSize: '0.8rem',
        fontWeight: 600,
        border: minimal ? '1px solid var(--border-subtle)' : '1px solid var(--border-subtle)',
        boxShadow: minimal ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        width: 'auto',
        maxWidth: '100%',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}