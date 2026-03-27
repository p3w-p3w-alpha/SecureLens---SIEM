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
public class OtxService implements ThreatIntelProviderService {

    private final RestTemplate restTemplate;
    private final ThreatIntelCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${securelens.api-keys.otx:}")
    private String apiKey;

    @Override
    public IntelProvider getProviderName() { return IntelProvider.OTX; }

    @Override
    public boolean supports(QueryType type) { return type == QueryType.IP || type == QueryType.DOMAIN; }

    @Override
    public ThreatIntelResult lookup(String query, QueryType type) {
        var cached = cacheRepository.findByQueryValueAndProviderAndExpiresAtAfter(
                query, IntelProvider.OTX, Instant.now());
        if (cached.isPresent()) {
            ThreatIntelCache c = cached.get();
            return ThreatIntelResult.builder().provider("AlienVault OTX").riskScore(c.getRiskScore())
                    .summary(extractSummary(c.getResponseData())).rawData(c.getResponseData()).available(true).build();
        }

        if (apiKey == null || apiKey.isEmpty()) {
            return unavailable("API key not configured");
        }

        try {
            String indicator = type == QueryType.IP ? "IPv4" : "domain";
            String url = "https://otx.alienvault.com/api/v1/indicators/" + indicator + "/" + query + "/general";
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-OTX-API-KEY", apiKey);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(headers), String.class);

            String body = response.getBody();
            JsonNode root = objectMapper.readTree(body);
            int pulseCount = root.path("pulse_info").path("count").asInt(0);
            int score = Math.min(pulseCount * 10, 100);
            String summary = "Referenced in " + pulseCount + " threat pulses";

            cacheResult(query, type, body, score);
            return ThreatIntelResult.builder().provider("AlienVault OTX").riskScore(score)
                    .summary(summary).rawData(body).available(true).build();
        } catch (Exception e) {
            log.warn("OTX lookup failed for {}: {}", query, e.getMessage());
            return unavailable("Provider unavailable");
        }
    }

    private void cacheResult(String query, QueryType type, String data, int score) {
        try {
            cacheRepository.save(ThreatIntelCache.builder().queryType(type).queryValue(query)
                    .provider(IntelProvider.OTX).responseData(data).riskScore(score).build());
        } catch (Exception e) { log.warn("Failed to cache OTX result: {}", e.getMessage()); }
    }

    private String extractSummary(String data) {
        try {
            int count = objectMapper.readTree(data).path("pulse_info").path("count").asInt(0);
            return "Referenced in " + count + " threat pulses";
        } catch (Exception e) { return "Cached result"; }
    }

    private ThreatIntelResult unavailable(String reason) {
        return ThreatIntelResult.builder().provider("AlienVault OTX").riskScore(0).summary(reason).available(false).build();
    }
}
