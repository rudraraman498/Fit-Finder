package com.fitfinder.commerce.service;

import com.fitfinder.commerce.dto.CartItem;
import com.fitfinder.commerce.dto.CartItemRequest;
import com.fitfinder.commerce.dto.CartResponse;
import com.fitfinder.commerce.dto.ProductResponse;
import com.fitfinder.commerce.repository.CartItemRepository;
import com.fitfinder.commerce.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class CartService {

    private static final String CART_KEY = "cart";

    private final ProductRepository productRepo;
    private final CartItemRepository cartItemRepo;

    public CartService(ProductRepository productRepo, CartItemRepository cartItemRepo) {
        this.productRepo = productRepo;
        this.cartItemRepo = cartItemRepo;
    }

    // ── Session-based cart (anonymous users) ──────────────────────────────────

    public CartResponse getCart(HttpSession session) {
        return buildResponse(getCartMap(session));
    }

    public CartResponse addItem(HttpSession session, CartItemRequest request) {
        ProductResponse product = productRepo.findById(request.productId())
                .orElseThrow(() -> new NoSuchElementException("Product not found: " + request.productId()));

        String key = cartKey(request.productId(), request.size());
        Map<String, CartItem> cart = getCartMap(session);
        cart.merge(
                key,
                new CartItem(request.productId(), product.name(), product.price(), request.quantity(), request.size()),
                (existing, incoming) -> new CartItem(
                        existing.productId(), existing.name(), existing.price(),
                        existing.quantity() + incoming.quantity(), existing.size()
                )
        );
        return buildResponse(cart);
    }

    public CartResponse removeItem(HttpSession session, long productId, String size) {
        Map<String, CartItem> cart = getCartMap(session);
        cart.remove(cartKey(productId, size));
        return buildResponse(cart);
    }

    // ── DB-based cart (authenticated users) ───────────────────────────────────

    public CartResponse getCartForUser(long userId) {
        return buildResponse(cartItemRepo.findByUserId(userId));
    }

    public CartResponse addItemForUser(long userId, CartItemRequest request) {
        productRepo.findById(request.productId())
                .orElseThrow(() -> new NoSuchElementException("Product not found: " + request.productId()));
        cartItemRepo.upsert(userId, request.productId(), request.size(), request.quantity());
        return getCartForUser(userId);
    }

    public CartResponse removeItemForUser(long userId, long productId, String size) {
        cartItemRepo.delete(userId, productId, size);
        return getCartForUser(userId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String cartKey(long productId, String size) {
        return productId + ":" + (size != null ? size : "");
    }

    @SuppressWarnings("unchecked")
    private Map<String, CartItem> getCartMap(HttpSession session) {
        Map<String, CartItem> cart = (Map<String, CartItem>) session.getAttribute(CART_KEY);
        if (cart == null) {
            cart = new LinkedHashMap<>();
            session.setAttribute(CART_KEY, cart);
        }
        return cart;
    }

    private CartResponse buildResponse(Map<String, CartItem> cart) {
        return buildResponse(new ArrayList<>(cart.values()));
    }

    private CartResponse buildResponse(List<CartItem> items) {
        int itemCount = items.stream().mapToInt(CartItem::quantity).sum();
        BigDecimal total = items.stream()
                .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(items, itemCount, total);
    }
}
