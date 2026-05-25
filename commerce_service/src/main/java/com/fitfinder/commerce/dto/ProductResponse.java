package com.fitfinder.commerce.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ProductResponse(
        long id,
        String slug,
        String name,
        String brand,
        String description,
        String category,
        String subcategory,
        BigDecimal basePrice,
        BigDecimal price,
        String material,
        String fit,
        List<String> tags,
        String gender,
        String primaryImageUrl,
        List<ProductImageResponse> images,
        List<ProductVariantResponse> variants,
        boolean inStock,
        List<String> availableColors,
        List<String> availableSizes,
        boolean active,
        LocalDateTime createdAt,
        boolean embeddingReady
) {}
