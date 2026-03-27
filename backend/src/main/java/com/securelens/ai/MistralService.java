package com.securelens.ai;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.dto.TriageResult;
import com.securelens.exception.ResourceNotFoundException;
import com.securelens.model.Alert;
import com.securelens.model.Log;
import com.securelens.model.ThreatIntelCache;
import com.securelens.repository.AlertRepository;
import com.securelens.repository.LogRepository;
import com.securelens.repository.ThreatIntelCacheRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MistralService {

    private final RestTemplate restTemplate;
    private final AlertRepository alertRepository;
    private final LogRepository logRepository;
    private final ThreatIntelCacheRepository intelCacheRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

    @Value("${securelens.api-keys.mistral:}")
    private String apiKey;

    public TriageResult triageAlert(Long alertId) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new RuntimeException("Mistral API key not configured");
        }

        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));

        // Fetch evidence logs
        List<Log> evidenceLogs = fetchEvidenceLogs(alert);

        // Fetch cached threat intel
        List<ThreatIntelCache> intelCache = List.of();
        if (alert.getSourceIp() != null) {
            intelCache = intelCacheRepository.findByQueryValueAndExpiresAtAfter(
                    alert.getSourceIp(), Instant.now());
        }

        // Build prompt
        String systemMessage = "You are a senior SOC analyst assistant for the SecureLens security operations platform. "
                + "Analyze security alerts and provide structured triage reports. "
                + "Always respond in valid JSON format with no markdown formatting or code blocks — just raw JSON.";

        String userMessage = buildUserPrompt(alert, evidenceLogs, intelCache);

        // Call Mistral
        String responseContent = callMistral(systemMessage, userMessage);

        // Store result in alert
        alert.setAiTriageResult(responseContent);
        alertRepository.save(alert);

        // Parse result
        return parseTriageResult(responseContent);
    }

    private String buildUserPrompt(Alert alert, List<Log> logs, List<ThreatIntelCache> intel) {
        StringBuilder sb = new StringBuilder();
        sb.append("Analyze this security alert and provide a triage report.\n\n");

        sb.append("ALERT:\n");
        sb.append("- Rule: ").append(alert.getRuleName()).append(" (").append(alert.getRuleId()).append(")\n");
        sb.append("- Severity: ").append(alert.getSeverity()).append("\n");
        sb.append("- MITRE ATT&CK: ").append(alert.getMitreTactic()).append(" / ").append(alert.getMitreTechnique()).append("\n");
        sb.append("- Source IP: ").append(alert.getSourceIp() != null ? alert.getSourceIp() : "N/A").append("\n");
        sb.append("- User: ").append(alert.getUserIdField() != null ? alert.getUserIdField() : "N/A").append("\n");
        sb.append("- Description: ").append(alert.getDescription()).append("\n");
        sb.append("- Created: ").append(alert.getCreatedAt()).append("\n\n");

        sb.append("EVIDENCE LOGS (").append(logs.size()).append(" events):\n");
        for (Log log : logs) {
            sb.append(log.getTimestamp()).append(" | ").append(log.getEventType())
                    .append(" | ").append(log.getSourceIp()).append(" → ").append(log.getDestinationIp())
                    .append(" | ").append(log.getSeverity())
                    .append(" | ").append(log.getRawMessage()).append("\n");
        }

        if (!intel.isEmpty()) {
            sb.append("\nTHREAT INTELLIGENCE:\n");
            for (ThreatIntelCache cache : intel) {
                sb.append("- ").append(cache.getProvider()).append(": ")
                        .append(cache.getRiskScore()).append("/100\n");
            }
        }

        sb.append("\nRespond in this exact JSON format:\n");
        sb.append("{\n");
        sb.append("  \"severityAssessment\": \"Your assessment — agree or disagree with the alert severity and why\",\n");
        sb.append("  \"attackContext\": \"What this MITRE technique means in practice and how this specific attack pattern works\",\n");
        sb.append("  \"recommendedActions\": [\"Step 1: ...\", \"Step 2: ...\", \"Step 3: ...\"],\n");
        sb.append("  \"falsePositiveLikelihood\": \"LOW or MEDIUM or HIGH\",\n");
        sb.append("  \"reasoning\": \"Why you think this is or isn't a false positive based on the evidence\",\n");
        sb.append("  \"relatedIndicators\": [\"other IPs/domains/hashes to investigate\"]\n");
        sb.append("}");

        return sb.toString();
    }

    private String callMistral(String systemMessage, String userMessage) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> requestBody = Map.of(
                "model", "mistral-small-latest",
                "messages", List.of(
                        Map.of("role", "system", "content", systemMessage),
                        Map.of("role", "user", "content", userMessage)
                ),
                "temperature", 0.3,
                "max_tokens", 1500,
                "response_format", Map.of("type", "json_object")
        );

        try {
            String requestJson = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);
            String response = restTemplate.postForObject(MISTRAL_URL, entity, String.class);

            JsonNode root = objectMapper.readTree(response);
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("Mistral API call failed: {}", e.getMessage());
            throw new RuntimeException("AI triage service temporarily unavailable: " + e.getMessage());
        }
    }

    private TriageResult parseTriageResult(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            return TriageResult.builder()
                    .severityAssessment(root.path("severityAssessment").asText(""))
                    .attackContext(root.path("attackContext").asText(""))
                    .recommendedActions(jsonArrayToList(root.path("recommendedActions")))
                    .falsePositiveLikelihood(root.path("falsePositiveLikelihood").asText("UNKNOWN"))
                    .reasoning(root.path("reasoning").asText(""))
                    .relatedIndicators(jsonArrayToList(root.path("relatedIndicators")))
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse triage JSON, returning raw: {}", e.getMessage());
            return TriageResult.builder()
                    .severityAssessment(json)
                    .attackContext("")
                    .recommendedActions(List.of())
                    .falsePositiveLikelihood("UNKNOWN")
                    .reasoning("")
                    .relatedIndicators(List.of())
                    .build();
        }
    }

    private List<String> jsonArrayToList(JsonNode arrayNode) {
        if (arrayNode == null || !arrayNode.isArray()) return List.of();
        return java.util.stream.StreamSupport.stream(arrayNode.spliterator(), false)
                .map(JsonNode::asText)
                .toList();
    }

    private List<Log> fetchEvidenceLogs(Alert alert) {
        if (alert.getEvidenceLogIds() == null || alert.getEvidenceLogIds().isEmpty()) {
            return List.of();
        }
        String cleaned = alert.getEvidenceLogIds().replaceAll("[\\[\\]\\s]", "");
        List<Long> logIds = Arrays.stream(cleaned.split(","))
                .filter(s -> !s.isEmpty())
                .map(Long::valueOf)
                .toList();
        return logRepository.findAllById(logIds);
    }
}
