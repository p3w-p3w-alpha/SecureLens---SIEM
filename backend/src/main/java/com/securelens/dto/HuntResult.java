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
public class HuntResult {

    private String resultType;
    private List<LogResponse> logs;
    private List<GroupedResult> groupedResults;
    private long totalCount;
    private long executionTimeMs;
}
