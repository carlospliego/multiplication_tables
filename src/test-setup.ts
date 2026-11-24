import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  // Session state (current screen, in-progress quest) must not leak between tests.
  window.sessionStorage.clear();
});
