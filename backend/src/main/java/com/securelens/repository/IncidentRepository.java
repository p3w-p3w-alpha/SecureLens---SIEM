package com.securelens.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.securelens.model.Incident;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
}
