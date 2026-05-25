package com.fitfinder.commerce.service;

import com.fitfinder.commerce.dto.PagedProductsResponse;
import com.fitfinder.commerce.dto.ProductCreateRequest;
import com.fitfinder.commerce.dto.ProductResponse;
import com.fitfinder.commerce.repository.PendingEmbeddingRepository;
import com.fitfinder.commerce.repository.ProductRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProductService {

    private final ProductRepository productRepo;
    private final PendingEmbeddingRepository pendingRepo;
    private final EmbeddingWorker embeddingWorker;

    public ProductService(ProductRepository productRepo,
                          PendingEmbeddingRepository pendingRepo,
                          EmbeddingWorker embeddingWorker) {
        this.productRepo = productRepo;
        this.pendingRepo = pendingRepo;
        this.embeddingWorker = embeddingWorker;
    }

    public PagedProductsResponse getPage(int page, int size, String category, String gender) {
        long total = productRepo.count(category, gender);
        int totalPages = (int) Math.max(1, (total + size - 1) / size);
        int offset = page * size;
        List<ProductResponse> products = productRepo.findAll(category, gender, size, offset);
        return new PagedProductsResponse(total, page, size, totalPages, products);
    }

    public ProductResponse getById(long id) {
        return productRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Product not found: " + id));
    }

    public ProductResponse create(ProductCreateRequest req) {
        long productId;
        try {
            productId = productRepo.insertWithoutEmbedding(req);
        } catch (DuplicateKeyException e) {
            throw new IllegalArgumentException("A product with slug '" + req.slug() + "' already exists.");
        }
        pendingRepo.enqueue(productId);
        embeddingWorker.triggerAsync(productId);
        return productRepo.findById(productId)
                .orElseThrow(() -> new IllegalStateException("Product disappeared after insert"));
    }
}
