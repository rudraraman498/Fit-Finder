package com.fitfinder.commerce.repository;

import com.fitfinder.commerce.dto.AdminUserResponse;
import com.fitfinder.commerce.entity.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<User> findByEmail(String email) {
        List<User> rows = jdbc.query(
                "SELECT id, email, password, name, role, created_at FROM users WHERE email = ?",
                (rs, rowNum) -> new User(
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("password"),
                        rs.getString("name"),
                        rs.getString("role"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class)
                ),
                email
        );
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public boolean existsByEmail(String email) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, email);
        return count != null && count > 0;
    }

    public long countAll() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        return count != null ? count : 0L;
    }

    public List<AdminUserResponse> findAll(int limit, int offset) {
        return jdbc.query(
                "SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (rs, rowNum) -> new AdminUserResponse(
                        rs.getLong("id"),
                        rs.getString("email"),
                        rs.getString("name"),
                        rs.getObject("created_at", java.time.OffsetDateTime.class)
                ),
                limit, offset
        );
    }

    public long insert(String email, String hashedPassword, String name) {
        return insert(email, hashedPassword, name, "USER");
    }

    public long insert(String email, String hashedPassword, String name, String role) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                    new String[]{"id"}
            );
            ps.setString(1, email);
            ps.setString(2, hashedPassword);
            ps.setString(3, name);
            ps.setString(4, role);
            return ps;
        }, keyHolder);
        return Objects.requireNonNull(keyHolder.getKey()).longValue();
    }
}
