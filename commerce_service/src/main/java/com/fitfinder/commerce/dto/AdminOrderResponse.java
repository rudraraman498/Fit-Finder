package com.fitfinder.commerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record AdminOrderResponse(
        long id,
        long userId,
        String userEmail,
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
