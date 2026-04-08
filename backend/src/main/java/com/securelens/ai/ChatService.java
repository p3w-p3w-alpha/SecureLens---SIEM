package com.securelens.ai;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.dto.ChatRequest;
import com.securelens.dto.ChatResponse;
import com.securelens.model.Alert;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.AlertRepository;
import com.securelens.repository.AlertSpecification;
import com.securelens.repository.LogRepository;
import com.securelens.repository.LogSpecification;
import com.securelens.repository.ThreatIntelCacheRepository;
import com.securelens.service.ThreatIntelAggregator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final RestTemplate restTemplate;
    private final LogRepository logRepository;
    private final AlertRepository alertRepository;
    private final ThreatIntelCacheRepository intelCacheRepository;
    private final ThreatIntelAggregator intelAggregator;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

    @Value("${securelens.api-keys.mistral:}")
    private String apiKey;

    private static final String SYSTEM_PROMPT = """
            You are a cybersecurity analyst assistant for the SecureLens SOC platform.
            You have access to real-time security data through tool calls.

            DATABASE CONTEXT:
            - logs table: raw security events (login_failed, login_success, file_access, permission_denied, permission_granted, port_scan, data_transfer, process_execution, config_change, network_connection)
            - alerts table: detected security incidents with MITRE ATT&CK tags and severity levels
            - threat_intel_cache: threat intelligence results from VirusTotal, AbuseIPDB, Shodan, NVD, AlienVault OTX

            RULES:
            - Always use tool calls to fetch real data before answering questions about logs, alerts, or threat intel
            - Never invent or estimate data — only state what the database returns
            - Be concise and actionable — analysts need fast answers
            - When listing IPs or events, include counts and timestamps
            - If a question needs multiple data sources, make multiple tool calls
            """;

    public ChatResponse chat(String message, List<ChatRequest.ChatMessage> history) {
        if (apiKey == null || apiKey.isEmpty()) {
            return ChatResponse.builder()
                    .answer("Mistral API key not configured. Please set MISTRAL_API_KEY.")
                    .build();
        }

        try {
            // Build messages
            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content",
                    SYSTEM_PROMPT + "\nCurrent time: " + Instant.now()));

            if (history != null) {
                for (ChatRequest.ChatMessage msg : history) {
                    messages.add(Map.of("role", msg.getRole(), "content", msg.getContent()));
                }
            }
            messages.add(Map.of("role", "user", "content", message));

            // CALL 1 — Tool Selection
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "mistral-small-latest");
            requestBody.put("messages", messages);
            requestBody.put("tools", getToolDefinitions());
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 2000);

            String responseJson = callMistral(requestBody);
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode choice = root.path("choices").get(0);
            JsonNode msgNode = choice.path("message");
            String finishReason = choice.path("finish_reason").asText("");

            // Check if Mistral wants to call a tool
            if ("tool_calls".equals(finishReason) || msgNode.has("tool_calls")) {
                JsonNode toolCalls = msgNode.path("tool_calls");
                if (toolCalls.isArray() && !toolCalls.isEmpty()) {
                    // Add assistant's tool_call message
                    Map<String, Object> assistantMsg = new LinkedHashMap<>();
                    assistantMsg.put("role", "assistant");
                    assistantMsg.put("content", msgNode.path("content").asText(""));
                    assistantMsg.put("tool_calls", objectMapper.treeToValue(toolCalls, List.class));
                    messages.add(assistantMsg);

                    String firstToolName = null;
                    Object firstDataSnapshot = null;

                    // Execute each tool call
                    for (JsonNode tc : toolCalls) {
                        String toolCallId = tc.path("id").asText();
                        String toolName = tc.path("function").path("name").asText();
                        String argsJson = tc.path("function").path("arguments").asText();
                        JsonNode args = objectMapper.readTree(argsJson);

                        Object result = executeTool(toolName, args);
                        String resultJson = objectMapper.writeValueAsString(result);

                        if (firstToolName == null) {
                            firstToolName = toolName;
                            firstDataSnapshot = result;
                        }

                        messages.add(Map.of(
                                "role", "tool",
                                "name", toolName,
                                "content", resultJson,
                                "tool_call_id", toolCallId
                        ));
                    }

                    // CALL 2 — Answer Generation
                    Map<String, Object> call2Body = new HashMap<>();
                    call2Body.put("model", "mistral-small-latest");
                    call2Body.put("messages", messages);
                    call2Body.put("temperature", 0.3);
                    call2Body.put("max_tokens", 2000);

                    String call2Response = callMistral(call2Body);
                    JsonNode call2Root = objectMapper.readTree(call2Response);
                    String answer = call2Root.path("choices").get(0)
                            .path("message").path("content").asText("");

                    return ChatResponse.builder()
                            .answer(answer)
                            .toolCalled(firstToolName)
                            .dataSnapshot(firstDataSnapshot)
                            .build();
                }
            }

            // Direct text response (no tool call)
            String directAnswer = msgNode.path("content").asText("I couldn't process that request.");
            return ChatResponse.builder().answer(directAnswer).build();

        } catch (Exception e) {
            log.error("Chat failed: {}", e.getMessage());
            // Fallback
            return fallbackResponse(message);
        }
    }

    private String callMistral(Map<String, Object> requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        try {
            String json = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(json, headers);
            return restTemplate.postForObject(MISTRAL_URL, entity, String.class);
        } catch (Exception e) {
            throw new RuntimeException("Mistral API call failed: " + e.getMessage(), e);
        }
    }

    private Object executeTool(String toolName, JsonNode args) {
        return switch (toolName) {
            case "query_events" -> executeQueryEvents(args);
            case "query_alerts" -> executeQueryAlerts(args);
            case "get_alert_detail" -> executeGetAlertDetail(args);
            case "get_top_attackers" -> executeGetTopAttackers(args);
            case "get_event_stats" -> executeGetEventStats(args);
            case "investigate_ioc" -> executeInvestigateIoc(args);
            default -> Map.of("error", "Unknown tool: " + toolName);
        };
    }

    private Object executeQueryEvents(JsonNode args) {
        String eventType = args.has("eventType") ? args.get("eventType").asText() : null;
        String sourceIp = args.has("sourceIp") ? args.get("sourceIp").asText() : null;
        String userIdField = args.has("userIdField") ? args.get("userIdField").asText() : null;
        Instant fromTime = args.has("fromTime") ? Instant.parse(args.get("fromTime").asText()) : Instant.now().minusSeconds(3600);
        int limit = args.has("limit") ? Math.min(args.get("limit").asInt(50), 100) : 50;

        Specification<Log> spec = Specification.where(LogSpecification.hasEventType(eventType))
                .and(LogSpecification.hasSourceIp(sourceIp))
                .and(LogSpecification.hasUserIdField(userIdField))
                .and(LogSpecification.timestampAfter(fromTime));

        var logs = logRepository.findAll(spec, PageRequest.of(0, limit, Sort.by("timestamp").descending()));
        return logs.getContent().stream().map(l -> Map.of(
                "id", l.getId(),
                "timestamp", l.getTimestamp().toString(),
                "eventType", l.getEventType(),
                "sourceIp", l.getSourceIp() != null ? l.getSourceIp() : "",
                "destinationIp", l.getDestinationIp() != null ? l.getDestinationIp() : "",
                "severity", l.getSeverity().name(),
                "userIdField", l.getUserIdField() != null ? l.getUserIdField() : "",
                "rawMessage", l.getRawMessage() != null ? l.getRawMessage() : ""
        )).toList();
    }

    private Object executeQueryAlerts(JsonNode args) {
        String status = args.has("status") ? args.get("status").asText() : null;
        String severity = args.has("severity") ? args.get("severity").asText() : null;
        String ruleId = args.has("ruleId") ? args.get("ruleId").asText() : null;
        String sourceIp = args.has("sourceIp") ? args.get("sourceIp").asText() : null;
        int limit = args.has("limit") ? Math.min(args.get("limit").asInt(20), 50) : 20;

        Severity sevEnum = severity != null ? Severity.valueOf(severity) : null;
        var statusEnum = status != null ? com.securelens.model.AlertStatus.valueOf(status) : null;

        Specification<Alert> spec = Specification.where(AlertSpecification.hasSeverity(sevEnum))
                .and(AlertSpecification.hasStatus(statusEnum))
                .and(AlertSpecification.hasRuleId(ruleId))
                .and(AlertSpecification.hasSourceIp(sourceIp));

        var alerts = alertRepository.findAll(spec, PageRequest.of(0, limit, Sort.by("createdAt").descending()));
        return alerts.getContent().stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.getId());
            m.put("ruleId", a.getRuleId());
            m.put("ruleName", a.getRuleName());
            m.put("severity", a.getSeverity().name());
            m.put("mitreTactic", a.getMitreTactic() != null ? a.getMitreTactic() : "");
            m.put("mitreTechnique", a.getMitreTechnique() != null ? a.getMitreTechnique() : "");
            m.put("sourceIp", a.getSourceIp() != null ? a.getSourceIp() : "");
            m.put("description", a.getDescription() != null ? a.getDescription() : "");
            m.put("status", a.getStatus().name());
            m.put("createdAt", a.getCreatedAt().toString());
            return m;
        }).toList();
    }

    private Object executeGetAlertDetail(JsonNode args) {
        long alertId = args.get("alertId").asLong();
        return alertRepository.findById(alertId)
                .map(a -> Map.of(
                        "id", a.getId(),
                        "ruleId", a.getRuleId(),
                        "ruleName", a.getRuleName(),
                        "severity", a.getSeverity().name(),
                        "description", a.getDescription() != null ? a.getDescription() : "",
                        "sourceIp", a.getSourceIp() != null ? a.getSourceIp() : "",
                        "status", a.getStatus().name(),
                        "aiTriageResult", a.getAiTriageResult() != null ? a.getAiTriageResult() : "Not triaged"
                ))
                .orElse(Map.of("error", "Alert not found"));
    }

    private Object executeGetTopAttackers(JsonNode args) {
        String metric = args.get("metric").asText("events");
        int limit = args.has("limit") ? Math.min(args.get("limit").asInt(10), 20) : 10;

        if ("alerts".equals(metric)) {
            var alerts = alertRepository.findAll();
            return alerts.stream()
                    .filter(a -> a.getSourceIp() != null)
                    .collect(Collectors.groupingBy(Alert::getSourceIp, Collectors.counting()))
                    .entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(limit)
                    .map(e -> Map.of("sourceIp", e.getKey(), "count", e.getValue()))
                    .toList();
        } else {
            Instant from = args.has("fromTime") ? Instant.parse(args.get("fromTime").asText()) : Instant.now().minusSeconds(86400);
            var logs = logRepository.findAll(Specification.where(LogSpecification.timestampAfter(from)));
            return logs.stream()
                    .filter(l -> l.getSourceIp() != null)
                    .collect(Collectors.groupingBy(Log::getSourceIp, Collectors.counting()))
                    .entrySet().stream()
                    .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                    .limit(limit)
                    .map(e -> Map.of("sourceIp", e.getKey(), "count", e.getValue()))
                    .toList();
        }
    }

    private Object executeGetEventStats(JsonNode args) {
        String groupBy = args.get("groupBy").asText("eventType");
        Instant from = args.has("fromTime") ? Instant.parse(args.get("fromTime").asText()) : Instant.now().minusSeconds(86400);

        var logs = logRepository.findAll(Specification.where(LogSpecification.timestampAfter(from)));
        return switch (groupBy) {
            case "sourceIp" -> logs.stream()
                    .filter(l -> l.getSourceIp() != null)
                    .collect(Collectors.groupingBy(Log::getSourceIp, Collectors.counting()));
            case "severity" -> logs.stream()
                    .collect(Collectors.groupingBy(l -> l.getSeverity().name(), Collectors.counting()));
            case "hour" -> logs.stream()
                    .collect(Collectors.groupingBy(
                            l -> l.getTimestamp().atZone(java.time.ZoneOffset.UTC).getHour(),
                            Collectors.counting()));
            default -> logs.stream()
                    .collect(Collectors.groupingBy(Log::getEventType, Collectors.counting()));
        };
    }

    private Object executeInvestigateIoc(JsonNode args) {
        String iocValue = args.get("iocValue").asText();
        String iocType = args.has("iocType") ? args.get("iocType").asText("IP") : "IP";

        // Check cache first
        var cached = intelCacheRepository.findByQueryValueAndExpiresAtAfter(iocValue, Instant.now());
        if (!cached.isEmpty()) {
            return cached.stream().map(c -> Map.of(
                    "provider", c.getProvider().name(),
                    "riskScore", c.getRiskScore(),
                    "cached", true
            )).toList();
        }

        // Call aggregator for fresh data
        try {
            var result = switch (iocType.toUpperCase()) {
                case "HASH" -> intelAggregator.lookupHash(iocValue);
                case "DOMAIN" -> intelAggregator.lookupIp(iocValue); // OTX supports domain
                default -> intelAggregator.lookupIp(iocValue);
            };
            return Map.of(
                    "overallRiskScore", result.getOverallRiskScore(),
                    "providers", result.getProviders().stream().map(p -> Map.of(
                            "provider", p.getProvider(),
                            "riskScore", p.getRiskScore(),
                            "summary", p.getSummary(),
                            "available", p.isAvailable()
                    )).toList()
            );
        } catch (Exception e) {
            return Map.of("error", "Threat intel lookup failed: " + e.getMessage());
        }
    }

    private ChatResponse fallbackResponse(String message) {
        String lower = message.toLowerCase();
        Object data;
        String toolName;

        if (lower.contains("failed login") || lower.contains("login_failed")) {
            var logs = logRepository.findByEventTypeAndTimestampAfter("login_failed", Instant.now().minusSeconds(3600));
            data = logs.stream().limit(20).map(l -> l.getSourceIp() + " → " + l.getUserIdField() + " at " + l.getTimestamp()).toList();
            toolName = "query_events";
        } else if (lower.contains("alert") || lower.contains("critical")) {
            var alerts = alertRepository.findAll(PageRequest.of(0, 10, Sort.by("createdAt").descending()));
            data = alerts.getContent().stream().map(a -> a.getRuleId() + " " + a.getRuleName() + " [" + a.getSeverity() + "] " + a.getSourceIp()).toList();
            toolName = "query_alerts";
        } else if (lower.contains("top attacker") || lower.contains("top ip")) {
            data = executeGetTopAttackers(objectMapper.createObjectNode().put("metric", "events"));
            toolName = "get_top_attackers";
        } else {
            var logs = logRepository.findAll(PageRequest.of(0, 20, Sort.by("timestamp").descending()));
            data = logs.getContent().stream().map(l -> l.getEventType() + " | " + l.getSourceIp() + " | " + l.getTimestamp()).toList();
            toolName = "query_events";
        }

        return ChatResponse.builder()
                .answer("⚠ AI assistant timed out. Here are the raw query results:\n\n" + data)
                .toolCalled(toolName)
                .dataSnapshot(data)
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getToolDefinitions() {
        return List.of(
                buildTool("query_events",
                        "Search security event logs. Use this for questions about login attempts, file access, network connections, port scans, data transfers, and other raw security events.",
                        Map.of("eventType", Map.of("type", "string", "description", "Filter by event type"),
                                "sourceIp", Map.of("type", "string", "description", "Filter by source IP"),
                                "userIdField", Map.of("type", "string", "description", "Filter by user ID"),
                                "fromTime", Map.of("type", "string", "description", "ISO timestamp for start time"),
                                "limit", Map.of("type", "integer", "description", "Max results (default 50, max 100)")),
                        List.of()),
                buildTool("query_alerts",
                        "Search detected security alerts. Use this for questions about incidents, threats, detections, and MITRE ATT&CK findings.",
                        Map.of("status", Map.of("type", "string", "description", "Filter: NEW, INVESTIGATING, RESOLVED, FALSE_POSITIVE"),
                                "severity", Map.of("type", "string", "description", "Filter: INFO, LOW, MEDIUM, HIGH, CRITICAL"),
                                "ruleId", Map.of("type", "string", "description", "Filter by rule ID e.g. R-001"),
                                "sourceIp", Map.of("type", "string", "description", "Filter by source IP"),
                                "limit", Map.of("type", "integer", "description", "Max results (default 20, max 50)")),
                        List.of()),
                buildTool("get_alert_detail",
                        "Get full details of a specific alert including AI triage results. Use when analyst asks about a specific alert by ID.",
                        Map.of("alertId", Map.of("type", "integer", "description", "The alert ID")),
                        List.of("alertId")),
                buildTool("get_top_attackers",
                        "Get ranked list of most active source IPs. Use for top threats, most active attackers, or threat summary.",
                        Map.of("metric", Map.of("type", "string", "description", "Count by: events or alerts"),
                                "limit", Map.of("type", "integer", "description", "Max results (default 10, max 20)")),
                        List.of("metric")),
                buildTool("get_event_stats",
                        "Get aggregated event statistics. Use for distribution, counts by type, or activity patterns.",
                        Map.of("groupBy", Map.of("type", "string", "description", "Group by: sourceIp, eventType, severity, or hour"),
                                "fromTime", Map.of("type", "string", "description", "ISO timestamp for start time")),
                        List.of("groupBy")),
                buildTool("investigate_ioc",
                        "Look up threat intelligence for an IP, domain, or hash. Use when analyst asks if something is malicious.",
                        Map.of("iocValue", Map.of("type", "string", "description", "The IP, domain, or hash to investigate"),
                                "iocType", Map.of("type", "string", "description", "Type: IP, DOMAIN, or HASH")),
                        List.of("iocValue", "iocType"))
        );
    }

    private Map<String, Object> buildTool(String name, String description,
                                           Map<String, Object> properties, List<String> required) {
        return Map.of("type", "function", "function", Map.of(
                "name", name,
                "description", description,
                "parameters", Map.of(
                        "type", "object",
                        "properties", properties,
                        "required", required
                )
        ));
    }
}
