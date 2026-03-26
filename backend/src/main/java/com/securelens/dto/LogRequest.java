package com.securelens.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LogRequest {

    @NotNull(message = "Timestamp is required")
    private Instant timestamp;

    private String sourceIp;

    private String destinationIp;

    @NotBlank(message = "Event type is required")
    private String eventType;

    @NotBlank(message = "Severity is required")
    private String severity;

    private String userIdField;

    private String rawMessage;

    private String metadata;
}
