package com.securelens.intel;

import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
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
public class ShodanService implements ThreatIntelProviderService {

    private final RestTemplate restTemplate;
    private final ThreatIntelCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${securelens.api-keys.shodan:}")
    private String apiKey;

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

        if (apiKey == null || apiKey.isEmpty()) {
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
        } catch (Exception e) {
            log.warn("Shodan lookup failed for {}: {}", query, e.getMessage());
            return unavailable("Provider unavailable");
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
            return root.path("ports").size() + " open ports, OS: " + root.path("os").asText("Unknown")
                    + ", org: " + root.path("org").asText("Unknown");
        } catch (Exception e) { return "Cached result"; }
    }

    private ThreatIntelResult unavailable(String reason) {
        return ThreatIntelResult.builder().provider("Shodan").riskScore(0).summary(reason).available(false).build();
    }
}
