package com.securelens.service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.securelens.dto.AlertResponse;
import com.securelens.dto.DashboardStats;
import com.securelens.dto.DashboardStats.SourceIpCount;
import com.securelens.dto.DashboardStats.TrendPoint;
import com.securelens.model.Alert;
import com.securelens.model.AlertStatus;
import com.securelens.model.IncidentStatus;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.AlertRepository;
import com.securelens.repository.IncidentRepository;
import com.securelens.repository.LogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final LogRepository logRepository;
    private final AlertRepository alertRepository;
    private final IncidentRepository incidentRepository;

    public DashboardStats getStats() {
        Instant last24h = Instant.now().minusSeconds(86400);
        List<Alert> allAlerts = alertRepository.findAll();

        long totalLogs24h = logRepository.count();
        long totalAlerts24h = allAlerts.stream().filter(a -> a.getCreatedAt().isAfter(last24h)).count();
        long criticalAlerts = allAlerts.stream()
                .filter(a -> a.getSeverity() == Severity.CRITICAL && a.getStatus() == AlertStatus.NEW).count();
        long openIncidents = incidentRepository.findAll().stream()
                .filter(i -> i.getStatus() != IncidentStatus.CLOSED).count();

        Map<String, Long> bySeverity = allAlerts.stream()
                .collect(Collectors.groupingBy(a -> a.getSeverity().name(), Collectors.counting()));
        Map<String, Long> byStatus = allAlerts.stream()
                .collect(Collectors.groupingBy(a -> a.getStatus().name(), Collectors.counting()));
        Map<String, Long> byRule = allAlerts.stream()
                .collect(Collectors.groupingBy(Alert::getRuleId, LinkedHashMap::new, Collectors.counting()));

        List<SourceIpCount> topIps = allAlerts.stream()
                .filter(a -> a.getSourceIp() != null)
                .collect(Collectors.groupingBy(Alert::getSourceIp, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> SourceIpCount.builder().ip(e.getKey()).count(e.getValue()).build())
                .toList();

        List<AlertResponse> recentAlerts = alertRepository
                .findAll(PageRequest.of(0, 10, Sort.by("createdAt").descending()))
                .getContent().stream()
                .map(a -> AlertResponse.builder()
                        .id(a.getId()).ruleId(a.getRuleId()).ruleName(a.getRuleName())
                        .severity(a.getSeverity().name()).sourceIp(a.getSourceIp())
                        .userIdField(a.getUserIdField()).status(a.getStatus().name())
                        .createdAt(a.getCreatedAt()).build())
                .toList();

        return DashboardStats.builder()
                .totalLogs24h(totalLogs24h).totalAlerts24h(totalAlerts24h)
                .criticalAlerts(criticalAlerts).openIncidents(openIncidents)
                .alertsBySeverity(bySeverity).alertsByStatus(byStatus).alertsByRule(byRule)
                .topSourceIps(topIps).recentAlerts(recentAlerts).build();
    }

    public List<TrendPoint> getTrends() {
        List<Alert> allAlerts = alertRepository.findAll();
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);

        List<TrendPoint> points = new ArrayList<>();
        for (int i = 23; i >= 0; i--) {
            ZonedDateTime hourStart = now.minusHours(i).withMinute(0).withSecond(0).withNano(0);
            ZonedDateTime hourEnd = hourStart.plusHours(1);
            long count = allAlerts.stream()
                    .filter(a -> {
                        ZonedDateTime cat = a.getCreatedAt().atZone(ZoneOffset.UTC);
                        return !cat.isBefore(hourStart) && cat.isBefore(hourEnd);
                    }).count();
            points.add(TrendPoint.builder()
                    .hour(hourStart.format(DateTimeFormatter.ofPattern("HH:mm")))
                    .count(count).build());
        }
        return points;
    }

    public Map<String, Long> getEventTypeDistribution() {
        return logRepository.findAll().stream()
                .filter(l -> l.getEventType() != null)
                .collect(Collectors.groupingBy(Log::getEventType, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
    }

    public List<TrendPoint> getHourlyActivity() {
        List<Log> allLogs = logRepository.findAll();
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);

        List<TrendPoint> points = new ArrayList<>();
        for (int i = 23; i >= 0; i--) {
            ZonedDateTime hourStart = now.minusHours(i).withMinute(0).withSecond(0).withNano(0);
            ZonedDateTime hourEnd = hourStart.plusHours(1);
            long count = allLogs.stream()
                    .filter(l -> {
                        if (l.getTimestamp() == null) return false;
                        ZonedDateTime lt = l.getTimestamp().atZone(ZoneOffset.UTC);
                        return !lt.isBefore(hourStart) && lt.isBefore(hourEnd);
                    }).count();
            points.add(TrendPoint.builder()
                    .hour(hourStart.format(DateTimeFormatter.ofPattern("HH")))
                    .count(count).build());
        }
        return points;
    }
}
