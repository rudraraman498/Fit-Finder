package com.fitfinder.commerce.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Repository
public class PendingEmbeddingRepository {

    private final JdbcTemplate jdbc;

    public PendingEmbeddingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void enqueue(long productId) {
        jdbc.update(
                "INSERT INTO pending_embeddings (product_id) VALUES (?)",
                productId
        );
    }

    public void markProcessing(long productId) {
        jdbc.update(
                "UPDATE pending_embeddings SET status = 'processing', attempts = attempts + 1 " +
                "WHERE product_id = ? AND status IN ('pending', 'processing')",
                productId
        );
    }

    public void markDone(long productId) {
        jdbc.update(
                "UPDATE pending_embeddings SET status = 'done' WHERE product_id = ?",
                productId
        );
    }

    public void markFailed(long productId) {
        jdbc.update(
                "UPDATE pending_embeddings SET status = 'failed' WHERE product_id = ?",
                productId
        );
    }

    public List<Long> findStuck(int thresholdMinutes) {
        Timestamp cutoff = Timestamp.from(
                Instant.now().minus(thresholdMinutes, ChronoUnit.MINUTES)
        );
        return jdbc.queryForList(
                "SELECT product_id FROM pending_embeddings " +
                "WHERE status IN ('pending', 'processing') " +
                "AND created_at < ? AND attempts < 5",
                Long.class,
                cutoff
        );
    }
}
