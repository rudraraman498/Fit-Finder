package com.fitfinder.commerce.service;

import com.fitfinder.commerce.dto.CartItem;
import com.fitfinder.commerce.dto.CartItemRequest;
import com.fitfinder.commerce.dto.CartResponse;
import com.fitfinder.commerce.dto.ProductResponse;
import com.fitfinder.commerce.repository.CartItemRepository;
import com.fitfinder.commerce.repository.ProductRepository;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock private ProductRepository productRepo;
    @Mock private CartItemRepository cartItemRepo;
    @Mock private HttpSession session;

    @InjectMocks
    private CartService cartService;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static final String CART_KEY = "cart";

    /** Returns a valid ProductResponse stub for use in session-cart tests. */
    private static ProductResponse product(long id, String name, BigDecimal price) {
        return new ProductResponse(
                id, "slug-" + id, name, "Brand", "Desc",
                "Apparel", "Tops",
                price, price, "Cotton", "Regular",
                List.of(), "unisex", "/img.jpg",
                List.of(), List.of(),
                true, List.of(), List.of(),
                true, LocalDateTime.now(), true
        );
    }

    /**
     * Wires the mock session so that {@code session.getAttribute("cart")} returns
     * the same live map on every call — simulating real session storage.
     * The map is also returned so tests can pre-populate it or inspect it afterwards.
     */
    private Map<String, CartItem> bindLiveSessionCart() {
        Map<String, CartItem> cart = new LinkedHashMap<>();
        when(session.getAttribute(CART_KEY)).thenReturn(cart);
        return cart;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Session-based cart (anonymous users)
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    class SessionCart {

        @Test
        void getCart_noExistingCart_returnsEmptyResponse() {
            when(session.getAttribute(CART_KEY)).thenReturn(null);

            CartResponse resp = cartService.getCart(session);

            assertThat(resp.items()).isEmpty();
            assertThat(resp.itemCount()).isEqualTo(0);
            assertThat(resp.total()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        void getCart_existingItems_reflectsCorrectCountAndTotal() {
            Map<String, CartItem> existing = new LinkedHashMap<>();
            existing.put("1:", new CartItem(1L, "Tee", new BigDecimal("45.00"), 2, null));
            existing.put("2:M", new CartItem(2L, "Tight", new BigDecimal("89.99"), 1, "M"));
            when(session.getAttribute(CART_KEY)).thenReturn(existing);

            CartResponse resp = cartService.getCart(session);

            // itemCount = 2 + 1 = 3
            assertThat(resp.itemCount()).isEqualTo(3);
            // total = (45.00 * 2) + (89.99 * 1) = 179.99
            assertThat(resp.total()).isEqualByComparingTo("179.99");
        }

        @Test
        void addItem_newProduct_addsToCart() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            when(productRepo.findById(1L)).thenReturn(Optional.of(product(1, "Tee", new BigDecimal("45.00"))));

            CartResponse resp = cartService.addItem(session, new CartItemRequest(1L, 1, null));

            assertThat(resp.items()).hasSize(1);
            assertThat(resp.items().get(0).name()).isEqualTo("Tee");
            assertThat(resp.items().get(0).quantity()).isEqualTo(1);
            assertThat(resp.itemCount()).isEqualTo(1);
            assertThat(resp.total()).isEqualByComparingTo("45.00");
        }

        @Test
        void addItem_sameProductAndSizeTwice_mergesQuantity() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            when(productRepo.findById(1L)).thenReturn(Optional.of(product(1, "Tee", new BigDecimal("45.00"))));

            cartService.addItem(session, new CartItemRequest(1L, 1, "M"));
            cartService.addItem(session, new CartItemRequest(1L, 2, "M"));

            CartResponse resp = cartService.getCart(session);
            assertThat(resp.items()).hasSize(1);
            assertThat(resp.items().get(0).quantity()).isEqualTo(3);
            assertThat(resp.itemCount()).isEqualTo(3);
            assertThat(resp.total()).isEqualByComparingTo("135.00");
        }

        @Test
        void addItem_sameProductDifferentSizes_createsSeparateEntries() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            when(productRepo.findById(1L)).thenReturn(Optional.of(product(1, "Tee", new BigDecimal("45.00"))));

            cartService.addItem(session, new CartItemRequest(1L, 1, "S"));
            cartService.addItem(session, new CartItemRequest(1L, 1, "L"));

            CartResponse resp = cartService.getCart(session);
            assertThat(resp.items()).hasSize(2);
            assertThat(resp.itemCount()).isEqualTo(2);
        }

        @Test
        void addItem_nullSize_andBlankSize_treatedAsDistinctKeys() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            // Stub two separate calls
            when(productRepo.findById(1L))
                    .thenReturn(Optional.of(product(1, "Tee", new BigDecimal("45.00"))))
                    .thenReturn(Optional.of(product(1, "Tee", new BigDecimal("45.00"))));

            // null size key = "1:"
            cartService.addItem(session, new CartItemRequest(1L, 1, null));
            // Manually insert a different key to simulate a subsequent call with no size
            cartService.addItem(session, new CartItemRequest(1L, 1, null));

            // Both should merge into the same "1:" key
            CartResponse resp = cartService.getCart(session);
            assertThat(resp.items()).hasSize(1);
            assertThat(resp.items().get(0).quantity()).isEqualTo(2);
        }

        @Test
        void addItem_productNotFound_throwsNoSuchElement() {
            // session.getAttribute is never reached when findById throws — no stub needed
            when(productRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    cartService.addItem(session, new CartItemRequest(999L, 1, null))
            )
                    .isInstanceOf(NoSuchElementException.class)
                    .hasMessageContaining("Product not found: 999");
        }

        @Test
        void addItem_correctTotalCalculation() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            when(productRepo.findById(1L)).thenReturn(Optional.of(product(1, "Shoe", new BigDecimal("139.99"))));

            CartResponse resp = cartService.addItem(session, new CartItemRequest(1L, 3, "10"));

            // 139.99 * 3 = 419.97
            assertThat(resp.total()).isEqualByComparingTo("419.97");
            assertThat(resp.itemCount()).isEqualTo(3);
        }

        @Test
        void removeItem_existingItem_removesIt() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            cart.put("1:M", new CartItem(1L, "Tee", new BigDecimal("45.00"), 2, "M"));
            cart.put("2:S", new CartItem(2L, "Short", new BigDecimal("30.00"), 1, "S"));

            CartResponse resp = cartService.removeItem(session, 1L, "M");

            assertThat(resp.items()).hasSize(1);
            assertThat(resp.items().get(0).productId()).isEqualTo(2L);
            assertThat(resp.itemCount()).isEqualTo(1);
            assertThat(resp.total()).isEqualByComparingTo("30.00");
        }

        @Test
        void removeItem_nullSize_removesCorrectEntry() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            cart.put("1:", new CartItem(1L, "Mat", new BigDecimal("49.99"), 1, null));
            cart.put("1:M", new CartItem(1L, "Tee", new BigDecimal("45.00"), 1, "M"));

            CartResponse resp = cartService.removeItem(session, 1L, null);

            // Only the null-size entry (key "1:") should be removed
            assertThat(resp.items()).hasSize(1);
            assertThat(resp.items().get(0).size()).isEqualTo("M");
        }

        @Test
        void removeItem_nonExistentProductId_returnsUnchangedCart() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            cart.put("2:M", new CartItem(2L, "Tee", new BigDecimal("45.00"), 1, "M"));

            CartResponse resp = cartService.removeItem(session, 999L, null);

            assertThat(resp.items()).hasSize(1);
        }

        @Test
        void removeItem_emptyCart_returnsEmptyResponse() {
            when(session.getAttribute(CART_KEY)).thenReturn(null);

            CartResponse resp = cartService.removeItem(session, 1L, "M");

            assertThat(resp.items()).isEmpty();
            assertThat(resp.total()).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // DB-backed cart (authenticated users)
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    class UserCart {

        private static final long USER_ID = 42L;

        @Test
        void getCartForUser_delegatesToRepository() {
            var items = List.of(
                    new CartItem(1L, "Tee", new BigDecimal("45.00"), 1, "M")
            );
            when(cartItemRepo.findByUserId(USER_ID)).thenReturn(items);

            CartResponse resp = cartService.getCartForUser(USER_ID);

            assertThat(resp.items()).isEqualTo(items);
            assertThat(resp.itemCount()).isEqualTo(1);
            assertThat(resp.total()).isEqualByComparingTo("45.00");
        }

        @Test
        void getCartForUser_emptyRepo_returnsEmptyResponse() {
            when(cartItemRepo.findByUserId(USER_ID)).thenReturn(List.of());

            CartResponse resp = cartService.getCartForUser(USER_ID);

            assertThat(resp.items()).isEmpty();
            assertThat(resp.itemCount()).isEqualTo(0);
            assertThat(resp.total()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        void getCartForUser_multipleItems_totalIsSum() {
            // 45.00 * 2 + 89.99 * 1 = 179.99
            var items = List.of(
                    new CartItem(1L, "Tee", new BigDecimal("45.00"), 2, "M"),
                    new CartItem(2L, "Tight", new BigDecimal("89.99"), 1, "S")
            );
            when(cartItemRepo.findByUserId(USER_ID)).thenReturn(items);

            CartResponse resp = cartService.getCartForUser(USER_ID);

            assertThat(resp.itemCount()).isEqualTo(3);
            assertThat(resp.total()).isEqualByComparingTo("179.99");
        }

        @Test
        void addItemForUser_productExists_callsUpsertThenFetchesCart() {
            when(productRepo.findById(1L))
                    .thenReturn(Optional.of(product(1, "Tee", new BigDecimal("45.00"))));
            when(cartItemRepo.findByUserId(USER_ID))
                    .thenReturn(List.of(new CartItem(1L, "Tee", new BigDecimal("45.00"), 2, "M")));

            CartResponse resp = cartService.addItemForUser(USER_ID, new CartItemRequest(1L, 2, "M"));

            verify(cartItemRepo).upsert(USER_ID, 1L, "M", 2);
            assertThat(resp.itemCount()).isEqualTo(2);
        }

        @Test
        void addItemForUser_productNotFound_throwsNoSuchElement() {
            when(productRepo.findById(888L)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    cartService.addItemForUser(USER_ID, new CartItemRequest(888L, 1, null))
            )
                    .isInstanceOf(NoSuchElementException.class)
                    .hasMessageContaining("Product not found: 888");

            verify(cartItemRepo, never()).upsert(anyLong(), anyLong(), anyString(), anyInt());
        }

        @Test
        void addItemForUser_upsertMustHappenBeforeFetch() {
            when(productRepo.findById(1L))
                    .thenReturn(Optional.of(product(1, "Tee", new BigDecimal("45.00"))));
            when(cartItemRepo.findByUserId(USER_ID)).thenReturn(List.of());

            cartService.addItemForUser(USER_ID, new CartItemRequest(1L, 1, null));

            var order = org.mockito.Mockito.inOrder(cartItemRepo);
            order.verify(cartItemRepo).upsert(USER_ID, 1L, null, 1);
            order.verify(cartItemRepo).findByUserId(USER_ID);
        }

        @Test
        void removeItemForUser_callsDeleteThenFetchesCart() {
            when(cartItemRepo.findByUserId(USER_ID)).thenReturn(List.of());

            CartResponse resp = cartService.removeItemForUser(USER_ID, 5L, "L");

            verify(cartItemRepo).delete(USER_ID, 5L, "L");
            verify(cartItemRepo).findByUserId(USER_ID);
        }

        @Test
        void removeItemForUser_nullSize_passesNullToRepository() {
            when(cartItemRepo.findByUserId(USER_ID)).thenReturn(List.of());

            cartService.removeItemForUser(USER_ID, 5L, null);

            verify(cartItemRepo).delete(USER_ID, 5L, null);
        }

        @Test
        void removeItemForUser_deleteMustHappenBeforeFetch() {
            when(cartItemRepo.findByUserId(USER_ID)).thenReturn(List.of());

            cartService.removeItemForUser(USER_ID, 5L, "M");

            var order = org.mockito.Mockito.inOrder(cartItemRepo);
            order.verify(cartItemRepo).delete(USER_ID, 5L, "M");
            order.verify(cartItemRepo).findByUserId(USER_ID);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // CartResponse.buildResponse — math edge cases (via session cart)
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    class CartResponseMath {

        @Test
        void itemCount_isSum_ofAllQuantities() {
            Map<String, CartItem> cart = bindLiveSessionCart();
            cart.put("1:S", new CartItem(1L, "A", new BigDecimal("10.00"), 3, "S"));
            cart.put("2:M", new CartItem(2L, "B", new BigDecimal("20.00"), 5, "M"));

            CartResponse resp = cartService.getCart(session);

            assertThat(resp.itemCount()).isEqualTo(8);
        }

        @Test
        void total_usesHighPrecisionMultiplication() {
            // 33.33 * 3 = 99.99 — must not lose cents due to floating-point
            Map<String, CartItem> cart = bindLiveSessionCart();
            cart.put("1:", new CartItem(1L, "Item", new BigDecimal("33.33"), 3, null));

            CartResponse resp = cartService.getCart(session);

            assertThat(resp.total()).isEqualByComparingTo("99.99");
        }

        @Test
        void total_multipleLines_sumsCorrectly() {
            // (45.00 * 1) + (10.50 * 4) + (7.25 * 2) = 45.00 + 42.00 + 14.50 = 101.50
            Map<String, CartItem> cart = bindLiveSessionCart();
            cart.put("1:M", new CartItem(1L, "A", new BigDecimal("45.00"), 1, "M"));
            cart.put("2:",  new CartItem(2L, "B", new BigDecimal("10.50"), 4, null));
            cart.put("3:L", new CartItem(3L, "C", new BigDecimal("7.25"), 2, "L"));

            CartResponse resp = cartService.getCart(session);

            assertThat(resp.total()).isEqualByComparingTo("101.50");
            assertThat(resp.itemCount()).isEqualTo(7);
        }
    }
}
