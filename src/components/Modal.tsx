'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Simple focus management
    if (modalRef.current) {
      modalRef.current.focus();
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="modal-content" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        ref={modalRef}
        tabIndex={-1}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 id="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
          <button 
            onClick={onClose} 
            style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
