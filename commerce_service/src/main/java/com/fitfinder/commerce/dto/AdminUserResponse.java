package com.fitfinder.commerce.dto;

import java.time.OffsetDateTime;

public record AdminUserResponse(
        long id,
        String email,
        String name,
        OffsetDateTime createdAt
) {}
