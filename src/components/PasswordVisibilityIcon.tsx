export default function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 5L21 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M9.88 5.09C10.56 4.89 11.27 4.78 12 4.78C16.8 4.78 20.78 9.45 21.82 10.83C22.06 11.15 22.06 11.58 21.82 11.9C21.41 12.44 20.53 13.51 19.3 14.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6.69 7.24C4.55 8.74 3.06 10.67 2.18 11.84C1.94 12.16 1.94 12.59 2.18 12.91C3.22 14.29 7.2 18.96 12 18.96C14.02 18.96 15.84 18.14 17.37 17.06" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.18 12.91C3.22 14.29 7.2 18.96 12 18.96C16.8 18.96 20.78 14.29 21.82 12.91C22.06 12.59 22.06 12.16 21.82 11.84C20.78 10.46 16.8 5.79 12 5.79C7.2 5.79 3.22 10.46 2.18 11.84C1.94 12.16 1.94 12.59 2.18 12.91Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
