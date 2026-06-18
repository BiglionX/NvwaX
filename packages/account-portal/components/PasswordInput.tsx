'use client';

import { useState } from 'react';

type Props = {
  /** id for the <input>, used by the parent <label htmlFor>. */
  id: string;
  /** Controlled value. */
  value: string;
  /** Controlled onChange handler. */
  onChange: (next: string) => void;
  /** autocomplete hint: "current-password" for login, "new-password" for register. */
  autoComplete: 'current-password' | 'new-password';
  /** Accessible labels for the toggle button (i18n-resolved by the caller). */
  showLabel: string;
  hideLabel: string;
  /** Min length for native validation. */
  minLength?: number;
  /** Test id forwarded to the <input>. */
  testId?: string;
  /** data-testid for the toggle button. */
  toggleTestId?: string;
};

/**
 * Password input with an inline show/hide toggle button.
 *
 * Kept as a controlled component — the parent owns the password value.
 * The toggle button is `type="button"` so it never submits the form.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  showLabel,
  hideLabel,
  minLength,
  testId,
  toggleTestId,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="pc-input-group">
      <input
        id={id}
        className="pc-input pc-input--with-action"
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      />
      <button
        type="button"
        className="pc-input-group__action"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        // Prevent the browser from treating this as a submit button in any
        // nested form context.
        tabIndex={-1}
        data-testid={toggleTestId}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default PasswordInput;

// Minimal stroke icons. Inline so the static export has no extra HTTP request
// and no font/icon dependency.
function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 4.06-5.06" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
