package com.fitfinder.commerce.dto;

import java.math.BigDecimal;

public record AdminStatsResponse(
        long totalProducts,
        long totalOrders,
        long totalUsers,
        BigDecimal totalRevenue
) {}
