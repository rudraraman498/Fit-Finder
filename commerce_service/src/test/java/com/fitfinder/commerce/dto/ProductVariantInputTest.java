package com.fitfinder.commerce.dto;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Pure unit tests for the ProductVariantInput compact constructor.
 *
 * ⚠️  Known bug: the compact constructor does {@code if (stockQty < 0)} before
 * Bean Validation runs. When stockQty is null, unboxing it throws a
 * NullPointerException rather than the expected validation error.
 * The test {@code nullStockQty_throwsNpe_bug} documents this behaviour so
 * it is not accidentally "fixed" in a way that silently swallows the NPE.
 * The recommended fix is to guard with {@code if (stockQty != null && stockQty < 0)}.
 */
class ProductVariantInputTest {

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static ProductVariantInput valid() {
        return new ProductVariantInput("SKU-001", "Black", "M", "alpha", 10, null, true);
    }

    // ── Happy path ───────────────────────────────────────────────────────────

    @Test
    void validInput_doesNotThrow() {
        assertThat(valid()).isNotNull();
    }

    @Test
    void zeroStockQty_isValid() {
        var variant = new ProductVariantInput("SKU-001", "Black", "M", "alpha", 0, null, true);
        assertThat(variant.stockQty()).isEqualTo(0);
    }

    @Test
    void nullActive_defaultsToTrue() {
        var variant = new ProductVariantInput("SKU-001", "Black", "M", "alpha", 5, null, null);
        assertThat(variant.active()).isTrue();
    }

    @Test
    void withPriceOverride_isValid() {
        var variant = new ProductVariantInput("SKU-002", "White", "L", "alpha", 3,
                new BigDecimal("129.99"), true);
        assertThat(variant.priceOverride()).isEqualByComparingTo("129.99");
    }

    @Test
    void usSizeSystem_isValid() {
        var variant = new ProductVariantInput("SKU-003", "Black", "10", "us", 7, null, true);
        assertThat(variant.sizeSystem()).isEqualTo("us");
        assertThat(variant.sizeLabel()).isEqualTo("10");
    }

    // ── stockQty validation ──────────────────────────────────────────────────

    @Test
    void negativeStockQty_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                new ProductVariantInput("SKU-001", "Black", "M", "alpha", -1, null, true)
        )
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("stockQty must be >= 0.");
    }

    /**
     * Documents the known NPE bug: {@code if (stockQty < 0)} unboxes a null
     * Integer before @NotNull validation fires, causing NullPointerException
     * instead of a clean validation error.
     *
     * Fix: change the guard to {@code if (stockQty != null && stockQty < 0)}.
     */
    @Test
    void nullStockQty_throwsNpe_knownBug() {
        assertThatThrownBy(() ->
                new ProductVariantInput("SKU-001", "Black", "M", "alpha", null, null, true)
        )
                .isInstanceOf(NullPointerException.class);
        // After the fix, this should instead produce a ConstraintViolationException
        // (from @NotNull) or be handled gracefully by the compact constructor guard.
    }
}
