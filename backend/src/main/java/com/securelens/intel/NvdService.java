package com.securelens.intel;

import java.time.Instant;

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
public class NvdService implements ThreatIntelProviderService {

    private final RestTemplate restTemplate;
    private final ThreatIntelCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public IntelProvider getProviderName() { return IntelProvider.NVD; }

    @Override
    public boolean supports(QueryType type) { return type == QueryType.CVE; }

    @Override
    public ThreatIntelResult lookup(String query, QueryType type) {
        var cached = cacheRepository.findByQueryValueAndProviderAndExpiresAtAfter(
                query, IntelProvider.NVD, Instant.now());
        if (cached.isPresent()) {
            ThreatIntelCache c = cached.get();
            return ThreatIntelResult.builder().provider("NVD").riskScore(c.getRiskScore())
                    .summary(extractSummary(c.getResponseData())).rawData(c.getResponseData()).available(true).build();
        }

        try {
            String url = "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=" + query;
            String body = restTemplate.getForObject(url, String.class);

            JsonNode root = objectMapper.readTree(body);
            JsonNode vulns = root.path("vulnerabilities");
            if (vulns.isEmpty()) {
                return ThreatIntelResult.builder().provider("NVD").riskScore(0)
                        .summary("CVE not found").available(true).build();
            }

            JsonNode cve = vulns.get(0).path("cve");
            JsonNode metrics = cve.path("metrics");
            double cvssScore = 0;
            String severity = "UNKNOWN";

            // Try CVSS v3.1 first, then v3.0, then v2.0
            for (String version : new String[]{"cvssMetricV31", "cvssMetricV30", "cvssMetricV2"}) {
                JsonNode cvssArr = metrics.path(version);
                if (!cvssArr.isEmpty()) {
                    JsonNode cvssData = cvssArr.get(0).path("cvssData");
                    cvssScore = cvssData.path("baseScore").asDouble(0);
                    severity = cvssData.path("baseSeverity").asText(
                            cvssArr.get(0).path("baseSeverity").asText("UNKNOWN"));
                    break;
                }
            }

            int score = Math.min((int) (cvssScore * 10), 100);
            String desc = cve.path("descriptions").get(0).path("value").asText("");
            if (desc.length() > 200) desc = desc.substring(0, 200) + "...";
            String summary = "CVSS " + cvssScore + ", " + severity + ": " + desc;

            cacheResult(query, body, score);
            return ThreatIntelResult.builder().provider("NVD").riskScore(score)
                    .summary(summary).rawData(body).available(true).build();
        } catch (Exception e) {
            log.warn("NVD lookup failed for {}: {}", query, e.getMessage());
            return unavailable("Provider unavailable");
        }
    }

    private void cacheResult(String query, String data, int score) {
        try {
            cacheRepository.save(ThreatIntelCache.builder().queryType(QueryType.CVE).queryValue(query)
                    .provider(IntelProvider.NVD).responseData(data).riskScore(score).build());
        } catch (Exception e) { log.warn("Failed to cache NVD result: {}", e.getMessage()); }
    }

    private String extractSummary(String data) {
        try {
            JsonNode cve = objectMapper.readTree(data).path("vulnerabilities").get(0).path("cve");
            JsonNode metrics = cve.path("metrics");
            for (String v : new String[]{"cvssMetricV31", "cvssMetricV30"}) {
                JsonNode arr = metrics.path(v);
                if (!arr.isEmpty()) {
                    double s = arr.get(0).path("cvssData").path("baseScore").asDouble();
                    String sev = arr.get(0).path("cvssData").path("baseSeverity").asText("UNKNOWN");
                    String desc = cve.path("descriptions").get(0).path("value").asText("");
                    if (desc.length() > 200) desc = desc.substring(0, 200) + "...";
                    return "CVSS " + s + ", " + sev + ": " + desc;
                }
            }
            return "Cached result";
        } catch (Exception e) { return "Cached result"; }
    }

    private ThreatIntelResult unavailable(String reason) {
        return ThreatIntelResult.builder().provider("NVD").riskScore(0).summary(reason).available(false).build();
    }
}
