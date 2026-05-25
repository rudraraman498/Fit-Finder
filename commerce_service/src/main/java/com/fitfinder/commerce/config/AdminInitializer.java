package com.fitfinder.commerce.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminInitializer(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            @Value("${admin.username}") String adminEmail,
            @Value("${admin.password}") String adminPassword
    ) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        ensureRoleColumn();
        ensureAdminUser();
    }

    private void ensureRoleColumn() {
        try {
            jdbc.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER'"
            );
        } catch (Exception e) {
            log.warn("Could not add role column (may already exist): {}", e.getMessage());
        }
    }

    private void ensureAdminUser() {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, adminEmail
        );
        if (count != null && count > 0) {
            jdbc.update("UPDATE users SET role = 'ADMIN' WHERE email = ?", adminEmail);
            log.info("Admin user already exists — ensured role=ADMIN for {}", adminEmail);
            return;
        }
        String hashed = passwordEncoder.encode(adminPassword);
        jdbc.update(
                "INSERT INTO users (email, password, name, role) VALUES (?, ?, 'Admin', 'ADMIN')",
                adminEmail, hashed
        );
        log.info("Admin user created: {}", adminEmail);
    }
}
