package com.securelens.dto;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogResponse {

    private Long id;
    private Instant timestamp;
    private String sourceIp;
    private String destinationIp;
    private String eventType;
    private String severity;
    private String userIdField;
    private String rawMessage;
    private String metadata;
    private Instant ingestedAt;
}
