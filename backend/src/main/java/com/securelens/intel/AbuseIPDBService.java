package com.securelens.intel;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.dto.ThreatIntelResult;
import com.securelens.model.IntelProvider;
import com.securelens.model.QueryType;
import com.securelens.model.ThreatIntelCache;
import com.securelens.repository.ThreatIntelCacheRepository;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AbuseIPDBService implements ThreatIntelProviderService {

    private final RestTemplate restTemplate;
    private final ThreatIntelCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${securelens.api-keys.abuseipdb:}")
    private String apiKey;

    @PostConstruct
    public void init() {
        boolean configured = apiKey != null && !apiKey.isBlank();
        log.info("AbuseIPDB API key configured: {}", configured);
        if (!configured) log.warn("WARNING: AbuseIPDB API key not configured — provider will be unavailable");
    }

    @Override
    public IntelProvider getProviderName() { return IntelProvider.ABUSEIPDB; }

    @Override
    public boolean supports(QueryType type) { return type == QueryType.IP; }

    @Override
    public ThreatIntelResult lookup(String query, QueryType type) {
        var cached = cacheRepository.findByQueryValueAndProviderAndExpiresAtAfter(
                query, IntelProvider.ABUSEIPDB, Instant.now());
        if (cached.isPresent()) {
            ThreatIntelCache c = cached.get();
            return ThreatIntelResult.builder().provider("AbuseIPDB").riskScore(c.getRiskScore())
                    .summary(extractSummary(c.getResponseData())).rawData(c.getResponseData()).available(true).build();
        }

        if (apiKey == null || apiKey.isBlank()) {
            return unavailable("API key not configured");
        }

        try {
            String url = "https://api.abuseipdb.com/api/v2/check?ipAddress=" + query + "&maxAgeInDays=90";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Key", apiKey);
            headers.set("Accept", "application/json");
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(headers), String.class);

            String body = response.getBody();
            JsonNode data = objectMapper.readTree(body).path("data");
            int score = data.path("abuseConfidenceScore").asInt(0);
            int reports = data.path("totalReports").asInt(0);
            String country = data.path("countryCode").asText("??");
            String summary = "Abuse confidence: " + score + "%, reported " + reports + " times, from " + country;

            cacheResult(query, body, score);
            return ThreatIntelResult.builder().provider("AbuseIPDB").riskScore(score)
                    .summary(summary).rawData(body).available(true).build();
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            String reason = switch (status) {
                case 401 -> "Invalid API key (401)";
                case 422 -> "Invalid IP address format (422)";
                case 429 -> "Rate limited — 1000 checks/day on free tier (429)";
                default -> "HTTP " + status + ": " + e.getStatusText();
            };
            log.error("AbuseIPDB failed for {}: HTTP {} - {}", query, status, e.getMessage());
            return unavailable(reason);
        } catch (Exception e) {
            log.error("AbuseIPDB failed for {}: {}", query, e.getMessage());
            return unavailable("Connection error: " + e.getClass().getSimpleName());
        }
    }

    private void cacheResult(String query, String data, int score) {
        try {
            cacheRepository.save(ThreatIntelCache.builder().queryType(QueryType.IP).queryValue(query)
                    .provider(IntelProvider.ABUSEIPDB).responseData(data).riskScore(score).build());
        } catch (Exception e) { log.warn("Failed to cache AbuseIPDB result: {}", e.getMessage()); }
    }

    private String extractSummary(String data) {
        try {
            JsonNode d = objectMapper.readTree(data).path("data");
            return "Abuse confidence: " + d.path("abuseConfidenceScore").asInt() + "%, reported "
                    + d.path("totalReports").asInt() + " times, from " + d.path("countryCode").asText("??");
        } catch (Exception e) { return "Cached result"; }
    }

    private ThreatIntelResult unavailable(String reason) {
        return ThreatIntelResult.builder().provider("AbuseIPDB").riskScore(0).summary(reason).available(false).build();
    }
}
