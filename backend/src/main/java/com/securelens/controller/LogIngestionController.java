package com.securelens.controller;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.securelens.dto.IngestionResponse;
import com.securelens.dto.LogBatchRequest;
import com.securelens.dto.LogRequest;
import com.securelens.service.LogNormalizationService;
import com.securelens.service.LogService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/ingest")
@RequiredArgsConstructor
@Slf4j
public class LogIngestionController {

    private final LogNormalizationService normalizationService;
    private final LogService logService;

    @PostMapping("/json")
    public ResponseEntity<IngestionResponse> ingestJson(@RequestBody String jsonContent) {
        return ingestLogs(normalizationService.normalizeJson(jsonContent), "json");
    }

    @PostMapping(value = "/csv", consumes = {MediaType.TEXT_PLAIN_VALUE, MediaType.APPLICATION_OCTET_STREAM_VALUE, "text/csv", MediaType.ALL_VALUE})
    public ResponseEntity<IngestionResponse> ingestCsv(@RequestBody String csvContent) {
        return ingestLogs(normalizationService.normalizeCsv(csvContent), "csv");
    }

    @PostMapping(value = "/syslog", consumes = {MediaType.TEXT_PLAIN_VALUE, MediaType.ALL_VALUE})
    public ResponseEntity<IngestionResponse> ingestSyslog(@RequestBody String syslogContent) {
        return ingestLogs(normalizationService.normalizeSyslogBatch(syslogContent), "syslog");
    }

    @PostMapping("/auto")
    public ResponseEntity<IngestionResponse> ingestAuto(@RequestParam("file") MultipartFile file) {
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            String format;
            List<LogRequest> logs;

            if (filename.endsWith(".json") || content.trim().startsWith("[") || content.trim().startsWith("{")) {
                format = "json";
                logs = normalizationService.normalizeJson(content);
            } else if (filename.endsWith(".csv") || (content.contains(",") && content.lines().count() > 1)) {
                format = "csv";
                logs = normalizationService.normalizeCsv(content);
            } else {
                format = "syslog";
                logs = normalizationService.normalizeSyslogBatch(content);
            }

            return ingestLogs(logs, format);
        } catch (Exception e) {
            return ResponseEntity.ok(IngestionResponse.builder()
                    .format("unknown").ingested(0).failed(1)
                    .errors(List.of("File read error: " + e.getMessage())).build());
        }
    }

    @GetMapping("/sample/csv")
    public ResponseEntity<byte[]> sampleCsv() {
        String csv = """
                timestamp,src_ip,dst_ip,event_type,severity,user_id,message
                2026-03-26T08:00:00Z,192.168.1.100,10.0.0.5,login_failed,HIGH,admin,Failed SSH login attempt
                2026-03-26T08:01:00Z,192.168.1.100,10.0.0.5,login_failed,HIGH,admin,Failed SSH login attempt (retry)
                2026-03-26T08:02:00Z,192.168.1.100,10.0.0.5,login_success,MEDIUM,admin,Successful SSH login
                2026-03-26T08:05:00Z,10.0.1.50,10.0.0.1,file_access,INFO,jdoe,Accessed /var/log/auth.log
                2026-03-26T08:10:00Z,172.16.0.99,10.0.0.1,port_scan,HIGH,unknown,SYN scan on ports 22 80 443
                """;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=securelens-sample.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/sample/json")
    public ResponseEntity<byte[]> sampleJson() {
        String json = """
                [
                  {"timestamp":"2026-03-26T08:00:00Z","src_ip":"192.168.1.100","dst_ip":"10.0.0.5","event_type":"login_failed","severity":"HIGH","user_id":"admin","message":"Failed SSH login attempt"},
                  {"timestamp":"2026-03-26T08:01:00Z","src_ip":"192.168.1.100","dst_ip":"10.0.0.5","event_type":"login_failed","severity":"HIGH","user_id":"admin","message":"Failed SSH login attempt (retry)"},
                  {"timestamp":"2026-03-26T08:02:00Z","src_ip":"192.168.1.100","dst_ip":"10.0.0.5","event_type":"login_success","severity":"MEDIUM","user_id":"admin","message":"Successful SSH login"},
                  {"timestamp":"2026-03-26T08:05:00Z","src_ip":"10.0.1.50","dst_ip":"10.0.0.1","event_type":"file_access","severity":"INFO","user_id":"jdoe","message":"Accessed /var/log/auth.log"},
                  {"timestamp":"2026-03-26T08:10:00Z","src_ip":"172.16.0.99","dst_ip":"10.0.0.1","event_type":"port_scan","severity":"HIGH","user_id":"unknown","message":"SYN scan on ports 22 80 443"}
                ]
                """;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=securelens-sample.json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(json.getBytes(StandardCharsets.UTF_8));
    }

    private ResponseEntity<IngestionResponse> ingestLogs(List<LogRequest> logs, String format) {
        List<String> errors = new ArrayList<>();
        int ingested = 0;
        int failed = 0;

        List<LogRequest> valid = new ArrayList<>();
        for (int i = 0; i < logs.size(); i++) {
            LogRequest req = logs.get(i);
            try {
                if (req.getTimestamp() == null) req.setTimestamp(java.time.Instant.now());
                if (req.getEventType() == null || req.getEventType().isBlank()) req.setEventType("unknown");
                if (req.getSeverity() == null || req.getSeverity().isBlank()) req.setSeverity("INFO");
                valid.add(req);
            } catch (Exception e) {
                failed++;
                if (errors.size() < 20) errors.add("Entry " + (i + 1) + ": " + e.getMessage());
            }
        }

        if (!valid.isEmpty()) {
            try {
                logService.ingestBatch(new LogBatchRequest(valid));
                ingested = valid.size();
            } catch (Exception e) {
                failed += valid.size();
                errors.add("Batch save error: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(IngestionResponse.builder()
                .format(format).ingested(ingested).failed(failed).errors(errors).build());
    }
}
