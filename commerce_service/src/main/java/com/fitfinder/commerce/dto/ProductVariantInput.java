package com.fitfinder.commerce.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductVariantInput(
        @NotBlank @Size(max = 80) String sku,
        @NotBlank @Size(max = 80) String colorName,
        @NotBlank @Size(max = 40) String sizeLabel,
        @NotBlank @Size(max = 40) String sizeSystem,
        @NotNull @Min(0) Integer stockQty,
        @DecimalMin("0.01") BigDecimal priceOverride,
        Boolean active
) {
    public ProductVariantInput {
        if (stockQty < 0) {
            throw new IllegalArgumentException("stockQty must be >= 0.");
        }
        if (active == null) active = true;
    }
}
