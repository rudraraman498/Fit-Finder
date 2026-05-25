package com.fitfinder.commerce.service;

import com.fitfinder.commerce.config.JwtUtil;
import com.fitfinder.commerce.dto.AuthResponse;
import com.fitfinder.commerce.dto.AuthUserInfo;
import com.fitfinder.commerce.dto.CartResponse;
import com.fitfinder.commerce.dto.MergeCartItem;
import com.fitfinder.commerce.entity.User;
import com.fitfinder.commerce.repository.CartItemRepository;
import com.fitfinder.commerce.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final CartItemRepository cartItemRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CartService cartService;

    public AuthService(
            UserRepository userRepo,
            CartItemRepository cartItemRepo,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            CartService cartService
    ) {
        this.userRepo = userRepo;
        this.cartItemRepo = cartItemRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.cartService = cartService;
    }

    public AuthResponse register(String name, String email, String password) {
        if (userRepo.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered.");
        }
        String hashed = passwordEncoder.encode(password);
        long userId = userRepo.insert(email, hashed, name);
        String token = jwtUtil.generate(userId, email);
        return new AuthResponse(token, new AuthUserInfo(userId, email, name));
    }

    public AuthResponse login(String email, String password) {
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));
        if (!passwordEncoder.matches(password, user.password())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }
        String role = user.role() != null ? user.role() : "USER";
        String token = jwtUtil.generate(user.id(), user.email(), role);
        return new AuthResponse(token, new AuthUserInfo(user.id(), user.email(), user.name()));
    }

    public CartResponse mergeCart(long userId, List<MergeCartItem> items) {
        for (MergeCartItem item : items) {
            cartItemRepo.upsert(userId, item.productId(), item.size(), item.quantity());
        }
        return cartService.getCartForUser(userId);
    }
}
