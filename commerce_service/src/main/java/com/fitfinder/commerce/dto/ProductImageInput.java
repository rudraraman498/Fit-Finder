package com.fitfinder.commerce.dto;

import jakarta.validation.constraints.NotBlank;

public record ProductImageInput(
        @NotBlank String url,
        String altText,
        boolean primary
) {}
