package com.fitfinder.commerce.dto;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pure unit tests for the ProductCreateRequest compact constructor.
 *
 * Each test constructs the record directly — no Spring context needed.
 * The compact constructor runs eagerly, so invalid states throw before
 * the object is ever accessible to a caller.
 */
class ProductCreateRequestTest {

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Minimal valid image list — one primary image whose URL matches primaryImageUrl. */
    private static List<ProductImageInput> oneImage(String url) {
        return List.of(new ProductImageInput(url, "alt", true));
    }

    /** One minimal valid variant. */
    private static List<ProductVariantInput> oneVariant() {
        return List.of(new ProductVariantInput("SKU-001", "Black", "M", "alpha", 10, null, true));
    }

    private static ProductCreateRequest valid() {
        return new ProductCreateRequest(
                "test-slug", "Test Product", "Test Brand",
                "A great product.", "Apparel", "Tops",
                new BigDecimal("49.99"), "Cotton", "Regular",
                List.of("tag1", "tag2"), "unisex",
                "/img/front.jpg", oneImage("/img/front.jpg"),
                oneVariant(), true
        );
    }

    // ── Happy-path defaults ──────────────────────────────────────────────────

    @Test
    void validRequest_doesNotThrow() {
        assertThat(valid()).isNotNull();
    }

    @Test
    void nullTags_defaultsToEmptyList() {
        var req = new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                null,          // tags = null
                "unisex",
                "/img.jpg", oneImage("/img.jpg"), oneVariant(), true
        );
        assertThat(req.tags()).isEmpty();
    }

    @Test
    void nullGender_defaultsToUnisex() {
        var req = new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), null,     // gender = null
                "/img.jpg", oneImage("/img.jpg"), oneVariant(), true
        );
        assertThat(req.gender()).isEqualTo("unisex");
    }

    @Test
    void blankGender_defaultsToUnisex() {
        var req = new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "   ",    // gender = blank
                "/img.jpg", oneImage("/img.jpg"), oneVariant(), true
        );
        assertThat(req.gender()).isEqualTo("unisex");
    }

    @Test
    void nullActive_defaultsToTrue() {
        var req = new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img.jpg", oneImage("/img.jpg"), oneVariant(), null
        );
        assertThat(req.active()).isTrue();
    }

    // ── Variants validation ──────────────────────────────────────────────────

    @Test
    void nullVariants_defaultsToEmptyThenThrows() {
        assertThatThrownBy(() -> new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img.jpg", oneImage("/img.jpg"),
                null,          // variants = null → defaults to List.of() → throws
                true
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("variants must contain at least one variant.");
    }

    @Test
    void emptyVariants_throws() {
        assertThatThrownBy(() -> new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img.jpg", oneImage("/img.jpg"),
                List.of(),     // explicitly empty
                true
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("variants must contain at least one variant.");
    }

    // ── Images validation ────────────────────────────────────────────────────

    @Test
    void nullImages_defaultsToEmptyThenThrows() {
        assertThatThrownBy(() -> new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img.jpg",
                null,          // images = null → defaults to List.of() → throws
                oneVariant(), true
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("images must contain at least one image.");
    }

    @Test
    void emptyImages_throws() {
        assertThatThrownBy(() -> new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img.jpg",
                List.of(),     // explicitly empty
                oneVariant(), true
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("images must contain at least one image.");
    }

    @Test
    void noImageMarkedPrimary_throws() {
        var noPrimary = List.of(
                new ProductImageInput("/img/front.jpg", "front", false),
                new ProductImageInput("/img/back.jpg", "back", false)
        );
        assertThatThrownBy(() -> new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img/front.jpg", noPrimary, oneVariant(), true
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("At least one image must be marked primary.");
    }

    @Test
    void primaryImageUrlNotInImagesList_throws() {
        // One image is primary, but its URL does not match primaryImageUrl
        var images = List.of(new ProductImageInput("/img/front.jpg", "front", true));
        assertThatThrownBy(() -> new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img/OTHER.jpg",  // does not match any image URL
                images, oneVariant(), true
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("primaryImageUrl must exist in images.");
    }

    @Test
    void multipleImages_exactlyOnePrimary_isValid() {
        var images = List.of(
                new ProductImageInput("/img/front.jpg", "front", true),
                new ProductImageInput("/img/back.jpg", "back", false),
                new ProductImageInput("/img/side.jpg", "side", false)
        );
        var req = new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img/front.jpg", images, oneVariant(), true
        );
        assertThat(req.images()).hasSize(3);
    }

    @Test
    void multipleVariants_isValid() {
        var variants = List.of(
                new ProductVariantInput("SKU-001", "Black", "S", "alpha", 5, null, true),
                new ProductVariantInput("SKU-002", "Black", "M", "alpha", 8, null, true),
                new ProductVariantInput("SKU-003", "White", "M", "alpha", 3, new BigDecimal("55.00"), true)
        );
        var req = new ProductCreateRequest(
                "slug", "Name", "Brand", "Desc", "Cat", "Sub",
                new BigDecimal("9.99"), null, null,
                List.of(), "unisex",
                "/img.jpg", oneImage("/img.jpg"), variants, true
        );
        assertThat(req.variants()).hasSize(3);
    }
}
