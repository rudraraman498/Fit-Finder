package com.fitfinder.commerce.service;

import com.fitfinder.commerce.dto.CartItem;
import com.fitfinder.commerce.dto.OrderItemResponse;
import com.fitfinder.commerce.dto.OrderResponse;
import com.fitfinder.commerce.dto.PlaceOrderRequest;
import com.fitfinder.commerce.repository.CartItemRepository;
import com.fitfinder.commerce.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final CartItemRepository cartItemRepo;

    public OrderService(OrderRepository orderRepo, CartItemRepository cartItemRepo) {
        this.orderRepo = orderRepo;
        this.cartItemRepo = cartItemRepo;
    }

    @Transactional
    public OrderResponse placeOrder(long userId, PlaceOrderRequest req) {
        List<CartItem> cartItems = cartItemRepo.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        BigDecimal total = cartItems.stream()
                .map(i -> i.price().multiply(BigDecimal.valueOf(i.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long orderId = orderRepo.createOrder(userId, total,
                req.shippingName(), req.shippingAddress(),
                req.shippingCity(), req.shippingState(), req.shippingZip(),
                req.paymentLastFour());

        List<OrderItemResponse> items = cartItems.stream()
                .map(i -> new OrderItemResponse(i.productId(), i.name(), i.price(), i.quantity(), i.size()))
                .toList();
        orderRepo.createOrderItems(orderId, items);

        cartItemRepo.clearCart(userId);

        return orderRepo.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new NoSuchElementException("Order not found after creation"));
    }

    public List<OrderResponse> getOrdersForUser(long userId) {
        return orderRepo.findByUserId(userId);
    }

    public OrderResponse getOrder(long orderId, long userId) {
        return orderRepo.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new NoSuchElementException("Order not found: " + orderId));
    }
}
