package com.securelens.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "logs", indexes = {
        @Index(name = "idx_logs_timestamp", columnList = "timestamp"),
        @Index(name = "idx_logs_source_ip", columnList = "sourceIp"),
        @Index(name = "idx_logs_event_type", columnList = "eventType")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Log {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant timestamp;

    private String sourceIp;

    private String destinationIp;

    @Column(nullable = false)
    private String eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    private String userIdField;

    @Column(columnDefinition = "TEXT")
    private String rawMessage;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(nullable = false, updatable = false)
    private Instant ingestedAt;

    @PrePersist
    protected void onPersist() {
        this.ingestedAt = Instant.now();
    }
}
