package com.fitfinder.commerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderResponse(
        long id,
        String status,
        BigDecimal total,
        String shippingName,
        String shippingAddress,
        String shippingCity,
        String shippingState,
        String shippingZip,
        OffsetDateTime createdAt,
        List<OrderItemResponse> items,
        String paymentStatus,
        String paymentLast4
) {}
