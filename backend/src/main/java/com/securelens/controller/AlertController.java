package com.securelens.controller;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.securelens.dto.AlertDetailResponse;
import com.securelens.dto.AlertResponse;
import com.securelens.dto.AlertStatsResponse;
import com.securelens.dto.AlertStatusUpdateRequest;
import com.securelens.model.AlertStatus;
import com.securelens.service.AlertService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public ResponseEntity<Page<AlertResponse>> findAll(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String ruleId,
            @RequestParam(required = false) String sourceIp,
            @RequestParam(required = false) Instant startDate,
            @RequestParam(required = false) Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AlertResponse> alerts = alertService.findAll(severity, status, ruleId,
                sourceIp, startDate, endDate, pageable);
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertDetailResponse> findById(@PathVariable Long id) {
        AlertDetailResponse response = alertService.findById(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AlertResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody AlertStatusUpdateRequest request) {
        AlertStatus newStatus = AlertStatus.valueOf(request.getStatus());
        AlertResponse response = alertService.updateStatus(id, newStatus, request.getResolvedBy());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<AlertStatsResponse> getStats() {
        AlertStatsResponse stats = alertService.getStats();
        return ResponseEntity.ok(stats);
    }
}
