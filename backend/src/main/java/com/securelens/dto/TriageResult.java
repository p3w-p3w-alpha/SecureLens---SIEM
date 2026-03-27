package com.securelens.dto;

import java.util.List;

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
public class TriageResult {

    private String severityAssessment;
    private String attackContext;
    private List<String> recommendedActions;
    private String falsePositiveLikelihood;
    private String reasoning;
    private List<String> relatedIndicators;
}
