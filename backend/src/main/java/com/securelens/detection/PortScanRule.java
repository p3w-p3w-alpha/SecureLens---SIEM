package com.securelens.detection;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.model.Alert;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.LogRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PortScanRule implements DetectionRule {

    private final LogRepository logRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getRuleId() {
        return "R-005";
    }

    @Override
    public String getRuleName() {
        return "Port Scan";
    }

    @Override
    public List<Alert> evaluate() {
        Instant windowStart = Instant.now().minusSeconds(300); // 5 minutes
        List<Log> portScans = logRepository.findByEventTypeAndTimestampAfter("port_scan", windowStart);

        var grouped = portScans.stream()
                .filter(l -> l.getSourceIp() != null)
                .collect(Collectors.groupingBy(Log::getSourceIp));

        List<Alert> alerts = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            String ip = entry.getKey();
            List<Log> logs = entry.getValue();

            Set<Integer> distinctPorts = new TreeSet<>();
            for (Log log : logs) {
                int port = extractPort(log);
                if (port > 0) distinctPorts.add(port);
            }

            if (distinctPorts.size() >= 20) {
                String samplePorts = distinctPorts.stream()
                        .limit(10)
                        .map(String::valueOf)
                        .collect(Collectors.joining(", "));
                String logIds = logs.stream()
                        .map(l -> String.valueOf(l.getId()))
                        .collect(Collectors.joining(",", "[", "]"));

                alerts.add(Alert.builder()
                        .ruleId(getRuleId())
                        .ruleName(getRuleName())
                        .severity(Severity.MEDIUM)
                        .mitreTactic("TA0007")
                        .mitreTechnique("T1046")
                        .sourceIp(ip)
                        .description("Port scan detected from " + ip + ": "
                                + distinctPorts.size() + " distinct ports scanned"
                                + " (sample: " + samplePorts + ")")
                        .evidenceLogIds(logIds)
                        .build());
            }
        }
        return alerts;
    }

    private int extractPort(Log log) {
        if (log.getMetadata() == null) return 0;
        try {
            JsonNode node = objectMapper.readTree(log.getMetadata());
            JsonNode port = node.get("port");
            return port != null ? port.asInt() : 0;
        } catch (Exception e) {
            return 0;
        }
    }
}
