package com.securelens.dto;

import java.util.List;
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
public class DashboardStats {

    private long totalLogs24h;
    private long totalAlerts24h;
    private long criticalAlerts;
    private long openIncidents;
    private Map<String, Long> alertsBySeverity;
    private Map<String, Long> alertsByStatus;
    private Map<String, Long> alertsByRule;
    private List<SourceIpCount> topSourceIps;
    private List<AlertResponse> recentAlerts;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SourceIpCount {
        private String ip;
        private long count;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TrendPoint {
        private String hour;
        private long count;
    }
}
