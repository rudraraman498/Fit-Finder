package com.fitfinder.commerce.service;

import com.fitfinder.commerce.dto.ProductCreateRequest;
import com.fitfinder.commerce.dto.ProductImageInput;
import com.fitfinder.commerce.dto.ProductVariantInput;

import java.math.BigDecimal;
import java.util.List;

/**
 * Shared factory for building valid ProductCreateRequest instances in tests.
 * Extracted so every service test uses the same minimal valid object,
 * making tests easier to read and easier to update when the DTO evolves.
 */
final class ProductServiceTestFactory {

    private ProductServiceTestFactory() {}

    static ProductCreateRequest validRequest(String slug) {
        var image = new ProductImageInput("/img/" + slug + ".jpg", "alt", true);
        var variant = new ProductVariantInput("SKU-" + slug.toUpperCase(), "Black", "M", "alpha", 5, null, true);
        return new ProductCreateRequest(
                slug, "Product " + slug, "Test Brand",
                "A description of the product.",
                "Apparel", "Tops",
                new BigDecimal("49.99"),
                "Cotton", "Regular",
                List.of("tag1"),
                "unisex",
                "/img/" + slug + ".jpg",
                List.of(image),
                List.of(variant),
                true
        );
    }
}
