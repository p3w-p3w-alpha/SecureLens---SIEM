package com.securelens.detection;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.model.Alert;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.LogRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataExfiltrationRule implements DetectionRule {

    private final LogRepository logRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final long HUNDRED_MB = 104857600L;

    @Override
    public String getRuleId() {
        return "R-004";
    }

    @Override
    public String getRuleName() {
        return "Data Exfiltration";
    }

    @Override
    public List<Alert> evaluate() {
        Instant windowStart = Instant.now().minusSeconds(900); // 15 minutes
        List<Log> transfers = logRepository.findByEventTypeAndTimestampAfter("data_transfer", windowStart);

        // Group by sourceIp
        var grouped = transfers.stream()
                .filter(l -> l.getSourceIp() != null)
                .collect(Collectors.groupingBy(Log::getSourceIp));

        List<Alert> alerts = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            String ip = entry.getKey();
            List<Log> logs = entry.getValue();

            if (logs.size() < 10) continue;

            long totalBytes = logs.stream()
                    .mapToLong(this::extractBytes)
                    .sum();

            if (totalBytes > HUNDRED_MB) {
                long totalMB = totalBytes / (1024 * 1024);
                String destIp = logs.stream()
                        .map(Log::getDestinationIp)
                        .filter(d -> d != null)
                        .findFirst().orElse("unknown");
                String logIds = logs.stream()
                        .map(l -> String.valueOf(l.getId()))
                        .collect(Collectors.joining(",", "[", "]"));

                alerts.add(Alert.builder()
                        .ruleId(getRuleId())
                        .ruleName(getRuleName())
                        .severity(Severity.CRITICAL)
                        .mitreTactic("TA0010")
                        .mitreTechnique("T1041")
                        .sourceIp(ip)
                        .description("Data exfiltration detected: " + logs.size()
                                + " transfers totaling " + totalMB + "MB from " + ip
                                + " to " + destIp)
                        .evidenceLogIds(logIds)
                        .build());
            }
        }
        return alerts;
    }

    private long extractBytes(Log log) {
        if (log.getMetadata() == null) return 0;
        try {
            JsonNode node = objectMapper.readTree(log.getMetadata());
            JsonNode bytes = node.get("bytes");
            return bytes != null ? bytes.asLong() : 0;
        } catch (Exception e) {
            return 0;
        }
    }
}
