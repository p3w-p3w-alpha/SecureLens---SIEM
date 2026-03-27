package com.securelens.detection;

import java.util.List;

import com.securelens.model.Alert;

public interface DetectionRule {

    String getRuleId();

    String getRuleName();

    List<Alert> evaluate();
}
