package com.securelens.service;

import java.io.StringReader;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVReader;
import com.securelens.dto.LogRequest;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class LogNormalizationService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Set<String> TIMESTAMP_FIELDS = Set.of("timestamp", "@timestamp", "time", "datetime", "date", "event_time");
    private static final Set<String> SRC_IP_FIELDS = Set.of("src_ip", "source_ip", "sourceip", "src", "source_address", "srcip");
    private static final Set<String> DST_IP_FIELDS = Set.of("dst_ip", "dest_ip", "destination_ip", "destinationip", "dst", "dest_address", "dstip");
    private static final Set<String> EVENT_TYPE_FIELDS = Set.of("event_type", "eventtype", "action", "event", "type", "event_name");
    private static final Set<String> SEVERITY_FIELDS = Set.of("severity", "level", "priority", "sev", "log_level");
    private static final Set<String> USER_FIELDS = Set.of("user", "username", "user_id", "userid", "user_name", "account", "uid");
    private static final Set<String> MESSAGE_FIELDS = Set.of("message", "msg", "raw_message", "rawmessage", "description", "log", "text");

    private static final Pattern IP_PATTERN = Pattern.compile("\\b(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\b");
    private static final Pattern SYSLOG_PATTERN = Pattern.compile("^<(\\d+)>(\\w{3}\\s+\\d+\\s+\\d+:\\d+:\\d+)\\s+(\\S+)\\s+(\\S+?)(?:\\[(\\d+)])?:\\s+(.*)$");

    // ── JSON ────────────────────────────────────────────────────────────

    public List<LogRequest> normalizeJson(String jsonContent) {
        List<LogRequest> results = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(jsonContent);
            if (root.isArray()) {
                for (JsonNode node : root) {
                    results.add(jsonNodeToLogRequest(node));
                }
            } else if (root.isObject()) {
                results.add(jsonNodeToLogRequest(root));
            }
        } catch (Exception e) {
            log.warn("JSON parse error: {}", e.getMessage());
        }
        return results;
    }

    private LogRequest jsonNodeToLogRequest(JsonNode node) {
        Map<String, String> fields = new HashMap<>();
        Map<String, String> extra = new LinkedHashMap<>();

        Iterator<Map.Entry<String, JsonNode>> it = node.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> entry = it.next();
            String key = entry.getKey().toLowerCase().trim();
            String value = entry.getValue().isTextual() ? entry.getValue().asText() : entry.getValue().toString();
            fields.put(key, value);
        }

        LogRequest req = new LogRequest();
        req.setTimestamp(parseTimestamp(findField(fields, TIMESTAMP_FIELDS, extra)));
        req.setSourceIp(findField(fields, SRC_IP_FIELDS, extra));
        req.setDestinationIp(findField(fields, DST_IP_FIELDS, extra));
        req.setEventType(defaultIfBlank(findField(fields, EVENT_TYPE_FIELDS, extra), "unknown"));
        req.setSeverity(normalizeSeverity(findField(fields, SEVERITY_FIELDS, extra)));
        req.setUserIdField(findField(fields, USER_FIELDS, extra));
        req.setRawMessage(findField(fields, MESSAGE_FIELDS, extra));

        // Remaining fields → metadata
        for (Map.Entry<String, String> e : fields.entrySet()) {
            extra.put(e.getKey(), e.getValue());
        }
        if (!extra.isEmpty()) {
            try { req.setMetadata(objectMapper.writeValueAsString(extra)); } catch (Exception ignored) {}
        }

        return req;
    }

    // ── CSV ──────────────────────────────────────────────────────────────

    public List<LogRequest> normalizeCsv(String csvContent) {
        List<LogRequest> results = new ArrayList<>();
        try (CSVReader reader = new CSVReader(new StringReader(csvContent))) {
            String[] headers = reader.readNext();
            if (headers == null) return results;

            // Normalize header names
            for (int i = 0; i < headers.length; i++) {
                headers[i] = headers[i].trim().toLowerCase();
            }

            String[] row;
            while ((row = reader.readNext()) != null) {
                if (row.length == 0 || (row.length == 1 && row[0].isBlank())) continue;
                try {
                    Map<String, String> fields = new HashMap<>();
                    for (int i = 0; i < Math.min(headers.length, row.length); i++) {
                        fields.put(headers[i], row[i].trim());
                    }
                    Map<String, String> extra = new LinkedHashMap<>();
                    LogRequest req = new LogRequest();
                    req.setTimestamp(parseTimestamp(findField(fields, TIMESTAMP_FIELDS, extra)));
                    req.setSourceIp(findField(fields, SRC_IP_FIELDS, extra));
                    req.setDestinationIp(findField(fields, DST_IP_FIELDS, extra));
                    req.setEventType(defaultIfBlank(findField(fields, EVENT_TYPE_FIELDS, extra), "unknown"));
                    req.setSeverity(normalizeSeverity(findField(fields, SEVERITY_FIELDS, extra)));
                    req.setUserIdField(findField(fields, USER_FIELDS, extra));
                    req.setRawMessage(findField(fields, MESSAGE_FIELDS, extra));
                    for (Map.Entry<String, String> e : fields.entrySet()) extra.put(e.getKey(), e.getValue());
                    if (!extra.isEmpty()) {
                        try { req.setMetadata(objectMapper.writeValueAsString(extra)); } catch (Exception ignored) {}
                    }
                    results.add(req);
                } catch (Exception e) {
                    log.warn("CSV row parse error: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("CSV parse error: {}", e.getMessage());
        }
        return results;
    }

    // ── Syslog ──────────────────────────────────────────────────────────

    public LogRequest normalizeSyslog(String line) {
        LogRequest req = new LogRequest();
        Matcher m = SYSLOG_PATTERN.matcher(line.trim());

        if (m.matches()) {
            int priority = Integer.parseInt(m.group(1));
            int severityVal = priority % 8;
            req.setSeverity(syslogSeverity(severityVal));
            req.setTimestamp(parseSyslogTimestamp(m.group(2)));
            String hostname = m.group(3);
            String message = m.group(6);
            req.setRawMessage(message);
            req.setEventType(detectEventType(message));

            // Extract IP from message
            Matcher ipMatcher = IP_PATTERN.matcher(message);
            if (ipMatcher.find()) {
                req.setSourceIp(ipMatcher.group(1));
            }

            // Extract username from common patterns
            Pattern userPattern = Pattern.compile("(?:for|user|by)\\s+(\\w+)", Pattern.CASE_INSENSITIVE);
            Matcher userMatcher = userPattern.matcher(message);
            if (userMatcher.find()) {
                req.setUserIdField(userMatcher.group(1));
            }

            req.setMetadata("{\"hostname\":\"" + hostname + "\",\"app\":\"" + m.group(4) + "\"}");
        } else {
            req.setTimestamp(Instant.now());
            req.setRawMessage(line.trim());
            req.setEventType("unknown");
            req.setSeverity("INFO");
        }

        return req;
    }

    public List<LogRequest> normalizeSyslogBatch(String content) {
        List<LogRequest> results = new ArrayList<>();
        for (String line : content.split("\n")) {
            if (line.isBlank()) continue;
            results.add(normalizeSyslog(line));
        }
        return results;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private String findField(Map<String, String> fields, Set<String> aliases, Map<String, String> extra) {
        for (String alias : aliases) {
            String val = fields.remove(alias);
            if (val != null && !val.isBlank()) return val;
        }
        return null;
    }

    private Instant parseTimestamp(String ts) {
        if (ts == null || ts.isBlank()) return Instant.now();
        try { return Instant.parse(ts); } catch (Exception ignored) {}
        try {
            return LocalDateTime.parse(ts, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"))
                    .toInstant(ZoneOffset.UTC);
        } catch (Exception ignored) {}
        try {
            return LocalDateTime.parse(ts, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                    .toInstant(ZoneOffset.UTC);
        } catch (Exception ignored) {}
        return Instant.now();
    }

    private Instant parseSyslogTimestamp(String ts) {
        try {
            int year = java.time.Year.now().getValue();
            return LocalDateTime.parse(year + " " + ts, DateTimeFormatter.ofPattern("yyyy MMM d HH:mm:ss"))
                    .toInstant(ZoneOffset.UTC);
        } catch (Exception e) {
            try {
                int year = java.time.Year.now().getValue();
                return LocalDateTime.parse(year + " " + ts, DateTimeFormatter.ofPattern("yyyy MMM  d HH:mm:ss"))
                        .toInstant(ZoneOffset.UTC);
            } catch (Exception ignored) {}
        }
        return Instant.now();
    }

    private String normalizeSeverity(String sev) {
        if (sev == null || sev.isBlank()) return "INFO";
        String lower = sev.toLowerCase().trim();
        return switch (lower) {
            case "critical", "crit", "fatal", "emergency", "emerg" -> "CRITICAL";
            case "high", "error", "err", "alert" -> "HIGH";
            case "medium", "warning", "warn" -> "MEDIUM";
            case "low", "debug", "notice" -> "LOW";
            case "info", "information", "informational" -> "INFO";
            default -> {
                try { Enum.valueOf(com.securelens.model.Severity.class, sev.toUpperCase()); yield sev.toUpperCase(); }
                catch (Exception e) { yield "INFO"; }
            }
        };
    }

    private String syslogSeverity(int val) {
        return switch (val) {
            case 0, 1 -> "CRITICAL";
            case 2, 3 -> "HIGH";
            case 4 -> "MEDIUM";
            case 5, 6 -> "LOW";
            default -> "INFO";
        };
    }

    private String detectEventType(String message) {
        String lower = message.toLowerCase();
        if (lower.contains("failed password") || lower.contains("authentication failure")) return "login_failed";
        if (lower.contains("accepted password") || lower.contains("session opened")) return "login_success";
        if (lower.contains("denied") || lower.contains("blocked") || lower.contains("drop")) return "permission_denied";
        if (lower.contains("scan") || lower.contains("probe")) return "port_scan";
        if (lower.contains("forbidden") || lower.contains("403")) return "permission_denied";
        return "network_connection";
    }

    private String defaultIfBlank(String val, String def) {
        return (val == null || val.isBlank()) ? def : val;
    }
}
