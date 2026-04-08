package com.securelens.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.securelens.model.AuditTrail;
import com.securelens.repository.AuditTrailRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditTrailRepository auditTrailRepository;

    public void log(String action, String entityType, String entityId, String userId, String details) {
        try {
            auditTrailRepository.save(AuditTrail.builder()
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .userId(userId)
                    .details(details)
                    .build());
        } catch (Exception e) {
            log.warn("Audit logging failed: {}", e.getMessage());
        }
    }

    public List<AuditTrail> getRecentActivity(int limit) {
        return auditTrailRepository.findTop50ByOrderByTimestampDesc()
                .stream().limit(limit).toList();
    }

    public List<AuditTrail> getEntityHistory(String entityType, String entityId) {
        return auditTrailRepository.findByEntityTypeAndEntityId(entityType, entityId);
    }
}
