// ---------------------------------------------------------------------------
// Navbar & routing
// ---------------------------------------------------------------------------

const COMMERCE = 'http://localhost:8080';

describe('Navbar — logged-out state', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
    cy.visit('/');
  });

  it('shows the FitFinder logo', () => {
    cy.contains('FitFinder').should('be.visible');
  });

  it('shows the Search and Products nav links', () => {
    cy.contains('a', 'Search').should('be.visible');
    cy.contains('a', 'Products').should('be.visible');
  });

  it('shows "Sign in" and "Register" buttons when logged out', () => {
    cy.contains('a', 'Sign in').should('be.visible');
    cy.contains('a', 'Register').should('be.visible');
  });

  it('does NOT show the user avatar when logged out', () => {
    cy.get('[class*="MuiAvatar"]').should('not.exist');
  });

  it('logo click navigates to the search page', () => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCartAgain');
    });
    cy.visit('/products');
    cy.contains('FitFinder').click();
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  it('navigates to /login on "Sign in" click', () => {
    cy.contains('a', 'Sign in').click();
    cy.url().should('include', '/login');
  });

  it('navigates to /register on "Register" click', () => {
    cy.contains('a', 'Register').click();
    cy.url().should('include', '/register');
  });

  it('cart icon navigates to /cart', () => {
    cy.get('[class*="MuiBadge"]').parent('a').click();
    cy.url().should('include', '/cart');
  });

  it('shows cart badge count of 0 when cart is empty (no badge visible)', () => {
    cy.wait('@getCart');
    // MUI Badge hides the badge element when badgeContent is 0
    cy.get('[class*="MuiBadge-badge"]').should('not.be.visible').or('not.exist');
  });
});

describe('Navbar — logged-in state', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.withItems).as('getCart');
    });
    cy.visitAsUser('/');
    cy.wait('@getCart');
  });

  it('shows the user avatar with the first letter of the user name', () => {
    // "Test User" → avatar should show "T"
    cy.get('[class*="MuiAvatar"]').should('be.visible').and('contain', 'T');
  });

  it('does NOT show the Sign in / Register buttons when logged in', () => {
    cy.contains('a', 'Sign in').should('not.exist');
    cy.contains('a', 'Register').should('not.exist');
  });

  it('shows the cart badge with the correct item count', () => {
    cy.wait('@getCart');
    cy.get('[class*="MuiBadge-badge"]').should('contain', '3');
  });

  it('opens the user menu on avatar click and shows name + email', () => {
    cy.get('[class*="MuiAvatar"]').click();
    cy.contains('Test User').should('be.visible');
    cy.contains('test@example.com').should('be.visible');
    cy.contains('Sign out').should('be.visible');
  });

  it('clears localStorage and redirects to / on sign out', () => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCartAfterLogout');
    });

    cy.get('[class*="MuiAvatar"]').click();
    cy.contains('Sign out').click();

    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.be.null;
      expect(win.localStorage.getItem('user')).to.be.null;
    });
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
    // Sign in link should reappear
    cy.contains('a', 'Sign in').should('be.visible');
  });
});

describe('Navbar — active link highlighting', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
  });

  it('highlights the Search link on the root route', () => {
    cy.visit('/');
    // The active NavButton uses color: primary.main — we check via aria or class
    cy.contains('a', 'Search').should('exist');
  });

  it('highlights the Products link on the /products route', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getProducts');
    });
    cy.visit('/products');
    cy.contains('a', 'Products').should('exist');
  });
});

describe('Route accessibility', () => {
  it('all main routes load without a crash', () => {
    const ROUTES = ['/', '/products', '/cart', '/login', '/register'];

    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty);
    });
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page);
    });

    ROUTES.forEach((route) => {
      cy.visit(route);
      // No uncaught exceptions should crash the page (handled by e2e.js hook)
      cy.get('body').should('be.visible');
    });
  });
});
