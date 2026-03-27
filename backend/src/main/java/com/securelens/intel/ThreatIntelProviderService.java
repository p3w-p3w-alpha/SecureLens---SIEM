package com.securelens.intel;

import com.securelens.dto.ThreatIntelResult;
import com.securelens.model.IntelProvider;
import com.securelens.model.QueryType;

public interface ThreatIntelProviderService {

    IntelProvider getProviderName();

    boolean supports(QueryType type);

    ThreatIntelResult lookup(String query, QueryType type);
}
