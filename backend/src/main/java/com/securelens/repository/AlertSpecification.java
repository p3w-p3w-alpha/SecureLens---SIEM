package com.securelens.repository;

import java.time.Instant;

import org.springframework.data.jpa.domain.Specification;

import com.securelens.model.Alert;
import com.securelens.model.AlertStatus;
import com.securelens.model.Severity;

public class AlertSpecification {

    private AlertSpecification() {
    }

    public static Specification<Alert> hasSeverity(Severity severity) {
        return (root, query, cb) ->
                severity == null ? null : cb.equal(root.get("severity"), severity);
    }

    public static Specification<Alert> hasStatus(AlertStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Alert> hasRuleId(String ruleId) {
        return (root, query, cb) ->
                ruleId == null ? null : cb.equal(root.get("ruleId"), ruleId);
    }

    public static Specification<Alert> hasSourceIp(String sourceIp) {
        return (root, query, cb) ->
                sourceIp == null ? null : cb.equal(root.get("sourceIp"), sourceIp);
    }

    public static Specification<Alert> createdAfter(Instant start) {
        return (root, query, cb) ->
                start == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), start);
    }

    public static Specification<Alert> createdBefore(Instant end) {
        return (root, query, cb) ->
                end == null ? null : cb.lessThanOrEqualTo(root.get("createdAt"), end);
    }
}
