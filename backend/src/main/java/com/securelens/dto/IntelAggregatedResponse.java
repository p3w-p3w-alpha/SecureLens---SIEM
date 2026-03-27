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
public class IntelAggregatedResponse {

    private int overallRiskScore;
    private List<ThreatIntelResult> providers;
}
