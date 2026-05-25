package com.fitfinder.commerce.service;

import com.fitfinder.commerce.config.JwtUtil;
import com.fitfinder.commerce.dto.AuthResponse;
import com.fitfinder.commerce.dto.CartResponse;
import com.fitfinder.commerce.dto.MergeCartItem;
import com.fitfinder.commerce.entity.User;
import com.fitfinder.commerce.repository.CartItemRepository;
import com.fitfinder.commerce.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepo;
    @Mock private CartItemRepository cartItemRepo;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private CartService cartService;

    @InjectMocks
    private AuthService authService;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static User testUser() {
        return new User(1L, "test@example.com", "hashed_pass", "Test User", "USER", OffsetDateTime.now());
    }

    private static CartResponse emptyCart() {
        return new CartResponse(List.of(), 0, BigDecimal.ZERO);
    }

    // ── register() ───────────────────────────────────────────────────────────

    @Test
    void register_newEmail_returnsAuthResponseWithToken() {
        when(userRepo.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password1")).thenReturn("hashed");
        when(userRepo.insert("test@example.com", "hashed", "Test User")).thenReturn(42L);
        when(jwtUtil.generate(42L, "test@example.com", "USER")).thenReturn("jwt-token");

        AuthResponse resp = authService.register("Test User", "test@example.com", "Password1");

        assertThat(resp.token()).isEqualTo("jwt-token");
        assertThat(resp.user().id()).isEqualTo(42L);
        assertThat(resp.user().email()).isEqualTo("test@example.com");
        assertThat(resp.user().name()).isEqualTo("Test User");
    }

    @Test
    void register_newEmail_hashesPasswordBeforeStoring() {
        when(userRepo.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode("Password1")).thenReturn("bcrypt-hash");
        when(userRepo.insert(anyString(), anyString(), anyString())).thenReturn(1L);
        when(jwtUtil.generate(anyLong(), anyString(), anyString())).thenReturn("token");

        authService.register("User", "user@example.com", "Password1");

        // The raw password must never reach the repository
        verify(userRepo).insert("user@example.com", "bcrypt-hash", "User");
        verify(userRepo, never()).insert(anyString(), eq("Password1"), anyString());
    }

    @Test
    void register_duplicateEmail_throwsIllegalArgument() {
        when(userRepo.existsByEmail("dupe@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register("User", "dupe@example.com", "pass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email already registered.");

        // Must not attempt to insert the duplicate
        verify(userRepo, never()).insert(anyString(), anyString(), anyString());
    }

    @Test
    void register_duplicateEmail_doesNotCallJwt() {
        when(userRepo.existsByEmail(anyString())).thenReturn(true);

        assertThatThrownBy(() -> authService.register("User", "dupe@example.com", "pass"))
                .isInstanceOf(IllegalArgumentException.class);

        verify(jwtUtil, never()).generate(anyLong(), anyString(), anyString());
    }

    // ── login() ──────────────────────────────────────────────────────────────

    @Test
    void login_correctCredentials_returnsAuthResponseWithToken() {
        when(userRepo.findByEmail("test@example.com")).thenReturn(Optional.of(testUser()));
        when(passwordEncoder.matches("Password1", "hashed_pass")).thenReturn(true);
        when(jwtUtil.generate(1L, "test@example.com", "USER")).thenReturn("jwt-token");

        AuthResponse resp = authService.login("test@example.com", "Password1");

        assertThat(resp.token()).isEqualTo("jwt-token");
        assertThat(resp.user().id()).isEqualTo(1L);
        assertThat(resp.user().email()).isEqualTo("test@example.com");
        assertThat(resp.user().name()).isEqualTo("Test User");
    }

    @Test
    void login_unknownEmail_throwsIllegalArgument() {
        when(userRepo.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login("nobody@example.com", "pass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid email or password.");
    }

    @Test
    void login_wrongPassword_throwsIllegalArgument() {
        when(userRepo.findByEmail("test@example.com")).thenReturn(Optional.of(testUser()));
        when(passwordEncoder.matches("wrongpass", "hashed_pass")).thenReturn(false);

        assertThatThrownBy(() -> authService.login("test@example.com", "wrongpass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid email or password.");
    }

    @Test
    void login_wrongPassword_doesNotRevealWhichFieldIsWrong() {
        // Both "unknown email" and "wrong password" must return the same message
        // so attackers cannot enumerate registered emails.
        when(userRepo.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login("a@b.com", "pass"))
                .hasMessage("Invalid email or password.");

        when(userRepo.findByEmail(anyString())).thenReturn(Optional.of(testUser()));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login("test@example.com", "wrong"))
                .hasMessage("Invalid email or password.");
    }

    @Test
    void login_correctCredentials_doesNotLeakHashedPassword() {
        when(userRepo.findByEmail("test@example.com")).thenReturn(Optional.of(testUser()));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(jwtUtil.generate(anyLong(), anyString(), anyString())).thenReturn("token");

        AuthResponse resp = authService.login("test@example.com", "Password1");

        // The hashed password must NOT be included in the response
        assertThat(resp.user()).isNotNull();
        // AuthUserInfo only exposes id, email, name — no password field
        assertThat(resp.user().name()).isEqualTo("Test User");
    }

    // ── mergeCart() ──────────────────────────────────────────────────────────

    @Test
    void mergeCart_callsUpsertForEachItem() {
        long userId = 7L;
        var items = List.of(
                new MergeCartItem(101L, 2, "M"),
                new MergeCartItem(202L, 1, null)
        );
        when(cartService.getCartForUser(userId)).thenReturn(emptyCart());

        authService.mergeCart(userId, items);

        verify(cartItemRepo).upsert(userId, 101L, "M", 2);
        verify(cartItemRepo).upsert(userId, 202L, null, 1);
    }

    @Test
    void mergeCart_returnsCartAfterAllUpserts() {
        long userId = 5L;
        var items = List.of(new MergeCartItem(1L, 3, "S"));
        var expected = emptyCart();
        when(cartService.getCartForUser(userId)).thenReturn(expected);

        CartResponse result = authService.mergeCart(userId, items);

        assertThat(result).isSameAs(expected);
        // upsert must have happened before getCartForUser is called
        var order = org.mockito.Mockito.inOrder(cartItemRepo, cartService);
        order.verify(cartItemRepo).upsert(userId, 1L, "S", 3);
        order.verify(cartService).getCartForUser(userId);
    }

    @Test
    void mergeCart_emptyItemList_doesNotCallUpsert() {
        when(cartService.getCartForUser(99L)).thenReturn(emptyCart());

        authService.mergeCart(99L, List.of());

        verify(cartItemRepo, never()).upsert(anyLong(), anyLong(), any(), anyInt());
    }

    @Test
    void mergeCart_multipleItems_upsertCalledOncePerItem() {
        long userId = 3L;
        var items = List.of(
                new MergeCartItem(1L, 1, "S"),
                new MergeCartItem(2L, 1, "M"),
                new MergeCartItem(3L, 2, "L")
        );
        when(cartService.getCartForUser(userId)).thenReturn(emptyCart());

        authService.mergeCart(userId, items);

        verify(cartItemRepo, times(3)).upsert(eq(userId), anyLong(), anyString(), anyInt());
    }
}
