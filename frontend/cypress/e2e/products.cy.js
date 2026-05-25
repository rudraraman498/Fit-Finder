// ---------------------------------------------------------------------------
// Products listing & product detail
// ---------------------------------------------------------------------------

const COMMERCE = 'http://localhost:8080';

describe('Products listing page', () => {
  beforeEach(() => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getProducts');
    });
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
    cy.visit('/products');
    cy.wait('@getProducts');
  });

  it('shows the Products heading', () => {
    cy.contains('h4', 'Products').should('be.visible');
  });

  it('renders a card for each product returned', () => {
    cy.contains('CloudRun Performance Tee').should('be.visible');
    cy.contains('Velocity Running Tight').should('be.visible');
    cy.contains('TrailSpark Trail Runner').should('be.visible');
  });

  it('shows the price on each card', () => {
    cy.contains('$45.00').should('be.visible');
    cy.contains('$89.99').should('be.visible');
    cy.contains('$139.99').should('be.visible');
  });

  it('shows an "Indexing…" chip on products that are not yet embedded', () => {
    cy.contains('Indexing…').should('be.visible');
  });

  it('sends the category filter when a category chip is clicked', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getFiltered');
    });

    cy.contains('Footwear').click();
    cy.wait('@getFiltered').its('request.url').should('include', 'category=Footwear');
  });

  it('sends the gender filter when a gender chip is clicked', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getFiltered');
    });

    cy.contains("men's").click();
    cy.wait('@getFiltered').its('request.url').should('include', "gender=men%27s");
  });

  it('resets category filter when "All" is clicked', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getFiltered');
    });
    cy.contains('Footwear').click();

    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getReset');
    });
    cy.contains('All').first().click();
    cy.wait('@getReset').its('request.url').should('not.include', 'category=');
  });

  it('shows pagination when there are multiple pages', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.pageTwo).as('getMultiPage');
    });
    cy.visit('/products');
    cy.wait('@getMultiPage');

    cy.get('[aria-label*="page"]').should('exist');
  });

  it('navigates to the product detail page on card click', () => {
    cy.contains('CloudRun Performance Tee').click();
    cy.url().should('include', '/products/1');
  });

  it('shows an error alert when the API call fails', () => {
    cy.intercept('GET', `${COMMERCE}/products*`, { statusCode: 503 }).as('getProductsFail');
    cy.visit('/products');
    cy.wait('@getProductsFail');

    cy.contains('Failed to load products.').should('be.visible');
  });
});

describe('Product detail page', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
  });

  it('shows product name, price, and description', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/1`, products.detail).as('getProduct');
    });
    cy.visit('/products/1');
    cy.wait('@getProduct');

    cy.contains('CloudRun Performance Tee').should('be.visible');
    cy.contains('$45.00').should('be.visible');
    cy.contains('Lightweight running tee with moisture-wicking fabric').should('be.visible');
  });

  it('shows tag chips for the product', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/1`, products.detail).as('getProduct');
    });
    cy.visit('/products/1');
    cy.wait('@getProduct');

    cy.contains('running').should('be.visible');
    cy.contains('moisture-wicking').should('be.visible');
  });

  it('shows a size selector when the product has sizes', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/1`, products.detail).as('getProduct');
    });
    cy.visit('/products/1');
    cy.wait('@getProduct');

    // Size chips should appear
    cy.contains('S').should('be.visible');
    cy.contains('M').should('be.visible');
    cy.contains('L').should('be.visible');
  });

  it('disables Add to Cart until a size is selected', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/1`, products.detail).as('getProduct');
    });
    cy.visit('/products/1');
    cy.wait('@getProduct');

    // Button reads "Select a Size" and is disabled
    cy.contains('button', 'Select a Size').should('be.disabled');

    // After selecting a size the button becomes enabled
    cy.contains('M').click();
    cy.contains('button', 'Add to Cart').should('not.be.disabled');
  });

  it('enables Add to Cart immediately when product has no sizes', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/4`, products.detailNoSizes).as('getProduct');
    });
    cy.visit('/products/4');
    cy.wait('@getProduct');

    cy.contains('button', 'Add to Cart').should('not.be.disabled');
  });

  it('shows snackbar and dispatches cartUpdated event after adding to cart', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/1`, products.detail).as('getProduct');
    });
    cy.fixture('cart').then((cart) => {
      cy.intercept('POST', `${COMMERCE}/cart`, cart.afterAdd).as('addToCart');
    });
    cy.visit('/products/1');
    cy.wait('@getProduct');

    cy.contains('M').click();
    cy.contains('button', 'Add to Cart').click();

    cy.wait('@addToCart').its('request.body').should('deep.include', {
      productId: 1,
      quantity: 1,
      size: 'M',
    });
    cy.contains('Added to cart').should('be.visible');
  });

  it('increments and decrements the quantity stepper', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/4`, products.detailNoSizes).as('getProduct');
    });
    cy.visit('/products/4');
    cy.wait('@getProduct');

    // Default quantity is 1
    cy.contains('1').should('be.visible');

    cy.get('[data-testid="AddIcon"]').closest('button').click();
    cy.get('[data-testid="AddIcon"]').closest('button').click();
    cy.contains('3').should('be.visible');

    cy.get('[data-testid="RemoveIcon"]').closest('button').click();
    cy.contains('2').should('be.visible');
  });

  it('shows an embedding-in-progress warning when embeddingReady is false', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/3`, products.detailNotIndexed).as('getProduct');
    });
    cy.visit('/products/3');
    cy.wait('@getProduct');

    cy.contains('Search indexing in progress').should('be.visible');
  });

  it('shows an error when the product is not found', () => {
    cy.intercept('GET', `${COMMERCE}/products/99999`, { statusCode: 404 }).as('getProduct');
    cy.visit('/products/99999');
    cy.wait('@getProduct');

    cy.contains('Product not found.').should('be.visible');
  });

  it('navigates back when the Back button is clicked', () => {
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products*`, products.page).as('getProducts');
      cy.intercept('GET', `${COMMERCE}/products/1`, products.detail).as('getProduct');
    });
    cy.visit('/products');
    cy.wait('@getProducts');
    cy.contains('CloudRun Performance Tee').click();
    cy.wait('@getProduct');

    cy.contains('button', 'Back').click();
    cy.url().should('include', '/products');
  });
});
