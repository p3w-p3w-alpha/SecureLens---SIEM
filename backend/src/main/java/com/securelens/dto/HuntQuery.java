package com.securelens.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HuntQuery {

    private List<HuntCondition> conditions;
    private HuntTimeRange timeRange;
    private String groupBy;
    private Integer threshold;
}
