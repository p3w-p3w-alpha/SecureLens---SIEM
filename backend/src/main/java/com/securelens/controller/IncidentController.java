package com.securelens.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securelens.dto.IncidentRequest;
import com.securelens.dto.IncidentResponse;
import com.securelens.model.IncidentStatus;
import com.securelens.service.IncidentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    @PostMapping
    public ResponseEntity<IncidentResponse> create(@Valid @RequestBody IncidentRequest request) {
        IncidentResponse response = incidentService.create(request, "testanalyst");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<IncidentResponse>> findAll() {
        return ResponseEntity.ok(incidentService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncidentResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(incidentService.findById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<IncidentResponse> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        IncidentStatus status = IncidentStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(incidentService.updateStatus(id, status));
    }

    @PostMapping("/{id}/timeline")
    public ResponseEntity<IncidentResponse> addTimeline(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(incidentService.addTimelineEntry(id, body.get("note"), "testanalyst"));
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<byte[]> generateReport(@PathVariable Long id) {
        byte[] pdf = incidentService.generateReport(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "incident-" + id + "-report.pdf");
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }
}
