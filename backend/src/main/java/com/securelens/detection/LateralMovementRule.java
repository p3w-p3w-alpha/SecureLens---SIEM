package com.securelens.detection;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.securelens.model.Alert;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.LogRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class LateralMovementRule implements DetectionRule {

    private final LogRepository logRepository;

    @Override
    public String getRuleId() {
        return "R-006";
    }

    @Override
    public String getRuleName() {
        return "Lateral Movement";
    }

    @Override
    public List<Alert> evaluate() {
        Instant windowStart = Instant.now().minusSeconds(900); // 15 minutes
        List<Log> connections = logRepository.findByEventTypeAndTimestampAfter("network_connection", windowStart);

        var grouped = connections.stream()
                .filter(l -> l.getUserIdField() != null)
                .collect(Collectors.groupingBy(Log::getUserIdField));

        List<Alert> alerts = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            String user = entry.getKey();
            List<Log> logs = entry.getValue();

            // Count distinct internal destination IPs
            Set<String> internalDests = new TreeSet<>();
            for (Log log : logs) {
                String dest = log.getDestinationIp();
                if (dest != null && dest.startsWith("10.")) {
                    internalDests.add(dest);
                }
            }

            if (internalDests.size() >= 5) {
                String destList = String.join(", ", internalDests);
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
                        .mitreTactic("TA0008")
                        .mitreTechnique("T1021")
                        .userIdField(user)
                        .sourceIp(sourceIp)
                        .description("Lateral movement detected: user " + user
                                + " connected to " + internalDests.size()
                                + " distinct internal hosts: " + destList)
                        .evidenceLogIds(logIds)
                        .build());
            }
        }
        return alerts;
    }
}
