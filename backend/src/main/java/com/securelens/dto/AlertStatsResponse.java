package com.securelens.dto;

import java.util.Map;

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
public class AlertStatsResponse {

    private Map<String, Long> bySeverity;
    private Map<String, Long> byStatus;
    private Map<String, Long> byRule;
    private long total24h;
}
