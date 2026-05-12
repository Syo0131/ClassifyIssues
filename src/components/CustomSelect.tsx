'use client';

import { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export default function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: '150px' }}>
      <button
        type="button"
        className="filter-select"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', 
          textAlign: 'left', 
          paddingRight: '2rem',
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {selectedOption?.label || 'Seleccionar...'}
      </button>
      
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-md)',
            zIndex: 50,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.85rem',
                color: option.value === value ? 'var(--primary)' : 'var(--text-primary)',
                background: option.value === value ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                cursor: 'pointer',
                fontWeight: option.value === value ? 600 : 500,
                transition: 'background 0.2s',
                borderLeft: `3px solid ${option.value === value ? 'var(--primary)' : 'transparent'}`
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  (e.target as HTMLDivElement).style.background = 'var(--bg-muted)';
                }
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  (e.target as HTMLDivElement).style.background = 'transparent';
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}