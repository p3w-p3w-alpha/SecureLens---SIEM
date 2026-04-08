package com.securelens.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.dto.AlertResponse;
import com.securelens.dto.GroupedResult;
import com.securelens.dto.HuntCondition;
import com.securelens.dto.HuntPromoteRequest;
import com.securelens.dto.HuntQuery;
import com.securelens.dto.HuntResult;
import com.securelens.dto.LogResponse;
import com.securelens.exception.ResourceNotFoundException;
import com.securelens.model.Alert;
import com.securelens.model.Log;
import com.securelens.model.SavedHunt;
import com.securelens.model.Severity;
import com.securelens.repository.AlertRepository;
import com.securelens.repository.LogRepository;
import com.securelens.repository.LogSpecification;
import com.securelens.repository.SavedHuntRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class HuntService {

    private final LogRepository logRepository;
    private final AlertRepository alertRepository;
    private final SavedHuntRepository savedHuntRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public HuntResult executeHunt(HuntQuery query) {
        long start = System.currentTimeMillis();

        Specification<Log> spec = buildSpecification(query);
        List<Log> logs = logRepository.findAll(spec, PageRequest.of(0, 500, Sort.by("timestamp").descending())).getContent();

        HuntResult result;
        if (query.getGroupBy() != null && !query.getGroupBy().isEmpty()) {
            Function<Log, String> groupFn = getGroupFunction(query.getGroupBy());
            Map<String, Long> grouped = logs.stream()
                    .map(groupFn)
                    .filter(k -> k != null && !k.isEmpty())
                    .collect(Collectors.groupingBy(k -> k, Collectors.counting()));

            int threshold = query.getThreshold() != null ? query.getThreshold() : 0;
            List<GroupedResult> groupedResults = grouped.entrySet().stream()
                    .filter(e -> e.getValue() >= threshold)
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .map(e -> GroupedResult.builder().key(e.getKey()).count(e.getValue()).build())
                    .toList();

            result = HuntResult.builder()
                    .resultType("grouped")
                    .groupedResults(groupedResults)
                    .totalCount(groupedResults.size())
                    .build();
        } else {
            List<LogResponse> logResponses = logs.stream().limit(200).map(this::toLogResponse).toList();
            result = HuntResult.builder()
                    .resultType("logs")
                    .logs(logResponses)
                    .totalCount(logs.size())
                    .build();
        }

        result.setExecutionTimeMs(System.currentTimeMillis() - start);
        return result;
    }

    public SavedHunt saveHunt(String name, String description, HuntQuery query, String createdBy) {
        try {
            String queryJson = objectMapper.writeValueAsString(query);
            SavedHunt hunt = SavedHunt.builder()
                    .name(name)
                    .description(description)
                    .queryJson(queryJson)
                    .createdBy(createdBy)
                    .build();
            return savedHuntRepository.save(hunt);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save hunt: " + e.getMessage());
        }
    }

    public List<SavedHunt> getSavedHunts() {
        return savedHuntRepository.findAll(Sort.by("createdAt").descending());
    }

    public SavedHunt getSavedHunt(Long id) {
        return savedHuntRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Saved hunt not found: " + id));
    }

    public HuntResult runSavedHunt(Long id) {
        SavedHunt hunt = getSavedHunt(id);
        try {
            HuntQuery query = objectMapper.readValue(hunt.getQueryJson(), HuntQuery.class);
            return executeHunt(query);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse saved hunt query: " + e.getMessage());
        }
    }

    public AlertResponse promoteToAlert(HuntPromoteRequest req) {
        String logIds = req.getEvidenceLogIds() != null
                ? req.getEvidenceLogIds().stream().map(String::valueOf).collect(Collectors.joining(",", "[", "]"))
                : "[]";

        Alert alert = Alert.builder()
                .ruleId("HUNT-MANUAL")
                .ruleName("Manual Hunt Finding")
                .severity(Severity.valueOf(req.getSeverity()))
                .description(req.getDescription() != null ? req.getDescription() : req.getTitle())
                .evidenceLogIds(logIds)
                .mitreTactic("TA0043")
                .mitreTechnique("T0000")
                .build();

        alert = alertRepository.save(alert);

        return AlertResponse.builder()
                .id(alert.getId())
                .ruleId(alert.getRuleId())
                .ruleName(alert.getRuleName())
                .severity(alert.getSeverity().name())
                .status(alert.getStatus().name())
                .description(alert.getDescription())
                .createdAt(alert.getCreatedAt())
                .build();
    }

    private Specification<Log> buildSpecification(HuntQuery query) {
        Specification<Log> spec = Specification.where(null);

        if (query.getConditions() != null) {
            for (HuntCondition cond : query.getConditions()) {
                spec = spec.and(conditionToSpec(cond));
            }
        }

        if (query.getTimeRange() != null) {
            if (query.getTimeRange().getStartDate() != null) {
                spec = spec.and(LogSpecification.timestampAfter(query.getTimeRange().getStartDate()));
            }
            if (query.getTimeRange().getEndDate() != null) {
                spec = spec.and(LogSpecification.timestampBefore(query.getTimeRange().getEndDate()));
            }
        }

        return spec;
    }

    private Specification<Log> conditionToSpec(HuntCondition cond) {
        String field = cond.getField();
        String value = cond.getValue();

        if ("severity".equals(field) && ("EQUALS".equals(cond.getOperator()) || "NOT_EQUALS".equals(cond.getOperator()))) {
            Severity sev = Severity.valueOf(value);
            return (root, query, cb) -> "NOT_EQUALS".equals(cond.getOperator())
                    ? cb.notEqual(root.get("severity"), sev)
                    : cb.equal(root.get("severity"), sev);
        }

        return (root, query, cb) -> switch (cond.getOperator()) {
            case "EQUALS" -> cb.equal(root.get(field), value);
            case "NOT_EQUALS" -> cb.notEqual(root.get(field), value);
            case "CONTAINS" -> cb.like(cb.lower(root.get(field)), "%" + value.toLowerCase() + "%");
            case "STARTS_WITH" -> cb.like(root.get(field), value + "%");
            default -> null;
        };
    }

    private Function<Log, String> getGroupFunction(String groupBy) {
        return switch (groupBy) {
            case "sourceIp" -> Log::getSourceIp;
            case "destinationIp" -> Log::getDestinationIp;
            case "eventType" -> Log::getEventType;
            case "severity" -> l -> l.getSeverity().name();
            case "userIdField" -> Log::getUserIdField;
            default -> Log::getSourceIp;
        };
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
