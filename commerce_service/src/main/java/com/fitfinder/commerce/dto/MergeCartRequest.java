package com.fitfinder.commerce.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record MergeCartRequest(@NotNull @Valid List<MergeCartItem> items) {}
