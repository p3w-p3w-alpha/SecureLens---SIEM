package com.securelens.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "threat_intel_cache", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"queryValue", "provider"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThreatIntelCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QueryType queryType;

    @Column(nullable = false)
    private String queryValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IntelProvider provider;

    @Column(columnDefinition = "TEXT")
    private String responseData;

    private Integer riskScore;

    @Column(nullable = false)
    private Instant cachedAt;

    @Column(nullable = false)
    private Instant expiresAt;

    @PrePersist
    protected void onCreate() {
        this.cachedAt = Instant.now();
        this.expiresAt = this.cachedAt.plusSeconds(3600); // 1 hour TTL
    }
}
