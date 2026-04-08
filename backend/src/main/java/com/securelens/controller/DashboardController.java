package com.securelens.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securelens.dto.DashboardStats;
import com.securelens.dto.DashboardStats.TrendPoint;
import com.securelens.model.AuditTrail;
import com.securelens.service.AuditService;
import com.securelens.service.DashboardService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final AuditService auditService;

    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStats> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/dashboard/trends")
    public ResponseEntity<List<TrendPoint>> getTrends() {
        return ResponseEntity.ok(dashboardService.getTrends());
    }

    @GetMapping("/dashboard/event-types")
    public ResponseEntity<Map<String, Long>> getEventTypes() {
        return ResponseEntity.ok(dashboardService.getEventTypeDistribution());
    }

    @GetMapping("/dashboard/hourly-activity")
    public ResponseEntity<List<TrendPoint>> getHourlyActivity() {
        return ResponseEntity.ok(dashboardService.getHourlyActivity());
    }

    @GetMapping("/audit")
    public ResponseEntity<List<AuditTrail>> getAudit() {
        return ResponseEntity.ok(auditService.getRecentActivity(50));
    }
}
