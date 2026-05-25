package com.fitfinder.commerce.service;

import com.fitfinder.commerce.exception.ServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
public class AIServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AIServiceClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public AIServiceClient(RestTemplate restTemplate,
                           @Value("${ai.service.base-url}") String baseUrl) {
        this.restTemplate = restTemplate;
        this.baseUrl = baseUrl;
    }

    @SuppressWarnings("unchecked")
    public double[] embed(String text) {
        String url = baseUrl + "/embed";
        Map<String, String> request = Map.of("text", text);
        long[] delays = {1000, 2000};

        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
                List<Number> embedding = (List<Number>) response.get("embedding");
                return embedding.stream().mapToDouble(Number::doubleValue).toArray();
            } catch (Exception e) {
                if (attempt == 3) {
                    throw new ServiceUnavailableException(
                            "AI service unavailable after 3 attempts: " + e.getMessage());
                }
                long delay = delays[attempt - 1];
                log.warn("Embed attempt {}/3 failed: {}. Retrying in {}ms...", attempt, e.getMessage(), delay);
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }
        throw new ServiceUnavailableException("AI service unavailable");
    }
}
