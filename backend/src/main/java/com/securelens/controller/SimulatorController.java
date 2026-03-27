package com.securelens.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.securelens.dto.SimulatorRequest;
import com.securelens.dto.SimulatorResponse;
import com.securelens.service.LogSimulatorService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/simulator")
@RequiredArgsConstructor
public class SimulatorController {

    private final LogSimulatorService simulatorService;

    @PostMapping("/run")
    public ResponseEntity<SimulatorResponse> runSimulation(@Valid @RequestBody SimulatorRequest request) {
        SimulatorResponse response = simulatorService.runSimulation(request);
        return ResponseEntity.ok(response);
    }
}
