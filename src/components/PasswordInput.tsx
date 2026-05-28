'use client';

import { useState } from 'react';
import PasswordVisibilityIcon from './PasswordVisibilityIcon';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function PasswordInput({ label, required, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          className="form-input"
          required={required}
          style={{ paddingRight: '2.75rem' }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(prev => !prev)}
          aria-label={showPassword ? `Ocultar ${label}` : `Mostrar ${label}`}
          title={showPassword ? `Ocultar ${label}` : `Mostrar ${label}`}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PasswordVisibilityIcon visible={showPassword} />
        </button>
      </div>
    </div>
  );
}
