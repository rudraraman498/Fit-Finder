// ---------------------------------------------------------------------------
// Cart page
// ---------------------------------------------------------------------------

const COMMERCE = 'http://localhost:8080';

describe('Cart page — empty state', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
    cy.visit('/cart');
    cy.wait('@getCart');
  });

  it('shows the "Your Cart" heading', () => {
    cy.contains('h4', 'Your Cart').should('be.visible');
  });

  it('shows the empty-state message', () => {
    cy.contains('Your cart is empty').should('be.visible');
  });

  it('shows a Browse Products button that navigates to /products', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getProducts');
    });

    cy.contains('button', 'Browse Products').click();
    cy.url().should('include', '/products');
  });
});

describe('Cart page — with items', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.withItems).as('getCart');
    });
    cy.visit('/cart');
    cy.wait('@getCart');
  });

  it('renders all cart items with name, size, and price', () => {
    cy.contains('CloudRun Performance Tee').should('be.visible');
    cy.contains('M').should('be.visible');
    cy.contains('$45.00').should('be.visible');
    cy.contains('Velocity Running Tight').should('be.visible');
  });

  it('shows the correct per-line total (price × quantity)', () => {
    // First item: $45.00 × 2 = $90.00
    cy.contains('$90.00').should('be.visible');
    // Second item: $89.99 × 1 = $89.99
    cy.contains('$89.99').should('be.visible');
  });

  it('shows the order summary with the cart total', () => {
    cy.contains('Order Summary').should('be.visible');
    cy.contains('$179.99').should('be.visible');
  });

  it('shows the correct subtotal item count', () => {
    // 2 + 1 = 3 items
    cy.contains('3 items').should('be.visible');
  });

  it('shows "Free" shipping', () => {
    cy.contains('Free').should('be.visible');
  });

  it('removes an item when the delete button is clicked', () => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('DELETE', `${COMMERCE}/cart/2*`, cart.afterRemove).as('removeItem');
    });

    // Click the delete button for the second item (Velocity Running Tight, productId=2)
    cy.contains('Velocity Running Tight')
      .closest('[class*="MuiBox"]')
      .find('button')
      .last()
      .click();

    cy.wait('@removeItem');
    cy.contains('Velocity Running Tight').should('not.exist');
    cy.contains('CloudRun Performance Tee').should('be.visible');
  });

  it('passes size as a query param when removing a sized item', () => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('DELETE', `${COMMERCE}/cart/2*`, cart.afterRemove).as('removeItem');
    });

    cy.contains('Velocity Running Tight')
      .closest('[class*="MuiBox"]')
      .find('button')
      .last()
      .click();

    cy.wait('@removeItem').its('request.url').should('include', 'size=S');
  });

  it('shows Continue Shopping button that navigates to /products', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getProducts');
    });

    cy.contains('button', 'Continue Shopping').click();
    cy.url().should('include', '/products');
  });

  it('shows a Proceed to Checkout button', () => {
    cy.contains('button', 'Proceed to Checkout').should('be.visible');
  });
});

describe('Cart — authenticated user', () => {
  it('fetches the user cart (not session cart) when logged in', () => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.withItems).as('getCart');
    });

    // Visit as a logged-in user (token in localStorage)
    cy.visitAsUser('/cart');
    cy.wait('@getCart');

    // The same GET /cart endpoint is used — the backend distinguishes by JWT header
    cy.get('@getCart').its('request.headers').should('have.property', 'authorization');
    cy.contains('CloudRun Performance Tee').should('be.visible');
  });
});

describe('Cart — adding items from product detail', () => {
  it('cart badge increments after adding an item', () => {
    // Start with empty cart
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCartEmpty');
    });
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/4`, products.detailNoSizes).as('getProduct');
    });

    cy.visit('/products/4');
    cy.wait('@getProduct');

    // Stub cart responses for the add action and subsequent Navbar refresh
    cy.fixture('cart').then((cart) => {
      cy.intercept('POST', `${COMMERCE}/cart`, cart.afterAdd).as('addToCart');
      cy.intercept('GET', `${COMMERCE}/cart`, cart.afterAdd).as('getCartAfterAdd');
    });

    cy.contains('button', 'Add to Cart').click();
    cy.wait('@addToCart');
    cy.wait('@getCartAfterAdd');

    // Navbar badge should now show 1
    cy.get('[class*="MuiBadge-badge"]').should('contain', '1');
  });
});
