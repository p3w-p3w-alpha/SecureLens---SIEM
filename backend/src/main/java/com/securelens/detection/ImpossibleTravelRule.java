package com.securelens.detection;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
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
public class ImpossibleTravelRule implements DetectionRule {

    private final LogRepository logRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String getRuleId() {
        return "R-002";
    }

    @Override
    public String getRuleName() {
        return "Impossible Travel";
    }

    @Override
    public List<Alert> evaluate() {
        Instant windowStart = Instant.now().minusSeconds(1800); // 30 minutes
        List<Log> logins = logRepository.findByEventTypeAndTimestampAfter("login_success", windowStart);

        // Group by userIdField
        var grouped = logins.stream()
                .filter(l -> l.getUserIdField() != null)
                .collect(Collectors.groupingBy(Log::getUserIdField));

        List<Alert> alerts = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            String user = entry.getKey();
            List<Log> userLogins = entry.getValue().stream()
                    .sorted(Comparator.comparing(Log::getTimestamp))
                    .toList();

            // Filter to logins that have country metadata
            List<Log> geoLogins = userLogins.stream()
                    .filter(l -> extractCountry(l) != null)
                    .toList();

            if (geoLogins.size() < 2) continue;

            // Check consecutive geo-tagged logins for different countries
            for (int i = 0; i < geoLogins.size() - 1; i++) {
                String country1 = extractCountry(geoLogins.get(i));
                String country2 = extractCountry(geoLogins.get(i + 1));

                if (!country1.equals(country2)) {
                    Log login1 = geoLogins.get(i);
                    Log login2 = geoLogins.get(i + 1);
                    long minutesApart = (login2.getTimestamp().getEpochSecond()
                            - login1.getTimestamp().getEpochSecond()) / 60;

                    String logIds = "[" + login1.getId() + "," + login2.getId() + "]";

                    alerts.add(Alert.builder()
                            .ruleId(getRuleId())
                            .ruleName(getRuleName())
                            .severity(Severity.CRITICAL)
                            .mitreTactic("TA0001")
                            .mitreTechnique("T1078")
                            .userIdField(user)
                            .sourceIp(login2.getSourceIp())
                            .description("Impossible travel detected for user " + user
                                    + ": logged in from " + country1 + " (" + login1.getSourceIp()
                                    + ") then from " + country2 + " (" + login2.getSourceIp()
                                    + ") " + minutesApart + " minutes apart")
                            .evidenceLogIds(logIds)
                            .build());
                    break; // One alert per user
                }
            }
        }
        return alerts;
    }

    private String extractCountry(Log log) {
        if (log.getMetadata() == null) return null;
        try {
            JsonNode node = objectMapper.readTree(log.getMetadata());
            JsonNode country = node.get("country");
            return country != null ? country.asText() : null;
        } catch (Exception e) {
            log.getClass(); // suppress warning
            return null;
        }
    }
}
