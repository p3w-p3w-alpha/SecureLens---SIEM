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
public class AlertResponse {

    private Long id;
    private String ruleId;
    private String ruleName;
    private String severity;
    private String mitreTactic;
    private String mitreTechnique;
    private String sourceIp;
    private String userIdField;
    private String description;
    private String evidenceLogIds;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
    private String resolvedBy;
    private String aiTriageResult;
}
