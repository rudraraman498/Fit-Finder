package com.fitfinder.commerce.controller;

import com.fitfinder.commerce.dto.AuthResponse;
import com.fitfinder.commerce.dto.CartResponse;
import com.fitfinder.commerce.dto.LoginRequest;
import com.fitfinder.commerce.dto.MergeCartRequest;
import com.fitfinder.commerce.dto.RegisterRequest;
import com.fitfinder.commerce.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req.name(), req.email(), req.password());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req.email(), req.password());
    }

    @PostMapping("/merge-cart")
    public CartResponse mergeCart(Authentication auth, @Valid @RequestBody MergeCartRequest req) {
        long userId = (Long) auth.getPrincipal();
        return authService.mergeCart(userId, req.items());
    }
}
