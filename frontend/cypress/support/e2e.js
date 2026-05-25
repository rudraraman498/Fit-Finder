// Runs before every spec file. Import custom commands and global setup.
import './commands';

// Suppress uncaught exceptions that originate from the app itself
// (e.g. React Router "Cannot update a component…" warnings in test env)
Cypress.on('uncaught:exception', (err) => {
  // Don't fail tests on ResizeObserver loop errors (common with MUI)
  if (err.message.includes('ResizeObserver loop')) return false;
  return true;
});
