package com.fitfinder.commerce.repository;

import com.fitfinder.commerce.dto.AdminOrderResponse;
import com.fitfinder.commerce.dto.OrderItemResponse;
import com.fitfinder.commerce.dto.OrderResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public class OrderRepository {

    private final JdbcTemplate jdbc;

    public OrderRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long createOrder(long userId, BigDecimal total, String shippingName,
                            String shippingAddress, String shippingCity,
                            String shippingState, String shippingZip,
                            String paymentLastFour) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                    INSERT INTO orders (user_id, status, total, shipping_name, shipping_address,
                        shipping_city, shipping_state, shipping_zip, payment_last4, payment_status)
                    VALUES (?, 'CONFIRMED', ?, ?, ?, ?, ?, ?, ?, 'PAID')
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setBigDecimal(2, total);
            ps.setString(3, shippingName);
            ps.setString(4, shippingAddress);
            ps.setString(5, shippingCity);
            ps.setString(6, shippingState);
            ps.setString(7, shippingZip);
            ps.setString(8, paymentLastFour);
            return ps;
        }, keyHolder);
        return ((Number) keyHolder.getKeys().get("id")).longValue();
    }

    public void createOrderItems(long orderId, List<OrderItemResponse> items) {
        for (OrderItemResponse item : items) {
            jdbc.update(
                    "INSERT INTO order_items (order_id, product_id, name, price, quantity, size) VALUES (?, ?, ?, ?, ?, ?)",
                    orderId, item.productId(), item.name(), item.price(), item.quantity(), item.size());
        }
    }

    public List<OrderResponse> findByUserId(long userId) {
        List<OrderResponse> orders = jdbc.query(
                """
                SELECT id, status, total, shipping_name, shipping_address,
                       shipping_city, shipping_state, shipping_zip, created_at,
                       payment_status, payment_last4
                FROM orders WHERE user_id = ? ORDER BY created_at DESC
                """,
                (rs, rowNum) -> new OrderResponse(
                        rs.getLong("id"),
                        rs.getString("status"),
                        rs.getBigDecimal("total"),
                        rs.getString("shipping_name"),
                        rs.getString("shipping_address"),
                        rs.getString("shipping_city"),
                        rs.getString("shipping_state"),
                        rs.getString("shipping_zip"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class),
                        List.of(),
                        rs.getString("payment_status"),
                        rs.getString("payment_last4")
                ),
                userId);

        return orders.stream().map(this::withItems).toList();
    }

    public Optional<OrderResponse> findByIdAndUserId(long orderId, long userId) {
        List<OrderResponse> rows = jdbc.query(
                """
                SELECT id, status, total, shipping_name, shipping_address,
                       shipping_city, shipping_state, shipping_zip, created_at,
                       payment_status, payment_last4
                FROM orders WHERE id = ? AND user_id = ?
                """,
                (rs, rowNum) -> new OrderResponse(
                        rs.getLong("id"),
                        rs.getString("status"),
                        rs.getBigDecimal("total"),
                        rs.getString("shipping_name"),
                        rs.getString("shipping_address"),
                        rs.getString("shipping_city"),
                        rs.getString("shipping_state"),
                        rs.getString("shipping_zip"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class),
                        List.of(),
                        rs.getString("payment_status"),
                        rs.getString("payment_last4")
                ),
                orderId, userId);

        return rows.stream().findFirst().map(this::withItems);
    }

    public long countAll() {
        return Objects.requireNonNull(
                jdbc.queryForObject("SELECT COUNT(*) FROM orders", Long.class)
        );
    }

    public java.math.BigDecimal getTotalRevenue() {
        java.math.BigDecimal revenue = jdbc.queryForObject(
                "SELECT COALESCE(SUM(total), 0) FROM orders", java.math.BigDecimal.class);
        return revenue != null ? revenue : java.math.BigDecimal.ZERO;
    }

    public List<AdminOrderResponse> findAll(int limit, int offset) {
        List<AdminOrderResponse> orders = jdbc.query(
                """
                SELECT o.id, o.user_id, u.email AS user_email, o.status, o.total,
                       o.shipping_name, o.shipping_address, o.shipping_city,
                       o.shipping_state, o.shipping_zip, o.created_at,
                       o.payment_status, o.payment_last4
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
                LIMIT ? OFFSET ?
                """,
                (rs, rowNum) -> new AdminOrderResponse(
                        rs.getLong("id"),
                        rs.getLong("user_id"),
                        rs.getString("user_email"),
                        rs.getString("status"),
                        rs.getBigDecimal("total"),
                        rs.getString("shipping_name"),
                        rs.getString("shipping_address"),
                        rs.getString("shipping_city"),
                        rs.getString("shipping_state"),
                        rs.getString("shipping_zip"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class),
                        List.of(),
                        rs.getString("payment_status"),
                        rs.getString("payment_last4")
                ),
                limit, offset);
        return orders.stream().map(this::withAdminItems).toList();
    }

    public void updateStatus(long orderId, String status) {
        jdbc.update("UPDATE orders SET status = ? WHERE id = ?", status, orderId);
    }

    private AdminOrderResponse withAdminItems(AdminOrderResponse order) {
        List<OrderItemResponse> items = jdbc.query(
                "SELECT product_id, name, price, quantity, size FROM order_items WHERE order_id = ? ORDER BY id",
                (rs, rowNum) -> new OrderItemResponse(
                        rs.getLong("product_id"),
                        rs.getString("name"),
                        rs.getBigDecimal("price"),
                        rs.getInt("quantity"),
                        rs.getString("size")
                ),
                order.id());
        return new AdminOrderResponse(order.id(), order.userId(), order.userEmail(), order.status(),
                order.total(), order.shippingName(), order.shippingAddress(), order.shippingCity(),
                order.shippingState(), order.shippingZip(), order.createdAt(), items,
                order.paymentStatus(), order.paymentLast4());
    }

    private OrderResponse withItems(OrderResponse order) {
        List<OrderItemResponse> items = jdbc.query(
                "SELECT product_id, name, price, quantity, size FROM order_items WHERE order_id = ? ORDER BY id",
                (rs, rowNum) -> new OrderItemResponse(
                        rs.getLong("product_id"),
                        rs.getString("name"),
                        rs.getBigDecimal("price"),
                        rs.getInt("quantity"),
                        rs.getString("size")
                ),
                order.id());
        return new OrderResponse(order.id(), order.status(), order.total(),
                order.shippingName(), order.shippingAddress(), order.shippingCity(),
                order.shippingState(), order.shippingZip(), order.createdAt(), items,
                order.paymentStatus(), order.paymentLast4());
    }
}
