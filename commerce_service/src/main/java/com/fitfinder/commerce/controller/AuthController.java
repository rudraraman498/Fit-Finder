package com.fitfinder.commerce.controller;

import com.fitfinder.commerce.config.RsaKeyService;
import com.fitfinder.commerce.dto.AuthResponse;
import com.fitfinder.commerce.dto.CartResponse;
import com.fitfinder.commerce.dto.LoginRequest;
import com.fitfinder.commerce.dto.MergeCartRequest;
import com.fitfinder.commerce.dto.RegisterRequest;
import com.fitfinder.commerce.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final RsaKeyService rsaKeyService;

    public AuthController(AuthService authService, RsaKeyService rsaKeyService) {
        this.authService = authService;
        this.rsaKeyService = rsaKeyService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        try {
            String email = rsaKeyService.decrypt(req.email());
            String password = rsaKeyService.decrypt(req.password());
            if (!email.contains("@")) {
                throw new IllegalArgumentException("Invalid email address.");
            }
            if (password.length() < 8) {
                throw new IllegalArgumentException("Password must be at least 8 characters.");
            }
            return authService.register(req.name(), email, password);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Auth payload decryption failed [{}]: {}", e.getClass().getSimpleName(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid encrypted payload");
        }
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        try {
            String email = rsaKeyService.decrypt(req.email());
            String password = rsaKeyService.decrypt(req.password());
            return authService.login(email, password);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Auth payload decryption failed [{}]: {}", e.getClass().getSimpleName(), e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid encrypted payload");
        }
    }

    @PostMapping("/merge-cart")
    public CartResponse mergeCart(Authentication auth, @Valid @RequestBody MergeCartRequest req) {
        long userId = (Long) auth.getPrincipal();
        return authService.mergeCart(userId, req.items());
    }
}
