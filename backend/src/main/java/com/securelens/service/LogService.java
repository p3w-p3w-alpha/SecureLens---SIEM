package com.securelens.service;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import com.securelens.dto.LogBatchRequest;
import com.securelens.dto.LogRequest;
import com.securelens.dto.LogResponse;
import com.securelens.exception.ResourceNotFoundException;
import com.securelens.model.Log;
import com.securelens.model.Severity;
import com.securelens.repository.LogRepository;
import com.securelens.repository.LogSpecification;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LogService {

    private final LogRepository logRepository;

    public LogResponse ingest(LogRequest request) {
        Log log = toEntity(request);
        log = logRepository.save(log);
        return toResponse(log);
    }

    public int ingestBatch(LogBatchRequest request) {
        var entities = request.getLogs().stream()
                .map(this::toEntity)
                .toList();
        logRepository.saveAll(entities);
        return entities.size();
    }

    public Page<LogResponse> findAll(String sourceIp, String eventType, String severity,
                                     String userIdField, Instant startDate, Instant endDate,
                                     Pageable pageable) {
        Severity severityEnum = severity != null ? Severity.valueOf(severity) : null;

        Specification<Log> spec = Specification.where(LogSpecification.hasSourceIp(sourceIp))
                .and(LogSpecification.hasEventType(eventType))
                .and(LogSpecification.hasSeverity(severityEnum))
                .and(LogSpecification.hasUserIdField(userIdField))
                .and(LogSpecification.timestampAfter(startDate))
                .and(LogSpecification.timestampBefore(endDate));

        return logRepository.findAll(spec, pageable).map(this::toResponse);
    }

    public LogResponse findById(Long id) {
        Log log = logRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Log not found with id: " + id));
        return toResponse(log);
    }

    private Log toEntity(LogRequest request) {
        return Log.builder()
                .timestamp(request.getTimestamp())
                .sourceIp(request.getSourceIp())
                .destinationIp(request.getDestinationIp())
                .eventType(request.getEventType())
                .severity(Severity.valueOf(request.getSeverity()))
                .userIdField(request.getUserIdField())
                .rawMessage(request.getRawMessage())
                .metadata(request.getMetadata())
                .build();
    }

    private LogResponse toResponse(Log log) {
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
