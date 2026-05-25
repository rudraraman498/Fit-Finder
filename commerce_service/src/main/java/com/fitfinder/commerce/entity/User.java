package com.fitfinder.commerce.entity;

import java.time.OffsetDateTime;

public record User(
        long id,
        String email,
        String password,
        String name,
        OffsetDateTime createdAt
) {}
