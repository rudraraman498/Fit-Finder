package com.fitfinder.commerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PlaceOrderRequest(
        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 255, message = "Name must be between 2 and 255 characters")
        String shippingName,

        @NotBlank(message = "Street address is required")
        @Size(max = 500, message = "Address must not exceed 500 characters")
        String shippingAddress,

        @NotBlank(message = "City is required")
        @Size(max = 100, message = "City must not exceed 100 characters")
        String shippingCity,

        @NotBlank(message = "State is required")
        @Pattern(regexp = "[A-Za-z]{2}", message = "State must be a 2-letter code (e.g. CA)")
        String shippingState,

        @NotBlank(message = "ZIP code is required")
        @Pattern(regexp = "\\d{5}(-\\d{4})?", message = "ZIP must be 5 digits or ZIP+4 format (e.g. 12345 or 12345-6789)")
        String shippingZip,

        @NotBlank(message = "Payment information is required")
        @Pattern(regexp = "\\d{4}", message = "Payment token must be exactly 4 digits")
        String paymentLastFour
) {}
