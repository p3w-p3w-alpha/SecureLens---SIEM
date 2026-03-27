package com.securelens.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securelens.dto.IntelAggregatedResponse;
import com.securelens.service.ThreatIntelAggregator;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/intel")
@RequiredArgsConstructor
public class ThreatIntelController {

    private final ThreatIntelAggregator aggregator;

    @GetMapping("/ip/{ip}")
    public ResponseEntity<IntelAggregatedResponse> lookupIp(@PathVariable String ip) {
        return ResponseEntity.ok(aggregator.lookupIp(ip));
    }

    @GetMapping("/hash/{hash}")
    public ResponseEntity<IntelAggregatedResponse> lookupHash(@PathVariable String hash) {
        return ResponseEntity.ok(aggregator.lookupHash(hash));
    }

    @GetMapping("/cve/{cveId}")
    public ResponseEntity<IntelAggregatedResponse> lookupCve(@PathVariable String cveId) {
        return ResponseEntity.ok(aggregator.lookupCve(cveId));
    }

    @PostMapping("/enrich-alert/{alertId}")
    public ResponseEntity<IntelAggregatedResponse> enrichAlert(@PathVariable Long alertId) {
        return ResponseEntity.ok(aggregator.enrichAlert(alertId));
    }
}
