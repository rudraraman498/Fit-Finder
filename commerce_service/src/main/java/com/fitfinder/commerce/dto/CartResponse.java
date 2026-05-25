package com.fitfinder.commerce.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        List<CartItem> items,
        int itemCount,
        BigDecimal total
) {}
