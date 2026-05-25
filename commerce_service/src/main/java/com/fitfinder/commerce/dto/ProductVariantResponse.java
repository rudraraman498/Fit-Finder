package com.fitfinder.commerce.dto;

import java.math.BigDecimal;

public record ProductVariantResponse(
        long id,
        String sku,
        String colorName,
        String sizeLabel,
        String sizeSystem,
        int stockQty,
        BigDecimal price,
        boolean active
) {}
