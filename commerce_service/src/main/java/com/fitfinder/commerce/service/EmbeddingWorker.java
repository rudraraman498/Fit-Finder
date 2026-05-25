package com.fitfinder.commerce.service;

import com.fitfinder.commerce.dto.ProductResponse;
import com.fitfinder.commerce.repository.PendingEmbeddingRepository;
import com.fitfinder.commerce.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmbeddingWorker {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingWorker.class);

    private final ProductRepository productRepo;
    private final PendingEmbeddingRepository pendingRepo;
    private final AIServiceClient aiClient;

    @Value("${embedding.worker.stuck-threshold-minutes}")
    private int stuckThresholdMinutes;

    // Self-injection via proxy to allow @Async to work when called from processStuck
    @Autowired
    @Lazy
    private EmbeddingWorker self;

    public EmbeddingWorker(ProductRepository productRepo,
                           PendingEmbeddingRepository pendingRepo,
                           AIServiceClient aiClient) {
        this.productRepo = productRepo;
        this.pendingRepo = pendingRepo;
        this.aiClient = aiClient;
    }

    @Async("embeddingExecutor")
    public void triggerAsync(long productId) {
        generateAndStore(productId);
    }

    public void generateAndStore(long productId) {
        try {
            pendingRepo.markProcessing(productId);

            ProductResponse product = productRepo.findById(productId)
                    .orElseThrow(() -> new IllegalStateException("Product not found: " + productId));

            String text = buildText(product);
            double[] vector = aiClient.embed(text);
            productRepo.updateEmbedding(productId, vector);
            pendingRepo.markDone(productId);

            log.info("Embedding stored for product {}", productId);
        } catch (Exception e) {
            log.error("Failed to generate embedding for product {}: {}", productId, e.getMessage());
            pendingRepo.markFailed(productId);
        }
    }

    @Scheduled(fixedDelay = 60000)
    public void processStuck() {
        List<Long> stuck = pendingRepo.findStuck(stuckThresholdMinutes);
        if (!stuck.isEmpty()) {
            log.info("Found {} stuck embedding(s), re-triggering...", stuck.size());
            stuck.forEach(self::triggerAsync);
        }
    }

    private String buildText(ProductResponse p) {
        StringBuilder sb = new StringBuilder();
        sb.append(p.name()).append(". ");
        sb.append("Brand: ").append(p.brand()).append(". ");
        sb.append(p.description()).append(" ");
        sb.append("Category: ").append(p.category()).append(". ");
        sb.append("Subcategory: ").append(p.subcategory()).append(".");
        if (p.material() != null && !p.material().isBlank()) {
            sb.append(" Material: ").append(p.material()).append(".");
        }
        if (p.fit() != null && !p.fit().isBlank()) {
            sb.append(" Fit: ").append(p.fit()).append(".");
        }
        if (p.tags() != null && !p.tags().isEmpty()) {
            sb.append(" Tags: ").append(String.join(", ", p.tags())).append(".");
        }
        if (p.availableColors() != null && !p.availableColors().isEmpty()) {
            sb.append(" Colors: ").append(String.join(", ", p.availableColors())).append(".");
        }
        if (p.availableSizes() != null && !p.availableSizes().isEmpty()) {
            sb.append(" Sizes: ").append(String.join(", ", p.availableSizes())).append(".");
        }
        if (p.gender() != null && !p.gender().equals("unisex")) {
            sb.append(" Gender: ").append(p.gender()).append(".");
        }
        return sb.toString().trim();
    }
}
