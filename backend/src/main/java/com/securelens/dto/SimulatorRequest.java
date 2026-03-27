package com.securelens.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SimulatorRequest {

    @NotEmpty(message = "At least one scenario is required")
    private List<String> scenarios;

    private int logCount = 50;

    private int timeWindowMinutes = 30;
}
