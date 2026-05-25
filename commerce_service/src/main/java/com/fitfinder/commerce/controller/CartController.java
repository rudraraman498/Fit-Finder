package com.fitfinder.commerce.controller;

import com.fitfinder.commerce.dto.CartItemRequest;
import com.fitfinder.commerce.dto.CartResponse;
import com.fitfinder.commerce.service.CartService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    public CartResponse getCart(HttpSession session) {
        Long userId = authenticatedUserId();
        return userId != null
                ? cartService.getCartForUser(userId)
                : cartService.getCart(session);
    }

    @PostMapping
    public CartResponse addItem(HttpSession session, @Valid @RequestBody CartItemRequest req) {
        Long userId = authenticatedUserId();
        return userId != null
                ? cartService.addItemForUser(userId, req)
                : cartService.addItem(session, req);
    }

    @DeleteMapping("/{productId}")
    public CartResponse removeItem(
            HttpSession session,
            @PathVariable long productId,
            @RequestParam(required = false) String size) {
        Long userId = authenticatedUserId();
        return userId != null
                ? cartService.removeItemForUser(userId, productId, size)
                : cartService.removeItem(session, productId, size);
    }

    private Long authenticatedUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        return null;
    }
}
