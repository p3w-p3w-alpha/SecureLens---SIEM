package com.securelens.service;

import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import com.securelens.dto.AlertDetailResponse;
import com.securelens.dto.AlertResponse;
import com.securelens.dto.AlertStatsResponse;
import com.securelens.dto.LogResponse;
import com.securelens.exception.ResourceNotFoundException;
import com.securelens.model.Alert;
import com.securelens.model.AlertStatus;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.AlertRepository;
import com.securelens.repository.AlertSpecification;
import com.securelens.repository.LogRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final LogRepository logRepository;
    private final AuditService auditService;

    public Page<AlertResponse> findAll(String severity, String status, String ruleId,
                                       String sourceIp, Instant startDate, Instant endDate,
                                       Pageable pageable) {
        Severity severityEnum = severity != null ? Severity.valueOf(severity) : null;
        AlertStatus statusEnum = status != null ? AlertStatus.valueOf(status) : null;

        Specification<Alert> spec = Specification.where(AlertSpecification.hasSeverity(severityEnum))
                .and(AlertSpecification.hasStatus(statusEnum))
                .and(AlertSpecification.hasRuleId(ruleId))
                .and(AlertSpecification.hasSourceIp(sourceIp))
                .and(AlertSpecification.createdAfter(startDate))
                .and(AlertSpecification.createdBefore(endDate));

        return alertRepository.findAll(spec, pageable).map(this::toResponse);
    }

    public AlertDetailResponse findById(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));

        List<LogResponse> evidenceLogs = List.of();
        if (alert.getEvidenceLogIds() != null && !alert.getEvidenceLogIds().isEmpty()) {
            String cleaned = alert.getEvidenceLogIds().replaceAll("[\\[\\]\\s]", "");
            List<Long> logIds = Arrays.stream(cleaned.split(","))
                    .filter(s -> !s.isEmpty())
                    .map(Long::valueOf)
                    .toList();
            List<Log> logs = logRepository.findAllById(logIds);
            evidenceLogs = logs.stream().map(this::toLogResponse).toList();
        }

        return AlertDetailResponse.builder()
                .id(alert.getId())
                .ruleId(alert.getRuleId())
                .ruleName(alert.getRuleName())
                .severity(alert.getSeverity().name())
                .mitreTactic(alert.getMitreTactic())
                .mitreTechnique(alert.getMitreTechnique())
                .sourceIp(alert.getSourceIp())
                .userIdField(alert.getUserIdField())
                .description(alert.getDescription())
                .evidenceLogIds(alert.getEvidenceLogIds())
                .status(alert.getStatus().name())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .resolvedBy(alert.getResolvedBy())
                .aiTriageResult(alert.getAiTriageResult())
                .evidenceLogs(evidenceLogs)
                .build();
    }

    public AlertResponse updateStatus(Long id, AlertStatus newStatus, String resolvedBy) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        alert.setStatus(newStatus);
        if (resolvedBy != null) {
            alert.setResolvedBy(resolvedBy);
        }
        alert = alertRepository.save(alert);
        try { auditService.log("ALERT_STATUS_CHANGE", "ALERT", String.valueOf(id), resolvedBy != null ? resolvedBy : "analyst", "Alert " + id + " status → " + newStatus); } catch (Exception ignored) {}
        return toResponse(alert);
    }

    public AlertStatsResponse getStats() {
        List<Alert> allAlerts = alertRepository.findAll();

        Map<String, Long> bySeverity = allAlerts.stream()
                .collect(Collectors.groupingBy(a -> a.getSeverity().name(), Collectors.counting()));

        Map<String, Long> byStatus = allAlerts.stream()
                .collect(Collectors.groupingBy(a -> a.getStatus().name(), Collectors.counting()));

        Map<String, Long> byRule = allAlerts.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getRuleId() + " " + a.getRuleName(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        Instant last24h = Instant.now().minusSeconds(86400);
        long total24h = allAlerts.stream()
                .filter(a -> a.getCreatedAt().isAfter(last24h))
                .count();

        return AlertStatsResponse.builder()
                .bySeverity(bySeverity)
                .byStatus(byStatus)
                .byRule(byRule)
                .total24h(total24h)
                .build();
    }

    private AlertResponse toResponse(Alert alert) {
        return AlertResponse.builder()
                .id(alert.getId())
                .ruleId(alert.getRuleId())
                .ruleName(alert.getRuleName())
                .severity(alert.getSeverity().name())
                .mitreTactic(alert.getMitreTactic())
                .mitreTechnique(alert.getMitreTechnique())
                .sourceIp(alert.getSourceIp())
                .userIdField(alert.getUserIdField())
                .description(alert.getDescription())
                .evidenceLogIds(alert.getEvidenceLogIds())
                .status(alert.getStatus().name())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .resolvedBy(alert.getResolvedBy())
                .aiTriageResult(alert.getAiTriageResult())
                .build();
    }

    private LogResponse toLogResponse(Log log) {
        return LogResponse.builder()
                .id(log.getId())
                .timestamp(log.getTimestamp())
                .sourceIp(log.getSourceIp())
                .destinationIp(log.getDestinationIp())
                .eventType(log.getEventType())
                .severity(log.getSeverity().name())
                .userIdField(log.getUserIdField())
                .rawMessage(log.getRawMessage())
                .metadata(log.getMetadata())
                .ingestedAt(log.getIngestedAt())
                .build();
    }
}
