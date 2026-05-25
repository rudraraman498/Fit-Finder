// ---------------------------------------------------------------------------
// Auth flows — Register & Login
// ---------------------------------------------------------------------------

const COMMERCE = 'http://localhost:8080';

describe('Register page', () => {
  beforeEach(() => {
    // Stub the Navbar's cart fetch so it doesn't error
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
    cy.visit('/register');
  });

  it('renders the registration form', () => {
    cy.contains('h4', 'Create account').should('be.visible');
    cy.get('input[autocomplete="name"]').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[autocomplete="new-password"]').should('be.visible');
    cy.contains('button', 'Create account').should('be.visible');
  });

  it('shows a link to the sign-in page', () => {
    cy.contains('Sign in').should('have.attr', 'href', '/login');
  });

  it('shows client-side error when password is too short', () => {
    cy.get('input[autocomplete="name"]').type('Test User');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[autocomplete="new-password"]').type('short');
    cy.contains('button', 'Create account').click();

    cy.contains('Password must be at least 8 characters.').should('be.visible');
    // Does not call the API
    cy.get('@getCart.all').then((calls) => expect(calls.length).to.equal(1)); // only the Navbar call
  });

  it('redirects to home on successful registration', () => {
    cy.fixture('auth').then((auth) => {
      cy.intercept('POST', `${COMMERCE}/auth/register`, auth.registerSuccess).as('register');
    });

    cy.get('input[autocomplete="name"]').type('Test User');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[autocomplete="new-password"]').type('Password123');
    cy.contains('button', 'Create account').click();

    cy.wait('@register');
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
    // localStorage should have token
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.exist;
    });
  });

  it('shows server error when email is already registered', () => {
    cy.fixture('auth').then((auth) => {
      cy.intercept('POST', `${COMMERCE}/auth/register`, {
        statusCode: 400,
        body: auth.duplicateEmail,
      }).as('register');
    });

    cy.get('input[autocomplete="name"]').type('Test User');
    cy.get('input[type="email"]').type('existing@example.com');
    cy.get('input[autocomplete="new-password"]').type('Password123');
    cy.contains('button', 'Create account').click();

    cy.wait('@register');
    cy.contains('Email already registered.').should('be.visible');
    cy.url().should('include', '/register');
  });

  it('shows a generic error on unexpected server failure', () => {
    cy.intercept('POST', `${COMMERCE}/auth/register`, {
      statusCode: 500,
      body: { error: 'An unexpected error occurred.' },
    }).as('register');

    cy.get('input[autocomplete="name"]').type('Test User');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[autocomplete="new-password"]').type('Password123');
    cy.contains('button', 'Create account').click();

    cy.wait('@register');
    cy.get('[role="alert"]').should('be.visible');
  });
});

describe('Login page', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
    cy.visit('/login');
  });

  it('renders the login form', () => {
    cy.contains('h4', 'Sign in').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.contains('button', 'Sign in').should('be.visible');
  });

  it('shows a link to the register page', () => {
    cy.contains('Register').should('have.attr', 'href', '/register');
  });

  it('redirects to home after successful login with empty session cart', () => {
    cy.fixture('auth').then((auth) => {
      cy.intercept('POST', `${COMMERCE}/auth/login`, auth.loginSuccess).as('login');
    });
    // merge-cart should NOT be called because session cart is empty
    cy.intercept('POST', `${COMMERCE}/auth/merge-cart`).as('mergeCart');

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('Password123');
    cy.contains('button', 'Sign in').click();

    cy.wait('@login');
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
    // merge-cart was NOT called
    cy.get('@mergeCart.all').then((calls) => expect(calls.length).to.equal(0));
  });

  it('calls merge-cart when session cart has items, then redirects', () => {
    cy.fixture('auth').then((auth) => {
      cy.intercept('POST', `${COMMERCE}/auth/login`, auth.loginSuccess).as('login');
    });
    cy.fixture('cart').then((cart) => {
      // Override cart stub with items so the page captures them
      cy.intercept('GET', `${COMMERCE}/cart`, cart.withItems).as('getCartWithItems');
      cy.intercept('POST', `${COMMERCE}/auth/merge-cart`, cart.withItems).as('mergeCart');
    });
    cy.visit('/login'); // re-visit so the new cart stub is used

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('Password123');
    cy.contains('button', 'Sign in').click();

    cy.wait('@login');
    cy.wait('@mergeCart').its('request.body').should('have.property', 'items');
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  it('shows error for wrong credentials', () => {
    cy.fixture('auth').then((auth) => {
      cy.intercept('POST', `${COMMERCE}/auth/login`, {
        statusCode: 400,
        body: auth.badCredentials,
      }).as('login');
    });

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.contains('button', 'Sign in').click();

    cy.wait('@login');
    cy.contains('Invalid email or password.').should('be.visible');
    cy.url().should('include', '/login');
  });

  it('stores token and user in localStorage after login', () => {
    cy.fixture('auth').then((auth) => {
      cy.intercept('POST', `${COMMERCE}/auth/login`, auth.loginSuccess).as('login');
    });

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('Password123');
    cy.contains('button', 'Sign in').click();

    cy.wait('@login');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('token')).to.exist;
      const user = JSON.parse(win.localStorage.getItem('user'));
      expect(user.email).to.equal('test@example.com');
    });
  });
});
