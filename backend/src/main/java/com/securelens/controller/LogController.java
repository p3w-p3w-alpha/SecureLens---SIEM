package com.securelens.controller;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.securelens.dto.LogBatchRequest;
import com.securelens.dto.LogRequest;
import com.securelens.dto.LogResponse;
import com.securelens.service.LogService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/logs")
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;

    @PostMapping
    public ResponseEntity<LogResponse> ingest(@Valid @RequestBody LogRequest request) {
        LogResponse response = logService.ingest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/batch")
    public ResponseEntity<Map<String, Integer>> ingestBatch(@Valid @RequestBody LogBatchRequest request) {
        int count = logService.ingestBatch(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("count", count));
    }

    @GetMapping
    public ResponseEntity<Page<LogResponse>> findAll(
            @RequestParam(required = false) String sourceIp,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String userIdField,
            @RequestParam(required = false) Instant startDate,
            @RequestParam(required = false) Instant endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        Page<LogResponse> logs = logService.findAll(sourceIp, eventType, severity,
                userIdField, startDate, endDate, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LogResponse> findById(@PathVariable Long id) {
        LogResponse response = logService.findById(id);
        return ResponseEntity.ok(response);
    }
}
