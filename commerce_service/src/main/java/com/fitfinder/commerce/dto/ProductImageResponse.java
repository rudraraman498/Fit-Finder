package com.fitfinder.commerce.dto;

public record ProductImageResponse(
        String url,
        String altText,
        boolean primary
) {}
