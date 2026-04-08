package com.securelens.dto;

import java.time.Instant;
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
public class IncidentResponse {

    private Long id;
    private String title;
    private String description;
    private String severity;
    private String status;
    private List<Long> alertIds;
    private String createdBy;
    private Instant createdAt;
    private Instant updatedAt;
    private List<TimelineEntry> timeline;
    private boolean reportGenerated;
    private List<AlertResponse> linkedAlerts;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TimelineEntry {
        private String timestamp;
        private String note;
        private String author;
    }
}
