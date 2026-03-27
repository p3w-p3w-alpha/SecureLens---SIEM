package com.securelens.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.securelens.model.IntelProvider;
import com.securelens.model.ThreatIntelCache;

public interface ThreatIntelCacheRepository extends JpaRepository<ThreatIntelCache, Long> {

    Optional<ThreatIntelCache> findByQueryValueAndProviderAndExpiresAtAfter(
            String queryValue, IntelProvider provider, Instant now);

    List<ThreatIntelCache> findByQueryValueAndExpiresAtAfter(String queryValue, Instant now);
}
