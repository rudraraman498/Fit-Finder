package com.fitfinder.commerce.dto;

import java.util.List;

public record PagedProductsResponse(
        long total,
        int page,
        int size,
        int totalPages,
        List<ProductResponse> products
) {}
