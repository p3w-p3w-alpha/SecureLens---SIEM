package com.securelens.repository;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.securelens.model.Alert;

public interface AlertRepository extends JpaRepository<Alert, Long>, JpaSpecificationExecutor<Alert> {

    boolean existsByRuleIdAndSourceIpAndCreatedAtAfter(String ruleId, String sourceIp, Instant after);

    boolean existsByRuleIdAndUserIdFieldAndCreatedAtAfter(String ruleId, String userIdField, Instant after);
}
