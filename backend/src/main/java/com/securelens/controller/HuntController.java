package com.securelens.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securelens.dto.AlertResponse;
import com.securelens.dto.HuntPromoteRequest;
import com.securelens.dto.HuntQuery;
import com.securelens.dto.HuntResult;
import com.securelens.model.SavedHunt;
import com.securelens.service.HuntService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/hunts")
@RequiredArgsConstructor
public class HuntController {

    private final HuntService huntService;

    @PostMapping("/execute")
    public ResponseEntity<HuntResult> execute(@RequestBody HuntQuery query) {
        return ResponseEntity.ok(huntService.executeHunt(query));
    }

    @PostMapping("/save")
    public ResponseEntity<SavedHunt> save(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String description = (String) body.get("description");
        HuntQuery query = new com.fasterxml.jackson.databind.ObjectMapper().convertValue(body.get("query"), HuntQuery.class);
        String createdBy = (String) body.getOrDefault("createdBy", "analyst");
        SavedHunt saved = huntService.saveHunt(name, description, query, createdBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<SavedHunt>> listSaved() {
        return ResponseEntity.ok(huntService.getSavedHunts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SavedHunt> getSaved(@PathVariable Long id) {
        return ResponseEntity.ok(huntService.getSavedHunt(id));
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<HuntResult> runSaved(@PathVariable Long id) {
        return ResponseEntity.ok(huntService.runSavedHunt(id));
    }

    @PostMapping("/promote")
    public ResponseEntity<AlertResponse> promote(@Valid @RequestBody HuntPromoteRequest request) {
        AlertResponse response = huntService.promoteToAlert(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
