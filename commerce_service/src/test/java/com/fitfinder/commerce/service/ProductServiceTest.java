package com.fitfinder.commerce.service;

import com.fitfinder.commerce.dto.PagedProductsResponse;
import com.fitfinder.commerce.dto.ProductResponse;
import com.fitfinder.commerce.repository.PendingEmbeddingRepository;
import com.fitfinder.commerce.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock private ProductRepository productRepo;
    @Mock private PendingEmbeddingRepository pendingRepo;
    @Mock private EmbeddingWorker embeddingWorker;

    @InjectMocks
    private ProductService productService;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static ProductResponse stubProduct(long id) {
        return new ProductResponse(
                id, "slug-" + id, "Product " + id, "Brand",
                "A description.", "Apparel", "Tops",
                new BigDecimal("49.99"), new BigDecimal("49.99"),
                "Cotton", "Regular",
                List.of("tag1"), "unisex", "/img.jpg",
                List.of(), List.of(),
                true, List.of("Black"), List.of("M (alpha)"),
                true, LocalDateTime.now(), true
        );
    }

    // ── getPage() ────────────────────────────────────────────────────────────

    @Test
    void getPage_totalZero_totalPagesIsOne() {
        when(productRepo.count(null, null)).thenReturn(0L);
        when(productRepo.findAll(null, null, 20, 0)).thenReturn(List.of());

        PagedProductsResponse resp = productService.getPage(0, 20, null, null);

        assertThat(resp.totalPages()).isEqualTo(1);
        assertThat(resp.total()).isEqualTo(0L);
        assertThat(resp.products()).isEmpty();
    }

    @Test
    void getPage_totalFitsExactlyOnePage_totalPagesIsOne() {
        when(productRepo.count(null, null)).thenReturn(20L);
        when(productRepo.findAll(null, null, 20, 0)).thenReturn(List.of(stubProduct(1)));

        PagedProductsResponse resp = productService.getPage(0, 20, null, null);

        assertThat(resp.totalPages()).isEqualTo(1);
    }

    @Test
    void getPage_totalOverflowsOnePage_totalPagesRoundsUp() {
        // 21 products / page size 20 → 2 pages
        when(productRepo.count(null, null)).thenReturn(21L);
        when(productRepo.findAll(null, null, 20, 0)).thenReturn(List.of());

        PagedProductsResponse resp = productService.getPage(0, 20, null, null);

        assertThat(resp.totalPages()).isEqualTo(2);
    }

    @Test
    void getPage_45Total_size20_page0_offset0_totalPages3() {
        when(productRepo.count(null, null)).thenReturn(45L);
        when(productRepo.findAll(null, null, 20, 0)).thenReturn(List.of());

        PagedProductsResponse resp = productService.getPage(0, 20, null, null);

        assertThat(resp.totalPages()).isEqualTo(3);
        assertThat(resp.page()).isEqualTo(0);
        assertThat(resp.size()).isEqualTo(20);
        // Verify findAll was called with offset = page * size = 0
        verify(productRepo).findAll(null, null, 20, 0);
    }

    @Test
    void getPage_45Total_size20_page2_offset40() {
        when(productRepo.count(null, null)).thenReturn(45L);
        when(productRepo.findAll(null, null, 20, 40)).thenReturn(List.of());

        productService.getPage(2, 20, null, null);

        // Offset must be page * size = 2 * 20 = 40
        verify(productRepo).findAll(null, null, 20, 40);
    }

    @Test
    void getPage_passesFiltersToRepository() {
        when(productRepo.count("Footwear", "men's")).thenReturn(5L);
        when(productRepo.findAll(eq("Footwear"), eq("men's"), anyInt(), anyInt()))
                .thenReturn(List.of(stubProduct(1)));

        PagedProductsResponse resp = productService.getPage(0, 20, "Footwear", "men's");

        assertThat(resp.products()).hasSize(1);
        verify(productRepo).count("Footwear", "men's");
        verify(productRepo).findAll(eq("Footwear"), eq("men's"), anyInt(), anyInt());
    }

    @Test
    void getPage_returnsProductsFromRepository() {
        var products = List.of(stubProduct(1), stubProduct(2), stubProduct(3));
        when(productRepo.count(null, null)).thenReturn(3L);
        when(productRepo.findAll(null, null, 20, 0)).thenReturn(products);

        PagedProductsResponse resp = productService.getPage(0, 20, null, null);

        assertThat(resp.products()).hasSize(3);
        assertThat(resp.products().get(0).id()).isEqualTo(1L);
        assertThat(resp.products().get(2).id()).isEqualTo(3L);
    }

    // ── getById() ────────────────────────────────────────────────────────────

    @Test
    void getById_existingId_returnsProduct() {
        var product = stubProduct(42);
        when(productRepo.findById(42L)).thenReturn(Optional.of(product));

        ProductResponse result = productService.getById(42L);

        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.name()).isEqualTo("Product 42");
    }

    @Test
    void getById_unknownId_throwsNoSuchElement() {
        when(productRepo.findById(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.getById(9999L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Product not found: 9999");
    }

    // ── create() ─────────────────────────────────────────────────────────────

    @Test
    void create_happyPath_enqueuesToPendingAndTriggersAsync() {
        var req = ProductServiceTestFactory.validRequest("new-slug");
        when(productRepo.insertWithoutEmbedding(req)).thenReturn(10L);
        when(productRepo.findById(10L)).thenReturn(Optional.of(stubProduct(10)));

        ProductResponse result = productService.create(req);

        assertThat(result.id()).isEqualTo(10L);
        verify(pendingRepo).enqueue(10L);
        verify(embeddingWorker).triggerAsync(10L);
    }

    @Test
    void create_enqueueMustHappenBeforeTriggerAsync() {
        var req = ProductServiceTestFactory.validRequest("slug-order");
        when(productRepo.insertWithoutEmbedding(req)).thenReturn(5L);
        when(productRepo.findById(5L)).thenReturn(Optional.of(stubProduct(5)));

        productService.create(req);

        var order = org.mockito.Mockito.inOrder(pendingRepo, embeddingWorker);
        order.verify(pendingRepo).enqueue(5L);
        order.verify(embeddingWorker).triggerAsync(5L);
    }

    @Test
    void create_returnsProductFetchedAfterInsert() {
        var req = ProductServiceTestFactory.validRequest("fetch-slug");
        when(productRepo.insertWithoutEmbedding(req)).thenReturn(7L);
        var saved = stubProduct(7);
        when(productRepo.findById(7L)).thenReturn(Optional.of(saved));

        ProductResponse result = productService.create(req);

        // Must return what the repo returns — not reconstruct from the request
        assertThat(result).isSameAs(saved);
    }

    @Test
    void create_duplicateSlug_throwsIllegalArgumentWithSlugInMessage() {
        var req = ProductServiceTestFactory.validRequest("taken-slug");
        when(productRepo.insertWithoutEmbedding(req))
                .thenThrow(new DuplicateKeyException("unique constraint"));

        assertThatThrownBy(() -> productService.create(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("taken-slug");
    }

    @Test
    void create_duplicateSlug_doesNotEnqueueOrTrigger() {
        var req = ProductServiceTestFactory.validRequest("dupe-slug");
        when(productRepo.insertWithoutEmbedding(req))
                .thenThrow(new DuplicateKeyException("constraint"));

        assertThatThrownBy(() -> productService.create(req))
                .isInstanceOf(IllegalArgumentException.class);

        verify(pendingRepo, never()).enqueue(anyLong());
        verify(embeddingWorker, never()).triggerAsync(anyLong());
    }

    @Test
    void create_productDisappearsAfterInsert_throwsIllegalState() {
        var req = ProductServiceTestFactory.validRequest("ghost-slug");
        when(productRepo.insertWithoutEmbedding(req)).thenReturn(99L);
        when(productRepo.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.create(req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Product disappeared after insert");
    }
}
