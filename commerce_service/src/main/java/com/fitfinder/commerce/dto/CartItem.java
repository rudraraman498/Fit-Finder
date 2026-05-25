package com.fitfinder.commerce.dto;

import java.math.BigDecimal;

public record CartItem(
        long productId,
        String name,
        BigDecimal price,
        int quantity,
        String size
) {}
