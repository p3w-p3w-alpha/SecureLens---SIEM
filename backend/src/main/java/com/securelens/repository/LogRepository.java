package com.securelens.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.securelens.model.Log;

public interface LogRepository extends JpaRepository<Log, Long>, JpaSpecificationExecutor<Log> {

    List<Log> findByEventTypeAndTimestampAfter(String eventType, Instant after);

    List<Log> findByEventTypeInAndTimestampAfter(List<String> eventTypes, Instant after);
}
