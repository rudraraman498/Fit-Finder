package com.fitfinder.commerce.controller;

import com.fitfinder.commerce.config.JwtUtil;
import com.fitfinder.commerce.dto.AdminLoginRequest;
import com.fitfinder.commerce.dto.AuthResponse;
import com.fitfinder.commerce.dto.AuthUserInfo;
import com.fitfinder.commerce.entity.User;
import com.fitfinder.commerce.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/admin/auth")
public class AdminAuthController {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public AdminAuthController(JwtUtil jwtUtil, UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.jwtUtil = jwtUtil;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AdminLoginRequest req) {
        User user = userRepo.findByEmail(req.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin credentials"));

        if (!"ADMIN".equals(user.role()) || !passwordEncoder.matches(req.password(), user.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin credentials");
        }

        String token = jwtUtil.generate(user.id(), user.email(), "ADMIN");
        return new AuthResponse(token, new AuthUserInfo(user.id(), user.email(), user.name()));
    }
}
