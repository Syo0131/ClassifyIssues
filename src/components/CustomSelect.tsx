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
  integratedMenu?: boolean;
  minimal?: boolean;
}

export default function CustomSelect({ value, onChange, options, integratedMenu = false, minimal = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMultipleOptions = options.length > 1;

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    if (!hasMultipleOptions && isOpen) {
      setIsOpen(false);
    }
  }, [hasMultipleOptions, isOpen]);

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
        onClick={() => hasMultipleOptions && setIsOpen(!isOpen)}
        disabled={!hasMultipleOptions}
        aria-expanded={hasMultipleOptions ? isOpen : false}
        style={{ 
          width: '100%', 
          textAlign: 'left', 
          paddingRight: hasMultipleOptions ? '2rem' : '1rem',
          display: 'block',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderRadius: integratedMenu && isOpen ? '10px 10px 0 0' : integratedMenu ? '10px' : undefined,
          boxShadow: minimal ? 'none' : undefined,
          borderColor: integratedMenu && isOpen ? 'var(--border-subtle)' : undefined,
          borderBottomColor: integratedMenu && isOpen ? 'transparent' : undefined,
          background: minimal ? 'var(--bg-card)' : undefined,
          backgroundImage: 'none',
          backgroundRepeat: 'no-repeat',
          transition: 'border-color 120ms ease, background-color 120ms ease',
          cursor: hasMultipleOptions ? 'pointer' : 'default',
        }}
      >
        {selectedOption?.label || 'Seleccionar...'}
      </button>
      {hasMultipleOptions && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 120ms ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <polyline
              points="6 9 12 15 18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      
      {hasMultipleOptions && isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: integratedMenu ? '100%' : 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderTop: integratedMenu ? 'none' : '1px solid var(--border-subtle)',
            borderRadius: integratedMenu ? '0 0 10px 10px' : '10px',
            boxShadow: minimal || integratedMenu ? 'none' : 'var(--shadow-md)',
            zIndex: 50,
            overflow: 'hidden',
            animation: integratedMenu ? 'select-unify 140ms ease-out both' : 'select-fade 120ms ease-out both',
          }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: option.value === value ? 600 : 500,
                borderLeft: 'none',
                borderTop: index > 0 ? '1px solid var(--border-subtle)' : 'none',
                opacity: option.value === value ? 1 : 0.92,
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