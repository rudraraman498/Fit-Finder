package com.fitfinder.commerce.controller;

import com.fitfinder.commerce.dto.AdminOrderResponse;
import com.fitfinder.commerce.dto.AdminStatsResponse;
import com.fitfinder.commerce.dto.AdminUserResponse;
import com.fitfinder.commerce.dto.OrderStatusUpdateRequest;
import com.fitfinder.commerce.dto.PagedProductsResponse;
import com.fitfinder.commerce.dto.ProductCreateRequest;
import com.fitfinder.commerce.dto.ProductResponse;
import com.fitfinder.commerce.dto.ProductUpdateRequest;
import com.fitfinder.commerce.repository.OrderRepository;
import com.fitfinder.commerce.repository.ProductRepository;
import com.fitfinder.commerce.repository.UserRepository;
import com.fitfinder.commerce.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final ProductRepository productRepo;
    private final OrderRepository orderRepo;
    private final UserRepository userRepo;
    private final ProductService productService;

    public AdminController(ProductRepository productRepo, OrderRepository orderRepo,
                           UserRepository userRepo, ProductService productService) {
        this.productRepo = productRepo;
        this.orderRepo = orderRepo;
        this.userRepo = userRepo;
        this.productService = productService;
    }

    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        long totalProducts = productRepo.countAll();
        long totalOrders = orderRepo.countAll();
        long totalUsers = userRepo.countAll();
        var totalRevenue = orderRepo.getTotalRevenue();
        return new AdminStatsResponse(totalProducts, totalOrders, totalUsers, totalRevenue);
    }

    // Products

    @GetMapping("/products")
    public PagedProductsResponse products(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        long total = productRepo.countAll();
        int totalPages = (int) Math.max(1, (total + size - 1) / size);
        int offset = page * size;
        List<ProductResponse> products = productRepo.findAllAdmin(size, offset);
        return new PagedProductsResponse(total, page, size, totalPages, products);
    }

    @PostMapping("/products")
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductCreateRequest req) {
        return ResponseEntity.status(201).body(productService.create(req));
    }

    @PutMapping("/products/{id}")
    public ProductResponse updateProduct(@PathVariable long id, @RequestBody ProductUpdateRequest req) {
        productRepo.update(id, req);
        return productService.getById(id);
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deactivateProduct(@PathVariable long id) {
        productRepo.setActive(id, false);
        return ResponseEntity.noContent().build();
    }

    // Orders

    @GetMapping("/orders")
    public List<AdminOrderResponse> orders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        int offset = page * size;
        return orderRepo.findAll(size, offset);
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<Void> updateOrderStatus(@PathVariable long id,
                                                   @Valid @RequestBody OrderStatusUpdateRequest req) {
        orderRepo.updateStatus(id, req.status());
        return ResponseEntity.noContent().build();
    }

    // Users

    @GetMapping("/users")
    public List<AdminUserResponse> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        int offset = page * size;
        return userRepo.findAll(size, offset);
    }
}
