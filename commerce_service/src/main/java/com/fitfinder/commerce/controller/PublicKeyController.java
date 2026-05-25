package com.fitfinder.commerce.controller;

import com.fitfinder.commerce.config.RsaKeyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class PublicKeyController {

    private final RsaKeyService rsaKeyService;

    public PublicKeyController(RsaKeyService rsaKeyService) {
        this.rsaKeyService = rsaKeyService;
    }

    @GetMapping("/public-key")
    public Map<String, String> publicKey() {
        return Map.of("publicKey", rsaKeyService.getPublicKeyBase64());
    }
}
