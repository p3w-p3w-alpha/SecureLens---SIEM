package com.securelens.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.securelens.model.Log;

public interface LogRepository extends JpaRepository<Log, Long>, JpaSpecificationExecutor<Log> {
}
