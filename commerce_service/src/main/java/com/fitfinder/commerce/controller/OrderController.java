package com.fitfinder.commerce.controller;

import com.fitfinder.commerce.dto.OrderResponse;
import com.fitfinder.commerce.dto.PlaceOrderRequest;
import com.fitfinder.commerce.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(@Valid @RequestBody PlaceOrderRequest req) {
        return orderService.placeOrder(userId(), req);
    }

    @GetMapping
    public List<OrderResponse> listOrders() {
        return orderService.getOrdersForUser(userId());
    }

    @GetMapping("/{id}")
    public OrderResponse getOrder(@PathVariable long id) {
        return orderService.getOrder(id, userId());
    }

    private long userId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
