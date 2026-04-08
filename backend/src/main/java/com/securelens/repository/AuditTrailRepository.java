package com.securelens.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.securelens.model.AuditTrail;

public interface AuditTrailRepository extends JpaRepository<AuditTrail, Long> {

    List<AuditTrail> findTop50ByOrderByTimestampDesc();

    List<AuditTrail> findByEntityTypeAndEntityId(String entityType, String entityId);
}
