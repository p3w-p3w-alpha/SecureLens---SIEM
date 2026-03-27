package com.securelens.intel;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.dto.ThreatIntelResult;
import com.securelens.model.IntelProvider;
import com.securelens.model.QueryType;
import com.securelens.model.ThreatIntelCache;
import com.securelens.repository.ThreatIntelCacheRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class VirusTotalService implements ThreatIntelProviderService {

    private final RestTemplate restTemplate;
    private final ThreatIntelCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${securelens.api-keys.virustotal:}")
    private String apiKey;

    @Override
    public IntelProvider getProviderName() {
        return IntelProvider.VIRUSTOTAL;
    }

    @Override
    public boolean supports(QueryType type) {
        return type == QueryType.IP || type == QueryType.HASH;
    }

    @Override
    public ThreatIntelResult lookup(String query, QueryType type) {
        var cached = cacheRepository.findByQueryValueAndProviderAndExpiresAtAfter(
                query, IntelProvider.VIRUSTOTAL, Instant.now());
        if (cached.isPresent()) {
            ThreatIntelCache c = cached.get();
            return ThreatIntelResult.builder()
                    .provider("VirusTotal").riskScore(c.getRiskScore())
                    .summary(extractSummaryFromCache(c.getResponseData()))
                    .rawData(c.getResponseData()).available(true).build();
        }

        if (apiKey == null || apiKey.isEmpty()) {
            return unavailable("API key not configured");
        }

        try {
            String url = type == QueryType.IP
                    ? "https://www.virustotal.com/api/v3/ip_addresses/" + query
                    : "https://www.virustotal.com/api/v3/files/" + query;

            HttpHeaders headers = new HttpHeaders();
            headers.set("x-apikey", apiKey);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(headers), String.class);

            String body = response.getBody();
            JsonNode root = objectMapper.readTree(body);
            JsonNode stats = root.path("data").path("attributes").path("last_analysis_stats");

            int malicious = stats.path("malicious").asInt(0);
            int suspicious = stats.path("suspicious").asInt(0);
            int total = malicious + suspicious
                    + stats.path("harmless").asInt(0) + stats.path("undetected").asInt(0);
            int score = total > 0 ? Math.min((malicious * 100) / total, 100) : 0;
            String summary = malicious + "/" + total + " engines flagged this as malicious";

            cacheResult(query, type, body, score);
            return ThreatIntelResult.builder()
                    .provider("VirusTotal").riskScore(score).summary(summary)
                    .rawData(body).available(true).build();
        } catch (Exception e) {
            log.warn("VirusTotal lookup failed for {}: {}", query, e.getMessage());
            return unavailable("Provider unavailable");
        }
    }

    private void cacheResult(String query, QueryType type, String data, int score) {
        try {
            cacheRepository.save(ThreatIntelCache.builder()
                    .queryType(type).queryValue(query).provider(IntelProvider.VIRUSTOTAL)
                    .responseData(data).riskScore(score).build());
        } catch (Exception e) {
            log.warn("Failed to cache VT result: {}", e.getMessage());
        }
    }

    private String extractSummaryFromCache(String data) {
        try {
            JsonNode stats = objectMapper.readTree(data).path("data").path("attributes").path("last_analysis_stats");
            int mal = stats.path("malicious").asInt(0);
            int total = mal + stats.path("suspicious").asInt(0) + stats.path("harmless").asInt(0) + stats.path("undetected").asInt(0);
            return mal + "/" + total + " engines flagged this as malicious";
        } catch (Exception e) { return "Cached result"; }
    }

    private ThreatIntelResult unavailable(String reason) {
        return ThreatIntelResult.builder().provider("VirusTotal").riskScore(0)
                .summary(reason).available(false).build();
    }
}
