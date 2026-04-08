package com.securelens.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.securelens.dto.AlertResponse;
import com.securelens.dto.IncidentRequest;
import com.securelens.dto.IncidentResponse;
import com.securelens.dto.IncidentResponse.TimelineEntry;
import com.securelens.exception.ResourceNotFoundException;
import com.securelens.model.Alert;
import com.securelens.model.Incident;
import com.securelens.model.IncidentStatus;
import com.securelens.model.Severity;
import com.securelens.model.ThreatIntelCache;
import com.securelens.repository.AlertRepository;
import com.securelens.repository.IncidentRepository;
import com.securelens.repository.ThreatIntelCacheRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final AlertRepository alertRepository;
    private final ThreatIntelCacheRepository intelCacheRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public IncidentResponse create(IncidentRequest req, String username) {
        String alertIdsJson = req.getAlertIds() != null
                ? req.getAlertIds().stream().map(String::valueOf).collect(Collectors.joining(",", "[", "]"))
                : "[]";

        Incident incident = Incident.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .severity(Severity.valueOf(req.getSeverity()))
                .alertIds(alertIdsJson)
                .createdBy(username)
                .build();

        incident = incidentRepository.save(incident);
        try { auditService.log("INCIDENT_CREATED", "INCIDENT", String.valueOf(incident.getId()), username, "Incident created: " + req.getTitle()); } catch (Exception ignored) {}
        return toResponse(incident, false);
    }

    public List<IncidentResponse> findAll() {
        return incidentRepository.findAll(Sort.by("createdAt").descending())
                .stream().map(i -> toResponse(i, false)).toList();
    }

    public IncidentResponse findById(Long id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + id));
        return toResponse(incident, true);
    }

    public IncidentResponse updateStatus(Long id, IncidentStatus status) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + id));
        incident.setStatus(status);
        incident = incidentRepository.save(incident);
        return toResponse(incident, false);
    }

    public IncidentResponse addTimelineEntry(Long id, String note, String username) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + id));

        List<TimelineEntry> timeline = parseTimeline(incident.getTimeline());
        timeline.add(TimelineEntry.builder()
                .timestamp(Instant.now().toString())
                .note(note)
                .author(username)
                .build());

        try {
            incident.setTimeline(objectMapper.writeValueAsString(timeline));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize timeline");
        }

        incident = incidentRepository.save(incident);
        return toResponse(incident, false);
    }

    public byte[] generateReport(Long id) {
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + id));

        List<Alert> alerts = parseAlertIds(incident.getAlertIds()).stream()
                .map(alertRepository::findById)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .toList();

        List<TimelineEntry> timeline = parseTimeline(incident.getTimeline());

        byte[] pdf = buildPdf(incident, alerts, timeline);

        incident.setReportGenerated(true);
        incidentRepository.save(incident);

        return pdf;
    }

    private byte[] buildPdf(Incident incident, List<Alert> alerts, List<TimelineEntry> timeline) {
        try (PDDocument doc = new PDDocument()) {
            PDType1Font fontBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font fontRegular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            float margin = 50;
            float pageWidth = PDRectangle.A4.getWidth();

            // Page 1 — Cover
            PDPage coverPage = new PDPage(PDRectangle.A4);
            doc.addPage(coverPage);
            try (PDPageContentStream cs = new PDPageContentStream(doc, coverPage)) {
                float y = 700;
                cs.beginText();
                cs.setFont(fontBold, 24);
                cs.newLineAtOffset(margin, y);
                cs.showText("SECURELENS INCIDENT REPORT");
                cs.endText();

                y -= 60;
                drawText(cs, fontBold, 16, margin, y, "Incident: " + incident.getTitle());
                y -= 30;
                drawText(cs, fontRegular, 12, margin, y, "ID: INC-" + incident.getId());
                y -= 20;
                drawText(cs, fontRegular, 12, margin, y, "Severity: " + incident.getSeverity().name());
                y -= 20;
                drawText(cs, fontRegular, 12, margin, y, "Status: " + incident.getStatus().name());
                y -= 20;
                drawText(cs, fontRegular, 12, margin, y, "Created by: " + incident.getCreatedBy());
                y -= 20;
                drawText(cs, fontRegular, 12, margin, y, "Created: " + incident.getCreatedAt().toString());
                y -= 20;
                drawText(cs, fontRegular, 12, margin, y, "Report generated: " + Instant.now().toString());
                y -= 40;
                drawText(cs, fontRegular, 10, margin, y, "Linked Alerts: " + alerts.size());
                y -= 15;
                drawText(cs, fontRegular, 10, margin, y, "Timeline Entries: " + timeline.size());
            }

            // Page 2+ — Details
            PDPage detailPage = new PDPage(PDRectangle.A4);
            doc.addPage(detailPage);
            float y = 780;
            PDPageContentStream cs = new PDPageContentStream(doc, detailPage);

            // Summary
            cs = drawSection(cs, doc, fontBold, fontRegular, margin, y, "INCIDENT SUMMARY");
            y -= 25;
            String desc = incident.getDescription() != null ? incident.getDescription() : "No description";
            for (String line : wrapText(desc, 90)) {
                if (y < 60) { cs.close(); detailPage = new PDPage(PDRectangle.A4); doc.addPage(detailPage); cs = new PDPageContentStream(doc, detailPage); y = 780; }
                drawText(cs, fontRegular, 10, margin, y, line);
                y -= 15;
            }

            // Timeline
            y -= 15;
            if (y < 100) { cs.close(); detailPage = new PDPage(PDRectangle.A4); doc.addPage(detailPage); cs = new PDPageContentStream(doc, detailPage); y = 780; }
            cs = drawSection(cs, doc, fontBold, fontRegular, margin, y, "TIMELINE");
            y -= 25;
            for (TimelineEntry entry : timeline) {
                if (y < 60) { cs.close(); detailPage = new PDPage(PDRectangle.A4); doc.addPage(detailPage); cs = new PDPageContentStream(doc, detailPage); y = 780; }
                String ts = entry.getTimestamp() != null ? entry.getTimestamp().substring(0, Math.min(19, entry.getTimestamp().length())) : "";
                drawText(cs, fontBold, 9, margin, y, ts + " [" + entry.getAuthor() + "]");
                y -= 14;
                drawText(cs, fontRegular, 9, margin + 10, y, entry.getNote());
                y -= 18;
            }

            // Linked Alerts
            y -= 15;
            if (y < 100) { cs.close(); detailPage = new PDPage(PDRectangle.A4); doc.addPage(detailPage); cs = new PDPageContentStream(doc, detailPage); y = 780; }
            cs = drawSection(cs, doc, fontBold, fontRegular, margin, y, "LINKED ALERTS (" + alerts.size() + ")");
            y -= 25;
            for (Alert alert : alerts) {
                if (y < 100) { cs.close(); detailPage = new PDPage(PDRectangle.A4); doc.addPage(detailPage); cs = new PDPageContentStream(doc, detailPage); y = 780; }
                drawText(cs, fontBold, 10, margin, y, alert.getRuleId() + " — " + alert.getRuleName() + " [" + alert.getSeverity() + "]");
                y -= 15;
                drawText(cs, fontRegular, 9, margin + 10, y, "MITRE: " + alert.getMitreTactic() + " / " + alert.getMitreTechnique());
                y -= 13;
                drawText(cs, fontRegular, 9, margin + 10, y, "Source: " + (alert.getSourceIp() != null ? alert.getSourceIp() : "N/A")
                        + " | User: " + (alert.getUserIdField() != null ? alert.getUserIdField() : "N/A"));
                y -= 13;
                String alertDesc = alert.getDescription() != null ? alert.getDescription() : "";
                if (alertDesc.length() > 120) alertDesc = alertDesc.substring(0, 120) + "...";
                drawText(cs, fontRegular, 9, margin + 10, y, alertDesc);
                y -= 20;
            }

            // Threat Intel
            y -= 15;
            if (y < 100) { cs.close(); detailPage = new PDPage(PDRectangle.A4); doc.addPage(detailPage); cs = new PDPageContentStream(doc, detailPage); y = 780; }
            cs = drawSection(cs, doc, fontBold, fontRegular, margin, y, "THREAT INTELLIGENCE");
            y -= 25;
            for (Alert alert : alerts) {
                if (alert.getSourceIp() == null) continue;
                List<ThreatIntelCache> cached = intelCacheRepository.findByQueryValueAndExpiresAtAfter(
                        alert.getSourceIp(), Instant.now());
                if (cached.isEmpty()) continue;
                if (y < 80) { cs.close(); detailPage = new PDPage(PDRectangle.A4); doc.addPage(detailPage); cs = new PDPageContentStream(doc, detailPage); y = 780; }
                drawText(cs, fontBold, 9, margin, y, "IP: " + alert.getSourceIp());
                y -= 14;
                for (ThreatIntelCache c : cached) {
                    drawText(cs, fontRegular, 9, margin + 10, y,
                            c.getProvider().name() + ": " + c.getRiskScore() + "/100");
                    y -= 13;
                }
                y -= 8;
            }

            cs.close();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage());
        }
    }

    private void drawText(PDPageContentStream cs, PDType1Font font, float size, float x, float y, String text) throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(text != null ? text : "");
        cs.endText();
    }

    private PDPageContentStream drawSection(PDPageContentStream cs, PDDocument doc, PDType1Font bold, PDType1Font regular, float margin, float y, String title) throws IOException {
        drawText(cs, bold, 13, margin, y, title);
        cs.setLineWidth(0.5f);
        cs.moveTo(margin, y - 3);
        cs.lineTo(550, y - 3);
        cs.stroke();
        return cs;
    }

    private List<String> wrapText(String text, int maxChars) {
        List<String> lines = new ArrayList<>();
        while (text.length() > maxChars) {
            int breakAt = text.lastIndexOf(' ', maxChars);
            if (breakAt <= 0) breakAt = maxChars;
            lines.add(text.substring(0, breakAt));
            text = text.substring(breakAt).trim();
        }
        if (!text.isEmpty()) lines.add(text);
        return lines;
    }

    private IncidentResponse toResponse(Incident incident, boolean includeAlerts) {
        List<Long> alertIdList = parseAlertIds(incident.getAlertIds());
        List<TimelineEntry> timeline = parseTimeline(incident.getTimeline());
        List<AlertResponse> linkedAlerts = List.of();

        if (includeAlerts && !alertIdList.isEmpty()) {
            linkedAlerts = alertRepository.findAllById(alertIdList).stream()
                    .map(a -> AlertResponse.builder()
                            .id(a.getId())
                            .ruleId(a.getRuleId())
                            .ruleName(a.getRuleName())
                            .severity(a.getSeverity().name())
                            .mitreTactic(a.getMitreTactic())
                            .mitreTechnique(a.getMitreTechnique())
                            .sourceIp(a.getSourceIp())
                            .userIdField(a.getUserIdField())
                            .status(a.getStatus().name())
                            .description(a.getDescription())
                            .createdAt(a.getCreatedAt())
                            .build())
                    .toList();
        }

        return IncidentResponse.builder()
                .id(incident.getId())
                .title(incident.getTitle())
                .description(incident.getDescription())
                .severity(incident.getSeverity().name())
                .status(incident.getStatus().name())
                .alertIds(alertIdList)
                .createdBy(incident.getCreatedBy())
                .createdAt(incident.getCreatedAt())
                .updatedAt(incident.getUpdatedAt())
                .timeline(timeline)
                .reportGenerated(incident.isReportGenerated())
                .linkedAlerts(linkedAlerts)
                .build();
    }

    private List<Long> parseAlertIds(String json) {
        if (json == null || json.isEmpty()) return List.of();
        String cleaned = json.replaceAll("[\\[\\]\\s]", "");
        if (cleaned.isEmpty()) return List.of();
        return Arrays.stream(cleaned.split(",")).map(Long::valueOf).toList();
    }

    private List<TimelineEntry> parseTimeline(String json) {
        if (json == null || json.isEmpty()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }
}
