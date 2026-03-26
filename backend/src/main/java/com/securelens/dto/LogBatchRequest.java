package com.securelens.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LogBatchRequest {

    @NotEmpty(message = "Logs list cannot be empty")
    @Valid
    private List<LogRequest> logs;
}
