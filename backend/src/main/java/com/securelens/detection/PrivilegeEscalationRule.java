package com.securelens.detection;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.securelens.model.Alert;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.LogRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PrivilegeEscalationRule implements DetectionRule {

    private final LogRepository logRepository;

    @Override
    public String getRuleId() {
        return "R-003";
    }

    @Override
    public String getRuleName() {
        return "Privilege Escalation";
    }

    @Override
    public List<Alert> evaluate() {
        Instant windowStart = Instant.now().minusSeconds(600); // 10 minutes
        List<Log> permEvents = logRepository.findByEventTypeInAndTimestampAfter(
                List.of("permission_denied", "permission_granted"), windowStart);

        // Group by userIdField
        var grouped = permEvents.stream()
                .filter(l -> l.getUserIdField() != null)
                .collect(Collectors.groupingBy(Log::getUserIdField));

        List<Alert> alerts = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            String user = entry.getKey();
            List<Log> logs = entry.getValue().stream()
                    .sorted(Comparator.comparing(Log::getTimestamp))
                    .toList();

            long deniedCount = logs.stream()
                    .filter(l -> "permission_denied".equals(l.getEventType()))
                    .count();
            boolean hasGranted = logs.stream()
                    .anyMatch(l -> "permission_granted".equals(l.getEventType()));

            if (deniedCount >= 3 && hasGranted) {
                String sourceIp = logs.stream()
                        .map(Log::getSourceIp)
                        .filter(ip -> ip != null)
                        .findFirst().orElse("unknown");
                String logIds = logs.stream()
                        .map(l -> String.valueOf(l.getId()))
                        .collect(Collectors.joining(",", "[", "]"));

                alerts.add(Alert.builder()
                        .ruleId(getRuleId())
                        .ruleName(getRuleName())
                        .severity(Severity.HIGH)
                        .mitreTactic("TA0004")
                        .mitreTechnique("T1548")
                        .userIdField(user)
                        .sourceIp(sourceIp)
                        .description("Privilege escalation detected for user " + user
                                + ": " + deniedCount + " permission denied attempts followed by"
                                + " a successful permission grant from " + sourceIp)
                        .evidenceLogIds(logIds)
                        .build());
            }
        }
        return alerts;
    }
}
