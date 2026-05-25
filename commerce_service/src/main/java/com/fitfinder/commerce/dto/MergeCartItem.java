package com.fitfinder.commerce.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record MergeCartItem(
        @NotNull Long productId,
        @Min(1) int quantity,
        String size
) {}
