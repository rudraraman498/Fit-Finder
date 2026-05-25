// ---------------------------------------------------------------------------
// Semantic search page
// ---------------------------------------------------------------------------

const COMMERCE = 'http://localhost:8080';
const AI = 'http://localhost:8000';

describe('Search page', () => {
  beforeEach(() => {
    cy.fixture('cart').then((cart) => {
      cy.intercept('GET', `${COMMERCE}/cart`, cart.empty).as('getCart');
    });
    cy.visit('/');
  });

  // --- Initial state ---

  it('renders the hero headline', () => {
    cy.contains('Find Your Fit').should('be.visible');
  });

  it('shows suggestion chips in the initial empty state', () => {
    cy.contains('waterproof trail running shoes').should('be.visible');
    cy.contains('compression running tights').should('be.visible');
  });

  it('disables the Search button when the query is empty', () => {
    cy.contains('button', 'Search').should('be.disabled');
  });

  it('enables the Search button once the query is typed', () => {
    cy.get('input[placeholder*="waterproof"]').type('running shoes');
    cy.contains('button', 'Search').should('not.be.disabled');
  });

  // --- Triggering search ---

  it('calls POST /search with the correct payload on button click', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.get('input[placeholder*="waterproof"]').type('trail running shoes');
    cy.contains('button', 'Search').click();

    cy.wait('@search').its('request.body').should('deep.include', {
      query: 'trail running shoes',
      k: 5,
    });
  });

  it('triggers search on Enter key press', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.get('input[placeholder*="waterproof"]').type('running shoes{enter}');
    cy.wait('@search');
  });

  it('clicking a suggestion chip populates the input and fires search', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.contains('waterproof trail running shoes').click();
    cy.wait('@search').its('request.body.query').should('include', 'waterproof trail running shoes');
  });

  // --- Results rendering ---

  it('shows result cards and a result count after a successful search', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.get('input[placeholder*="waterproof"]').type('trail running shoes');
    cy.contains('button', 'Search').click();
    cy.wait('@search');

    cy.contains('2 results').should('be.visible');
    cy.contains('TrailSpark Trail Runner').should('be.visible');
    cy.contains('CloudRun Performance Tee').should('be.visible');
  });

  it('shows "No matches found" and suggestion chips when results are empty', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.empty).as('search');
    });

    cy.get('input[placeholder*="waterproof"]').type('xyzzy nonsense query');
    cy.contains('button', 'Search').click();
    cy.wait('@search');

    cy.contains('No matches found').should('be.visible');
    // Suggestion chips appear in empty state
    cy.contains('compression running tights').should('be.visible');
  });

  it('displays singular "1 result" when exactly one result is returned', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, {
        results: [search.results.results[0]],
      }).as('search');
    });

    cy.get('input[placeholder*="waterproof"]').type('trail shoe');
    cy.contains('button', 'Search').click();
    cy.wait('@search');

    cy.contains('1 result for').should('be.visible');
    cy.contains('2 results').should('not.exist');
  });

  // --- Filters ---

  it('includes category in the search payload when a category chip is selected', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.contains('Footwear').click(); // select category chip
    cy.get('input[placeholder*="waterproof"]').type('shoe');
    cy.contains('button', 'Search').click();

    cy.wait('@search').its('request.body').should('deep.include', {
      category: 'Footwear',
    });
  });

  it('excludes category from payload when "All" is re-selected', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.contains('Footwear').click();
    cy.contains('All').first().click(); // deselect
    cy.get('input[placeholder*="waterproof"]').type('shoe');
    cy.contains('button', 'Search').click();

    cy.wait('@search').its('request.body').should('not.have.property', 'category');
  });

  it('includes gender in the search payload when a gender chip is selected', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.contains("men's").click();
    cy.get('input[placeholder*="waterproof"]').type('shoe');
    cy.contains('button', 'Search').click();

    cy.wait('@search').its('request.body').should('deep.include', {
      gender: "men's",
    });
  });

  it('clicking a category chip again deselects it', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.contains('Footwear').click(); // select
    cy.contains('Footwear').click(); // deselect
    cy.get('input[placeholder*="waterproof"]').type('shoe');
    cy.contains('button', 'Search').click();

    cy.wait('@search').its('request.body').should('not.have.property', 'category');
  });

  it('sends k=10 when the 10 chip is selected', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });

    cy.contains('10').click();
    cy.get('input[placeholder*="waterproof"]').type('shoe');
    cy.contains('button', 'Search').click();

    cy.wait('@search').its('request.body').should('deep.include', { k: 10 });
  });

  // --- Error state ---

  it('shows an error alert when the AI service is unavailable', () => {
    cy.intercept('POST', `${AI}/search`, { statusCode: 503, body: 'Service Unavailable' }).as('search');

    cy.get('input[placeholder*="waterproof"]').type('trail running shoes');
    cy.contains('button', 'Search').click();
    cy.wait('@search');

    cy.contains('Search failed. Make sure the AI service is running.').should('be.visible');
  });

  // --- Navigation from result card ---

  it('navigates to product detail when a result card is clicked', () => {
    cy.fixture('search').then((search) => {
      cy.intercept('POST', `${AI}/search`, search.results).as('search');
    });
    cy.fixture('products').then((products) => {
      cy.intercept('GET', `${COMMERCE}/products/3`, products.detailNotIndexed).as('getProduct');
    });

    cy.get('input[placeholder*="waterproof"]').type('trail shoe');
    cy.contains('button', 'Search').click();
    cy.wait('@search');

    cy.contains('TrailSpark Trail Runner').click();
    cy.url().should('include', '/products/3');
  });
});
