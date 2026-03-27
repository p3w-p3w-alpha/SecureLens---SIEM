package com.securelens.service;

import java.time.Instant;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.securelens.detection.DetectionRule;
import com.securelens.model.Alert;
import com.securelens.repository.AlertRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class DetectionEngineService {

    private final List<DetectionRule> rules;
    private final AlertRepository alertRepository;

    // Deduplication windows per rule
    private static final long DEDUP_WINDOW_DEFAULT = 600; // 10 minutes
    private static final long DEDUP_WINDOW_IMPOSSIBLE_TRAVEL = 1800; // 30 minutes
    private static final long DEDUP_WINDOW_DATA_EXFILTRATION = 900; // 15 minutes

    @Scheduled(fixedRate = 60000)
    public void runDetectionCycle() {
        int totalNew = 0;

        for (DetectionRule rule : rules) {
            try {
                List<Alert> candidates = rule.evaluate();
                for (Alert alert : candidates) {
                    if (!isDuplicate(alert)) {
                        alertRepository.save(alert);
                        totalNew++;
                    }
                }
            } catch (Exception e) {
                log.error("Detection rule {} failed: {}", rule.getRuleId(), e.getMessage());
            }
        }

        log.info("Detection engine cycle: {} new alerts from {} rules", totalNew, rules.size());
    }

    private boolean isDuplicate(Alert alert) {
        long dedupSeconds = switch (alert.getRuleId()) {
            case "R-002" -> DEDUP_WINDOW_IMPOSSIBLE_TRAVEL;
            case "R-004" -> DEDUP_WINDOW_DATA_EXFILTRATION;
            default -> DEDUP_WINDOW_DEFAULT;
        };
        Instant dedupStart = Instant.now().minusSeconds(dedupSeconds);

        // Check by sourceIp if present
        if (alert.getSourceIp() != null) {
            if (alertRepository.existsByRuleIdAndSourceIpAndCreatedAtAfter(
                    alert.getRuleId(), alert.getSourceIp(), dedupStart)) {
                return true;
            }
        }

        // Check by userIdField if present
        if (alert.getUserIdField() != null) {
            if (alertRepository.existsByRuleIdAndUserIdFieldAndCreatedAtAfter(
                    alert.getRuleId(), alert.getUserIdField(), dedupStart)) {
                return true;
            }
        }

        return false;
    }
}
