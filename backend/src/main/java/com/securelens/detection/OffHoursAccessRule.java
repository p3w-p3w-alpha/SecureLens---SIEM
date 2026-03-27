package com.securelens.detection;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
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
public class OffHoursAccessRule implements DetectionRule {

    private final LogRepository logRepository;

    @Override
    public String getRuleId() {
        return "R-008";
    }

    @Override
    public String getRuleName() {
        return "Off-Hours Access";
    }

    @Override
    public List<Alert> evaluate() {
        Instant windowStart = Instant.now().minusSeconds(3600); // 60 minutes
        List<Log> events = logRepository.findByEventTypeInAndTimestampAfter(
                List.of("login_success", "file_access"), windowStart);

        // Filter to off-hours (00:00-04:59 UTC)
        List<Log> offHoursLogs = events.stream()
                .filter(l -> {
                    ZonedDateTime utc = l.getTimestamp().atZone(ZoneOffset.UTC);
                    int hour = utc.getHour();
                    return hour >= 0 && hour <= 4;
                })
                .toList();

        // Group by userIdField — one alert per user
        var grouped = offHoursLogs.stream()
                .filter(l -> l.getUserIdField() != null)
                .collect(Collectors.groupingBy(Log::getUserIdField));

        List<Alert> alerts = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            String user = entry.getKey();
            List<Log> logs = entry.getValue();

            String eventTypes = logs.stream()
                    .map(Log::getEventType)
                    .distinct()
                    .collect(Collectors.joining(", "));
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
                    .severity(Severity.LOW)
                    .mitreTactic("TA0001")
                    .mitreTechnique("T1078")
                    .userIdField(user)
                    .sourceIp(sourceIp)
                    .description("Off-hours access detected: user " + user
                            + " performed " + logs.size() + " actions ("
                            + eventTypes + ") between 00:00-05:00 UTC from " + sourceIp)
                    .evidenceLogIds(logIds)
                    .build());
        }
        return alerts;
    }
}
