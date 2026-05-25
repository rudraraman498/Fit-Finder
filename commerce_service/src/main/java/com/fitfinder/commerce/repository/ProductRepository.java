package com.fitfinder.commerce.repository;

import com.fitfinder.commerce.dto.ProductCreateRequest;
import com.fitfinder.commerce.dto.ProductImageInput;
import com.fitfinder.commerce.dto.ProductImageResponse;
import com.fitfinder.commerce.dto.ProductResponse;
import com.fitfinder.commerce.dto.ProductUpdateRequest;
import com.fitfinder.commerce.dto.ProductVariantInput;
import com.fitfinder.commerce.dto.ProductVariantResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Repository
public class ProductRepository {

    private final JdbcTemplate jdbc;

    public ProductRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private record ProductBase(
            long id,
            String slug,
            String name,
            String brand,
            String description,
            String category,
            String subcategory,
            java.math.BigDecimal basePrice,
            String material,
            String fit,
            List<String> tags,
            String gender,
            String primaryImageUrl,
            boolean active,
            java.time.LocalDateTime createdAt,
            boolean embeddingReady
    ) {}

    private static final String SELECT_BASE_FIELDS =
            "SELECT id, slug, name, brand, description, category, subcategory, base_price, " +
            "material, fit, tags, gender, primary_image_url, active, created_at, " +
            "(embedding IS NOT NULL) AS embedding_ready FROM products";

    public long count(String category, String gender) {
        List<Object> params = new ArrayList<>();
        String where = buildWhere(category, gender, params);
        return Objects.requireNonNull(
                jdbc.queryForObject("SELECT COUNT(*) FROM products" + where, Long.class, params.toArray())
        );
    }

    public List<ProductResponse> findAll(String category, String gender, int limit, int offset) {
        List<Object> params = new ArrayList<>();
        String where = buildWhere(category, gender, params);
        params.add(limit);
        params.add(offset);

        List<ProductBase> rows = jdbc.query(
                SELECT_BASE_FIELDS + where + " ORDER BY id LIMIT ? OFFSET ?",
                (rs, rowNum) -> mapBaseRow(rs),
                params.toArray()
        );

        List<ProductResponse> products = new ArrayList<>(rows.size());
        for (ProductBase row : rows) {
            products.add(toResponse(row));
        }
        return products;
    }

    public Optional<ProductResponse> findById(long id) {
        List<ProductBase> rows = jdbc.query(
                SELECT_BASE_FIELDS + " WHERE id = ?",
                (rs, rowNum) -> mapBaseRow(rs),
                id
        );
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(toResponse(rows.get(0)));
    }

    public long insertWithoutEmbedding(ProductCreateRequest req) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(conn -> {
            PreparedStatement ps = conn.prepareStatement(
                    "INSERT INTO products (" +
                            "slug, name, brand, description, category, subcategory, " +
                            "base_price, material, fit, tags, gender, primary_image_url, image_gallery, active" +
                            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)",
                    new String[]{"id"}
            );
            ps.setString(1, req.slug());
            ps.setString(2, req.name());
            ps.setString(3, req.brand());
            ps.setString(4, req.description());
            ps.setString(5, req.category());
            ps.setString(6, req.subcategory());
            ps.setBigDecimal(7, req.basePrice());
            ps.setString(8, req.material());
            ps.setString(9, req.fit());
            ps.setArray(10, conn.createArrayOf("text", req.tags().toArray()));
            ps.setString(11, req.gender());
            ps.setString(12, req.primaryImageUrl());
            ps.setString(13, serializeImages(req.images(), req.primaryImageUrl()));
            ps.setBoolean(14, req.active());
            return ps;
        }, keyHolder);

        long productId = Objects.requireNonNull(keyHolder.getKey()).longValue();
        insertVariants(productId, req.variants());
        return productId;
    }

    public long countAll() {
        return Objects.requireNonNull(
                jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class)
        );
    }

    public List<ProductResponse> findAllAdmin(int limit, int offset) {
        List<ProductBase> rows = jdbc.query(
                SELECT_BASE_FIELDS + " ORDER BY id DESC LIMIT ? OFFSET ?",
                (rs, rowNum) -> mapBaseRow(rs),
                limit, offset
        );
        List<ProductResponse> products = new ArrayList<>(rows.size());
        for (ProductBase row : rows) {
            products.add(toResponse(row));
        }
        return products;
    }

    public void update(long id, ProductUpdateRequest req) {
        List<Object> params = new ArrayList<>();
        List<String> sets = new ArrayList<>();

        if (req.name() != null) { sets.add("name = ?"); params.add(req.name()); }
        if (req.brand() != null) { sets.add("brand = ?"); params.add(req.brand()); }
        if (req.description() != null) { sets.add("description = ?"); params.add(req.description()); }
        if (req.category() != null) { sets.add("category = ?"); params.add(req.category()); }
        if (req.subcategory() != null) { sets.add("subcategory = ?"); params.add(req.subcategory()); }
        if (req.basePrice() != null) { sets.add("base_price = ?"); params.add(req.basePrice()); }
        if (req.material() != null) { sets.add("material = ?"); params.add(req.material()); }
        if (req.fit() != null) { sets.add("fit = ?"); params.add(req.fit()); }
        if (req.gender() != null) { sets.add("gender = ?"); params.add(req.gender()); }
        if (req.primaryImageUrl() != null) { sets.add("primary_image_url = ?"); params.add(req.primaryImageUrl()); }
        if (req.active() != null) { sets.add("active = ?"); params.add(req.active()); }

        if (req.tags() != null) {
            sets.add("tags = ?");
            params.add(req.tags().toArray(new String[0]));
        }

        if (sets.isEmpty()) return;

        params.add(id);
        String sql = "UPDATE products SET " + String.join(", ", sets) + " WHERE id = ?";

        if (req.tags() != null) {
            jdbc.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(sql);
                int i = 1;
                for (int j = 0; j < params.size() - 1; j++) {
                    Object p = params.get(j);
                    if (p instanceof String[] arr) {
                        ps.setArray(i++, conn.createArrayOf("text", arr));
                    } else {
                        ps.setObject(i++, p);
                    }
                }
                ps.setLong(i, id);
                return ps;
            });
        } else {
            jdbc.update(sql, params.toArray());
        }
    }

    public void setActive(long id, boolean active) {
        jdbc.update("UPDATE products SET active = ? WHERE id = ?", active, id);
    }

    public void updateEmbedding(long productId, double[] vector) {
        String vectorStr = Arrays.toString(vector);
        jdbc.update(
                "UPDATE products SET embedding = ?::vector WHERE id = ?",
                vectorStr, productId
        );
    }

    private ProductBase mapBaseRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        java.sql.Array tagsArr = rs.getArray("tags");
        List<String> tags = tagsArr != null
                ? Arrays.asList((String[]) tagsArr.getArray())
                : Collections.emptyList();

        return new ProductBase(
                rs.getLong("id"),
                rs.getString("slug"),
                rs.getString("name"),
                rs.getString("brand"),
                rs.getString("description"),
                rs.getString("category"),
                rs.getString("subcategory"),
                rs.getBigDecimal("base_price"),
                rs.getString("material"),
                rs.getString("fit"),
                tags,
                rs.getString("gender"),
                rs.getString("primary_image_url"),
                rs.getBoolean("active"),
                rs.getTimestamp("created_at").toLocalDateTime(),
                rs.getBoolean("embedding_ready")
        );
    }

    private ProductResponse toResponse(ProductBase row) {
        List<ProductVariantResponse> variants = findVariants(row.id(), row.basePrice());
        List<ProductImageResponse> images = findImages(row.id(), row.primaryImageUrl());
        boolean inStock = variants.stream().anyMatch(v -> v.active() && v.stockQty() > 0);

        Set<String> colors = new LinkedHashSet<>();
        Set<String> sizes = new LinkedHashSet<>();
        for (ProductVariantResponse variant : variants) {
            if (!variant.active()) {
                continue;
            }
            colors.add(variant.colorName());
            sizes.add(variant.sizeLabel() + " (" + variant.sizeSystem() + ")");
        }

        return new ProductResponse(
                row.id(),
                row.slug(),
                row.name(),
                row.brand(),
                row.description(),
                row.category(),
                row.subcategory(),
                row.basePrice(),
                row.basePrice(),
                row.material(),
                row.fit(),
                row.tags(),
                row.gender(),
                row.primaryImageUrl(),
                images,
                variants,
                inStock,
                List.copyOf(colors),
                List.copyOf(sizes),
                row.active(),
                row.createdAt(),
                row.embeddingReady()
        );
    }

    private List<ProductImageResponse> findImages(long productId, String fallbackPrimaryUrl) {
        List<ProductImageResponse> images = jdbc.query(
                """
                SELECT
                    img->>'url' AS url,
                    img->>'altText' AS alt_text,
                    COALESCE((img->>'primary')::boolean, FALSE) AS is_primary
                FROM products p
                CROSS JOIN LATERAL jsonb_array_elements(p.image_gallery) AS img
                WHERE p.id = ?
                """,
                (rs, rowNum) -> new ProductImageResponse(
                        rs.getString("url"),
                        rs.getString("alt_text"),
                        rs.getBoolean("is_primary")
                ),
                productId
        );
        if (images.isEmpty()) {
            return List.of(new ProductImageResponse(fallbackPrimaryUrl, null, true));
        }

        boolean hasPrimary = images.stream().anyMatch(ProductImageResponse::primary);
        if (!hasPrimary) {
            ProductImageResponse first = images.get(0);
            List<ProductImageResponse> fixed = new ArrayList<>(images);
            fixed.set(0, new ProductImageResponse(first.url(), first.altText(), true));
            return fixed;
        }
        return images;
    }

    private List<ProductVariantResponse> findVariants(long productId, java.math.BigDecimal basePrice) {
        return jdbc.query(
                "SELECT id, sku, color_name, size_label, size_system, stock_qty, " +
                        "COALESCE(price_override, ?) AS effective_price, active " +
                        "FROM product_variants WHERE product_id = ? ORDER BY id",
                (rs, rowNum) -> new ProductVariantResponse(
                        rs.getLong("id"),
                        rs.getString("sku"),
                        rs.getString("color_name"),
                        rs.getString("size_label"),
                        rs.getString("size_system"),
                        rs.getInt("stock_qty"),
                        rs.getBigDecimal("effective_price"),
                        rs.getBoolean("active")
                ),
                basePrice, productId
        );
    }

    private void insertVariants(long productId, List<ProductVariantInput> variants) {
        String sql = "INSERT INTO product_variants (" +
                "product_id, sku, color_name, size_label, size_system, stock_qty, price_override, active" +
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        for (ProductVariantInput variant : variants) {
            jdbc.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(sql);
                ps.setLong(1, productId);
                ps.setString(2, variant.sku());
                ps.setString(3, variant.colorName());
                ps.setString(4, variant.sizeLabel());
                ps.setString(5, variant.sizeSystem());
                ps.setInt(6, variant.stockQty());
                if (variant.priceOverride() == null) {
                    ps.setNull(7, Types.NUMERIC);
                } else {
                    ps.setBigDecimal(7, variant.priceOverride());
                }
                ps.setBoolean(8, variant.active());
                return ps;
            });
        }
    }

    private String buildWhere(String category, String gender, List<Object> params) {
        List<String> conditions = new ArrayList<>();
        conditions.add("active = TRUE");
        if (category != null) {
            conditions.add("category = ?");
            params.add(category);
        }
        if (gender != null) {
            conditions.add("gender = ?");
            params.add(gender);
        }
        return " WHERE " + String.join(" AND ", conditions);
    }

    private String serializeImages(List<ProductImageInput> images, String primaryImageUrl) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < images.size(); i++) {
            ProductImageInput image = images.get(i);
            boolean primary = image.primary() || image.url().equals(primaryImageUrl);
            if (i > 0) {
                sb.append(",");
            }
            sb.append("{");
            sb.append("\"url\":\"").append(escapeJson(image.url())).append("\",");
            if (image.altText() == null) {
                sb.append("\"altText\":null,");
            } else {
                sb.append("\"altText\":\"").append(escapeJson(image.altText())).append("\",");
            }
            sb.append("\"primary\":").append(primary);
            sb.append("}");
        }
        sb.append("]");
        return sb.toString();
    }

    private String escapeJson(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
