package com.securelens.repository;

import java.time.Instant;

import org.springframework.data.jpa.domain.Specification;

import com.securelens.model.Log;
import com.securelens.model.Severity;

public class LogSpecification {

    private LogSpecification() {
    }

    public static Specification<Log> hasSourceIp(String ip) {
        return (root, query, cb) ->
                ip == null ? null : cb.equal(root.get("sourceIp"), ip);
    }

    public static Specification<Log> hasEventType(String type) {
        return (root, query, cb) ->
                type == null ? null : cb.equal(root.get("eventType"), type);
    }

    public static Specification<Log> hasSeverity(Severity severity) {
        return (root, query, cb) ->
                severity == null ? null : cb.equal(root.get("severity"), severity);
    }

    public static Specification<Log> hasUserIdField(String userId) {
        return (root, query, cb) ->
                userId == null ? null : cb.equal(root.get("userIdField"), userId);
    }

    public static Specification<Log> timestampAfter(Instant start) {
        return (root, query, cb) ->
                start == null ? null : cb.greaterThanOrEqualTo(root.get("timestamp"), start);
    }

    public static Specification<Log> timestampBefore(Instant end) {
        return (root, query, cb) ->
                end == null ? null : cb.lessThanOrEqualTo(root.get("timestamp"), end);
    }
}
