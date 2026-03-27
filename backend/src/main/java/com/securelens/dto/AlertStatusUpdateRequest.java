package com.securelens.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AlertStatusUpdateRequest {

    @NotBlank(message = "Status is required")
    private String status;

    private String resolvedBy;
}
