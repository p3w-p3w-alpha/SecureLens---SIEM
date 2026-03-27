package com.securelens.dto;

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
public class ThreatIntelResult {

    private String provider;
    private int riskScore;
    private String summary;
    private String rawData;
    private boolean available;
}
