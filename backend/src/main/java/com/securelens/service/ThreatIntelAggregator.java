package com.securelens.service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.securelens.dto.IntelAggregatedResponse;
import com.securelens.dto.ThreatIntelResult;
import com.securelens.exception.ResourceNotFoundException;
import com.securelens.intel.ThreatIntelProviderService;
import com.securelens.model.Alert;
import com.securelens.model.QueryType;
import com.securelens.repository.AlertRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThreatIntelAggregator {

    private final List<ThreatIntelProviderService> providers;
    private final AlertRepository alertRepository;

    public IntelAggregatedResponse lookupIp(String ip) {
        List<ThreatIntelProviderService> ipProviders = providers.stream()
                .filter(p -> p.supports(QueryType.IP))
                .toList();

        List<CompletableFuture<ThreatIntelResult>> futures = ipProviders.stream()
                .map(p -> CompletableFuture.supplyAsync(() -> p.lookup(ip, QueryType.IP)))
                .toList();

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        List<ThreatIntelResult> results = futures.stream()
                .map(CompletableFuture::join)
                .toList();

        return buildAggregated(results);
    }

    public IntelAggregatedResponse lookupHash(String hash) {
        List<ThreatIntelResult> results = providers.stream()
                .filter(p -> p.supports(QueryType.HASH))
                .map(p -> p.lookup(hash, QueryType.HASH))
                .toList();
        return buildAggregated(results);
    }

    public IntelAggregatedResponse lookupCve(String cveId) {
        List<ThreatIntelResult> results = providers.stream()
                .filter(p -> p.supports(QueryType.CVE))
                .map(p -> p.lookup(cveId, QueryType.CVE))
                .toList();
        return buildAggregated(results);
    }

    public IntelAggregatedResponse enrichAlert(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));

        if (alert.getSourceIp() == null || alert.getSourceIp().isEmpty()) {
            return IntelAggregatedResponse.builder()
                    .overallRiskScore(0)
                    .providers(List.of())
                    .build();
        }

        return lookupIp(alert.getSourceIp());
    }

    private IntelAggregatedResponse buildAggregated(List<ThreatIntelResult> results) {
        List<ThreatIntelResult> available = results.stream()
                .filter(ThreatIntelResult::isAvailable)
                .toList();

        int overallScore = available.isEmpty() ? 0
                : (int) available.stream().mapToInt(ThreatIntelResult::getRiskScore).average().orElse(0);

        return IntelAggregatedResponse.builder()
                .overallRiskScore(overallScore)
                .providers(results)
                .build();
    }
}
