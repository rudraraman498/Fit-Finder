const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx}',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    // API origins the frontend calls — must list both so cy.intercept works
    experimentalModifyObstructiveThirdPartyCode: false,
    setupNodeEvents(on, config) {},
  },
  // Environment variables — override in cypress.env.json or via CLI
  env: {
    COMMERCE_URL: 'http://localhost:8080',
    AI_URL: 'http://localhost:8000',
  },
});
