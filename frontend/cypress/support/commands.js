// ---------------------------------------------------------------------------
// Custom Cypress commands for FitFinder
// ---------------------------------------------------------------------------

const COMMERCE = 'http://localhost:8080';
const AI = 'http://localhost:8000';

/**
 * Seed localStorage to simulate a logged-in user.
 * Use in cy.visit() onBeforeLoad or before visiting a page.
 *
 * @example
 *   cy.visit('/', { onBeforeLoad: cy.seedAuth() })   // not idiomatic
 *   // preferred:
 *   cy.loginByLocalStorage();
 *   cy.visit('/');
 */
Cypress.Commands.add('loginByLocalStorage', (
  name = 'Test User',
  email = 'test@example.com',
  token = 'test-jwt-token',
) => {
  cy.window().then((win) => {
    win.localStorage.setItem('token', token);
    win.localStorage.setItem('user', JSON.stringify({ id: 1, name, email }));
  });
});

/**
 * Stub GET /cart with the given cart data.
 * The Navbar calls this on every page load, so call this before cy.visit().
 */
Cypress.Commands.add('stubCart', (cartData) => {
  cy.intercept('GET', `${COMMERCE}/cart`, cartData).as('getCart');
});

/**
 * Stub GET /products with the given paged response.
 */
Cypress.Commands.add('stubProducts', (pageData) => {
  cy.intercept('GET', `${COMMERCE}/products*`, pageData).as('getProducts');
});

/**
 * Stub GET /products/:id with a single product.
 */
Cypress.Commands.add('stubProductDetail', (id, productData) => {
  cy.intercept('GET', `${COMMERCE}/products/${id}`, productData).as('getProduct');
});

/**
 * Stub POST /search with AI service results.
 */
Cypress.Commands.add('stubSearch', (searchData) => {
  cy.intercept('POST', `${AI}/search`, searchData).as('search');
});

/**
 * Visit a page with an empty cart stub already in place (stops Navbar 401s).
 */
Cypress.Commands.add('visitWithEmptyCart', (path, options = {}) => {
  cy.fixture('cart').then((cart) => {
    cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
  });
  cy.visit(path, options);
});

/**
 * Visit a page as a logged-in user.
 * Sets localStorage before page load so AuthContext initialises correctly.
 */
Cypress.Commands.add('visitAsUser', (path, name = 'Test User', email = 'test@example.com') => {
  cy.fixture('cart').then((cart) => {
    cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
  });
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('user', JSON.stringify({ id: 1, name, email }));
    },
  });
});
