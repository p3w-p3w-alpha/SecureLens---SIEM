package com.securelens.intel;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
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
public class ShodanService implements ThreatIntelProviderService {

    private final RestTemplate restTemplate;
    private final ThreatIntelCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${securelens.api-keys.shodan:}")
    private String apiKey;

    @PostConstruct
    public void init() {
        boolean configured = apiKey != null && !apiKey.isBlank();
        log.info("Shodan API key configured: {}", configured);
        if (!configured) log.warn("WARNING: Shodan API key not configured — provider will be unavailable");
    }

    @Override
    public IntelProvider getProviderName() { return IntelProvider.SHODAN; }

    @Override
    public boolean supports(QueryType type) { return type == QueryType.IP; }

    @Override
    public ThreatIntelResult lookup(String query, QueryType type) {
        var cached = cacheRepository.findByQueryValueAndProviderAndExpiresAtAfter(
                query, IntelProvider.SHODAN, Instant.now());
        if (cached.isPresent()) {
            ThreatIntelCache c = cached.get();
            return ThreatIntelResult.builder().provider("Shodan").riskScore(c.getRiskScore())
                    .summary(extractSummary(c.getResponseData())).rawData(c.getResponseData()).available(true).build();
        }

        if (apiKey == null || apiKey.isBlank()) {
            return unavailable("API key not configured");
        }

        try {
            String url = "https://api.shodan.io/shodan/host/" + query + "?key=" + apiKey;
            String body = restTemplate.getForObject(url, String.class);

            JsonNode root = objectMapper.readTree(body);
            int ports = root.path("ports").size();
            boolean hasVulns = root.has("vulns") && root.path("vulns").size() > 0;
            int score = Math.min(20 + (ports * 5) + (hasVulns ? 20 : 0), 100);
            String os = root.path("os").asText("Unknown");
            String org = root.path("org").asText("Unknown");
            String summary = ports + " open ports, OS: " + os + ", org: " + org;

            cacheResult(query, body, score);
            return ThreatIntelResult.builder().provider("Shodan").riskScore(score)
                    .summary(summary).rawData(body).available(true).build();
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 404) {
                // IP not indexed in Shodan — this is normal, not an error
                String summary = "IP not found in Shodan database";
                cacheResult(query, "{\"info\":\"not found\"}", 0);
                return ThreatIntelResult.builder().provider("Shodan").riskScore(0)
                        .summary(summary).rawData("{\"info\":\"IP not indexed\"}").available(true).build();
            }
            String reason = switch (status) {
                case 401 -> "Invalid API key (401)";
                case 403 -> "Access denied — upgrade plan required (403)";
                case 429 -> "Rate limited (429)";
                default -> "HTTP " + status + ": " + e.getStatusText();
            };
            log.error("Shodan failed for {}: HTTP {} - {}", query, status, e.getMessage());
            return unavailable(reason);
        } catch (Exception e) {
            log.error("Shodan failed for {}: {}", query, e.getMessage());
            return unavailable("Connection error: " + e.getClass().getSimpleName());
        }
    }

    private void cacheResult(String query, String data, int score) {
        try {
            cacheRepository.save(ThreatIntelCache.builder().queryType(QueryType.IP).queryValue(query)
                    .provider(IntelProvider.SHODAN).responseData(data).riskScore(score).build());
        } catch (Exception e) { log.warn("Failed to cache Shodan result: {}", e.getMessage()); }
    }

    private String extractSummary(String data) {
        try {
            JsonNode root = objectMapper.readTree(data);
            if (root.has("info")) return "IP not found in Shodan database";
            return root.path("ports").size() + " open ports, OS: " + root.path("os").asText("Unknown")
                    + ", org: " + root.path("org").asText("Unknown");
        } catch (Exception e) { return "Cached result"; }
    }

    private ThreatIntelResult unavailable(String reason) {
        return ThreatIntelResult.builder().provider("Shodan").riskScore(0).summary(reason).available(false).build();
    }
}
