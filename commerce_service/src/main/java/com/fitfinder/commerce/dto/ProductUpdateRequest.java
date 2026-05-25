package com.fitfinder.commerce.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProductUpdateRequest(
        String name,
        String brand,
        String description,
        String category,
        String subcategory,
        BigDecimal basePrice,
        String material,
        String fit,
        List<String> tags,
        String gender,
        String primaryImageUrl,
        Boolean active
) {}
