package com.fitfinder.commerce.dto;

import java.math.BigDecimal;

public record OrderItemResponse(
        long productId,
        String name,
        BigDecimal price,
        int quantity,
        String size
) {}
