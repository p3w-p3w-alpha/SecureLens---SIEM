package com.securelens.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.securelens.model.SavedHunt;

public interface SavedHuntRepository extends JpaRepository<SavedHunt, Long> {
}
