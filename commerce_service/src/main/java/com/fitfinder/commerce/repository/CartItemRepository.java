package com.fitfinder.commerce.repository;

import com.fitfinder.commerce.dto.CartItem;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CartItemRepository {

    private final JdbcTemplate jdbc;

    public CartItemRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<CartItem> findByUserId(long userId) {
        return jdbc.query(
                """
                SELECT ci.product_id, p.name, p.base_price, ci.quantity, ci.size
                FROM cart_items ci
                JOIN products p ON p.id = ci.product_id
                WHERE ci.user_id = ?
                ORDER BY ci.id
                """,
                (rs, rowNum) -> new CartItem(
                        rs.getLong("product_id"),
                        rs.getString("name"),
                        rs.getBigDecimal("base_price"),
                        rs.getInt("quantity"),
                        rs.getString("size")
                ),
                userId
        );
    }

    public void upsert(long userId, long productId, String size, int quantity) {
        jdbc.update(
                """
                INSERT INTO cart_items (user_id, product_id, size, quantity)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (user_id, product_id, size)
                DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
                """,
                userId, productId, size == null ? "" : size, quantity
        );
    }

    public void delete(long userId, long productId, String size) {
        jdbc.update(
                "DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?",
                userId, productId, size == null ? "" : size
        );
    }

    public void clearCart(long userId) {
        jdbc.update("DELETE FROM cart_items WHERE user_id = ?", userId);
    }
}
