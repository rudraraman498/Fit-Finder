package com.fitfinder.commerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record ProductCreateRequest(
        @NotBlank @Size(max = 160) String slug,
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 120) String brand,
        @NotBlank String description,
        @NotBlank @Size(max = 80) String category,
        @NotBlank @Size(max = 80) String subcategory,
        @NotNull @DecimalMin("0.01") BigDecimal basePrice,
        @Size(max = 120) String material,
        @Size(max = 80) String fit,
        List<String> tags,
        String gender,
        @NotBlank String primaryImageUrl,
        @Valid List<@NotNull ProductImageInput> images,
        @Valid List<@NotNull ProductVariantInput> variants,
        Boolean active
) {
    public ProductCreateRequest {
        if (tags == null) tags = List.of();
        if (gender == null || gender.isBlank()) gender = "unisex";
        if (images == null) images = List.of();
        if (variants == null) variants = List.of();
        if (active == null) active = true;

        if (variants.isEmpty()) {
            throw new IllegalArgumentException("variants must contain at least one variant.");
        }
        if (images.isEmpty()) {
            throw new IllegalArgumentException("images must contain at least one image.");
        }
        if (images.stream().noneMatch(ProductImageInput::primary)) {
            throw new IllegalArgumentException("At least one image must be marked primary.");
        }
        if (images.stream().noneMatch(i -> i.url().equals(primaryImageUrl))) {
            throw new IllegalArgumentException("primaryImageUrl must exist in images.");
        }
    }
}
