package com.securelens.detection;

import java.time.Instant;
import java.util.ArrayList;
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
public class BruteForceRule implements DetectionRule {

    private final LogRepository logRepository;

    @Override
    public String getRuleId() {
        return "R-001";
    }

    @Override
    public String getRuleName() {
        return "Brute Force Login";
    }

    @Override
    public List<Alert> evaluate() {
        Instant windowStart = Instant.now().minusSeconds(600); // 10 minutes
        List<Log> failedLogins = logRepository.findByEventTypeAndTimestampAfter("login_failed", windowStart);

        // Group by sourceIp
        var grouped = failedLogins.stream()
                .collect(Collectors.groupingBy(Log::getSourceIp));

        List<Alert> alerts = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            String ip = entry.getKey();
            List<Log> logs = entry.getValue();

            if (logs.size() >= 5) {
                String targetUsers = logs.stream()
                        .map(Log::getUserIdField)
                        .distinct()
                        .collect(Collectors.joining(", "));
                String logIds = logs.stream()
                        .map(l -> String.valueOf(l.getId()))
                        .collect(Collectors.joining(",", "[", "]"));

                alerts.add(Alert.builder()
                        .ruleId(getRuleId())
                        .ruleName(getRuleName())
                        .severity(Severity.HIGH)
                        .mitreTactic("TA0006")
                        .mitreTechnique("T1110")
                        .sourceIp(ip)
                        .description("Brute force attack detected: " + logs.size()
                                + " failed login attempts from " + ip
                                + " targeting users: " + targetUsers)
                        .evidenceLogIds(logIds)
                        .build());
            }
        }
        return alerts;
    }
}
