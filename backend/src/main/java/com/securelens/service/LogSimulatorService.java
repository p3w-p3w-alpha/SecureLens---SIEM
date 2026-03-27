package com.securelens.service;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;

import com.securelens.dto.LogBatchRequest;
import com.securelens.dto.LogRequest;
import com.securelens.dto.SimulatorRequest;
import com.securelens.dto.SimulatorResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LogSimulatorService {

    private final LogService logService;

    private static final String[] USERS = {"jsmith", "agarcia", "mbrown", "svc_backup", "admin"};
    private static final String[] INTERNAL_IPS = {
            "10.0.0.10", "10.0.0.25", "10.0.0.50", "10.0.0.100", "10.0.0.150",
            "10.0.1.10", "10.0.1.25", "10.0.1.50", "10.0.2.10", "10.0.2.25"
    };
    private static final String[] NORMAL_EVENTS = {"login_success", "file_access", "network_connection"};
    private static final String[] NORMAL_SEVERITIES = {"INFO", "INFO", "INFO", "LOW", "LOW"};

    public SimulatorResponse runSimulation(SimulatorRequest request) {
        List<LogRequest> allLogs = new ArrayList<>();
        Map<String, Integer> breakdown = new LinkedHashMap<>();

        for (String scenario : request.getScenarios()) {
            List<LogRequest> logs = switch (scenario.toUpperCase()) {
                case "NORMAL" -> generateNormalTraffic(request.getLogCount(), request.getTimeWindowMinutes());
                case "BRUTE_FORCE" -> generateBruteForce(request.getTimeWindowMinutes());
                case "IMPOSSIBLE_TRAVEL" -> generateImpossibleTravel(request.getTimeWindowMinutes());
                case "PRIVILEGE_ESCALATION" -> generatePrivilegeEscalation(request.getTimeWindowMinutes());
                case "DATA_EXFILTRATION" -> generateDataExfiltration(request.getTimeWindowMinutes());
                case "PORT_SCAN" -> generatePortScan(request.getTimeWindowMinutes());
                case "LATERAL_MOVEMENT" -> generateLateralMovement(request.getTimeWindowMinutes());
                case "MALWARE_BEACON" -> generateMalwareBeacon(request.getTimeWindowMinutes());
                case "OFF_HOURS" -> generateOffHoursAccess(request.getTimeWindowMinutes());
                default -> List.of();
            };
            allLogs.addAll(logs);
            breakdown.put(scenario.toUpperCase(), logs.size());
        }

        if (!allLogs.isEmpty()) {
            logService.ingestBatch(new LogBatchRequest(allLogs));
        }

        return SimulatorResponse.builder()
                .totalGenerated(allLogs.size())
                .breakdown(breakdown)
                .build();
    }

    // ── Normal Traffic ───────────────────────────────────────────────────

    public List<LogRequest> generateNormalTraffic(int count, int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant now = Instant.now();
        long windowSeconds = (long) timeWindowMinutes * 60;

        for (int i = 0; i < count; i++) {
            long offsetSeconds = ThreadLocalRandom.current().nextLong(windowSeconds);
            Instant ts = now.minusSeconds(offsetSeconds);
            String user = randomFrom(USERS);
            String srcIp = randomFrom(INTERNAL_IPS);
            String dstIp = "10.0.0." + ThreadLocalRandom.current().nextInt(1, 255);
            String eventType = randomFrom(NORMAL_EVENTS);
            String severity = randomFrom(NORMAL_SEVERITIES);

            logs.add(buildLog(ts, srcIp, dstIp, eventType, severity, user,
                    eventType + " event from " + user + " at " + srcIp, null));
        }
        return logs;
    }

    // ── Brute Force: ≥5 login_failed from same IP within 5 min ──────────

    public List<LogRequest> generateBruteForce(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant base = Instant.now().minusSeconds(Math.min(timeWindowMinutes, 10) * 60L);
        String attackerIp = "185.220.101.3";
        String[] targets = {"admin", "root", "jsmith", "agarcia", "svc_backup", "dbadmin", "operator"};

        // 7 failed attempts within 5 minutes
        for (int i = 0; i < 7; i++) {
            Instant ts = base.plusSeconds(i * 35L); // ~35s apart, all within ~4 min
            logs.add(buildLog(ts, attackerIp, "10.0.0.5", "login_failed", "MEDIUM",
                    targets[i],
                    "Failed login attempt from " + attackerIp + " for user " + targets[i] + " - invalid password",
                    "{\"attempts\":" + (i + 1) + ",\"country\":\"RU\"}"));
        }

        // Successful login after brute force
        Instant successTs = base.plusSeconds(260); // ~4.3 min after start
        logs.add(buildLog(successTs, attackerIp, "10.0.0.5", "login_success", "HIGH",
                "admin",
                "Successful login for admin from " + attackerIp + " after multiple failed attempts",
                "{\"method\":\"password\",\"country\":\"RU\",\"previousFailures\":7}"));

        return logs;
    }

    // ── Impossible Travel: same user, 2 countries within 30 min ─────────

    public List<LogRequest> generateImpossibleTravel(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant base = Instant.now().minusSeconds(Math.min(timeWindowMinutes, 25) * 60L);
        String user = "jsmith";

        logs.add(buildLog(base, "203.0.113.10", "10.0.0.5", "login_success", "INFO",
                user, "User " + user + " logged in from New York, US",
                "{\"country\":\"US\",\"city\":\"New York\",\"ip_geo\":\"203.0.113.10\"}"));

        // 15 minutes later, login from Germany
        logs.add(buildLog(base.plusSeconds(900), "91.198.174.1", "10.0.0.5", "login_success", "INFO",
                user, "User " + user + " logged in from Berlin, DE",
                "{\"country\":\"DE\",\"city\":\"Berlin\",\"ip_geo\":\"91.198.174.1\"}"));

        return logs;
    }

    // ── Privilege Escalation: ≥3 denied then granted, same user, 10 min ─

    public List<LogRequest> generatePrivilegeEscalation(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant base = Instant.now().minusSeconds(Math.min(timeWindowMinutes, 8) * 60L);
        String user = "mbrown";
        String srcIp = "10.0.1.45";

        // 4 permission_denied events
        String[] resources = {"/admin/config", "/admin/users", "/admin/secrets", "/admin/deploy"};
        for (int i = 0; i < 4; i++) {
            Instant ts = base.plusSeconds(i * 45L);
            logs.add(buildLog(ts, srcIp, "10.0.0.5", "permission_denied", "MEDIUM",
                    user, "Permission denied for " + user + " accessing " + resources[i],
                    "{\"resource\":\"" + resources[i] + "\",\"requiredRole\":\"ADMIN\"}"));
        }

        // Then permission_granted
        logs.add(buildLog(base.plusSeconds(200), srcIp, "10.0.0.5", "permission_granted", "HIGH",
                user, "Permission granted for " + user + " accessing /admin/config after role change",
                "{\"resource\":\"/admin/config\",\"newRole\":\"ADMIN\",\"previousRole\":\"ANALYST\"}"));

        return logs;
    }

    // ── Data Exfiltration: ≥10 data_transfer, >100MB total, 10 min ──────

    public List<LogRequest> generateDataExfiltration(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant base = Instant.now().minusSeconds(Math.min(timeWindowMinutes, 12) * 60L);
        String srcIp = "10.0.1.100";
        String externalDstIp = "198.51.100.7";

        for (int i = 0; i < 12; i++) {
            Instant ts = base.plusSeconds(i * 45L); // ~45s apart, 12 events within ~9 min
            long bytes = (8 + ThreadLocalRandom.current().nextInt(8)) * 1024L * 1024L; // 8-15 MB
            logs.add(buildLog(ts, srcIp, externalDstIp, "data_transfer", "MEDIUM",
                    "dbuser",
                    "Data transfer of " + (bytes / (1024 * 1024)) + "MB from " + srcIp + " to " + externalDstIp,
                    "{\"bytes\":" + bytes + ",\"protocol\":\"HTTPS\",\"destination\":\"" + externalDstIp + "\"}"));
        }

        return logs;
    }

    // ── Port Scan: ≥20 port_scan from same IP within 2 min ──────────────

    public List<LogRequest> generatePortScan(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant base = Instant.now().minusSeconds(Math.min(timeWindowMinutes, 5) * 60L);
        String scannerIp = "172.16.50.99";
        String targetIp = "10.0.0.1";
        int[] ports = {21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995,
                1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9200, 27017};

        for (int i = 0; i < 25; i++) {
            Instant ts = base.plusSeconds(i * 4L); // ~4s apart, 25 events within ~100s (<2 min)
            logs.add(buildLog(ts, scannerIp, targetIp, "port_scan", "MEDIUM",
                    "unknown",
                    "Port scan detected: " + scannerIp + " → " + targetIp + ":" + ports[i],
                    "{\"port\":" + ports[i] + ",\"protocol\":\"TCP\",\"scanType\":\"SYN\"}"));
        }

        return logs;
    }

    // ── Lateral Movement: same user, ≥5 distinct dest IPs within 10 min ─

    public List<LogRequest> generateLateralMovement(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant base = Instant.now().minusSeconds(Math.min(timeWindowMinutes, 12) * 60L);
        String user = "svc_backup";
        String srcIp = "10.0.1.10";
        String[] destIps = {"10.0.1.20", "10.0.1.30", "10.0.2.10", "10.0.2.20", "10.0.2.30", "10.0.3.10", "10.0.3.20"};

        for (int i = 0; i < 7; i++) {
            Instant ts = base.plusSeconds(i * 80L); // ~80s apart, 7 events within ~9.3 min
            logs.add(buildLog(ts, srcIp, destIps[i], "network_connection", "MEDIUM",
                    user,
                    "Connection from " + srcIp + " to " + destIps[i] + " by " + user,
                    "{\"destinationPort\":22,\"protocol\":\"SSH\"}"));
        }

        return logs;
    }

    // ── Malware Beacon: same src→dst, ≥10 events, regular ~60s interval ─

    public List<LogRequest> generateMalwareBeacon(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        Instant base = Instant.now().minusSeconds(Math.min(timeWindowMinutes, 15) * 60L);
        String infectedIp = "10.0.0.77";
        String c2Ip = "45.33.32.156";

        for (int i = 0; i < 12; i++) {
            // ~60 seconds apart with ±2s jitter
            long jitter = ThreadLocalRandom.current().nextLong(-2, 3);
            Instant ts = base.plusSeconds(i * 60L + jitter);
            logs.add(buildLog(ts, infectedIp, c2Ip, "network_connection", "LOW",
                    "SYSTEM",
                    "Outbound connection from " + infectedIp + " to " + c2Ip + ":443",
                    "{\"destinationPort\":443,\"bytesOut\":256,\"bytesIn\":128,\"protocol\":\"HTTPS\"}"));
        }

        return logs;
    }

    // ── Off-Hours Access: events between 00:00-05:00 UTC ────────────────

    public List<LogRequest> generateOffHoursAccess(int timeWindowMinutes) {
        List<LogRequest> logs = new ArrayList<>();
        // Find the most recent 00:00-05:00 UTC window
        ZonedDateTime nowUtc = ZonedDateTime.now(ZoneOffset.UTC);
        ZonedDateTime offHoursStart;
        if (nowUtc.toLocalTime().isBefore(LocalTime.of(5, 0))) {
            offHoursStart = nowUtc.with(LocalTime.of(0, 30));
        } else {
            offHoursStart = nowUtc.minusDays(1).with(LocalTime.of(1, 0));
        }

        String user = "agarcia";
        String srcIp = "10.0.0.50";

        logs.add(buildLog(offHoursStart.toInstant(), srcIp, "10.0.0.5",
                "login_success", "INFO", user,
                "User " + user + " logged in during off-hours (01:00 UTC)",
                "{\"hour\":1,\"dayOfWeek\":\"" + offHoursStart.getDayOfWeek() + "\"}"));

        logs.add(buildLog(offHoursStart.plusMinutes(15).toInstant(), srcIp, "10.0.0.5",
                "file_access", "LOW", user,
                "User " + user + " accessed /finance/quarterly-report.xlsx during off-hours",
                "{\"file\":\"/finance/quarterly-report.xlsx\",\"action\":\"read\",\"hour\":1}"));

        logs.add(buildLog(offHoursStart.plusMinutes(30).toInstant(), srcIp, "10.0.0.5",
                "file_access", "LOW", user,
                "User " + user + " accessed /hr/salary-data.csv during off-hours",
                "{\"file\":\"/hr/salary-data.csv\",\"action\":\"download\",\"hour\":1}"));

        logs.add(buildLog(offHoursStart.plusMinutes(45).toInstant(), srcIp, "10.0.0.5",
                "config_change", "MEDIUM", user,
                "User " + user + " modified firewall rules during off-hours",
                "{\"config\":\"firewall-rules\",\"action\":\"modify\",\"hour\":2}"));

        return logs;
    }

    // ── Helper ───────────────────────────────────────────────────────────

    private LogRequest buildLog(Instant timestamp, String sourceIp, String destinationIp,
                                String eventType, String severity, String userIdField,
                                String rawMessage, String metadata) {
        LogRequest log = new LogRequest();
        log.setTimestamp(timestamp);
        log.setSourceIp(sourceIp);
        log.setDestinationIp(destinationIp);
        log.setEventType(eventType);
        log.setSeverity(severity);
        log.setUserIdField(userIdField);
        log.setRawMessage(rawMessage);
        log.setMetadata(metadata);
        return log;
    }

    private String randomFrom(String[] arr) {
        return arr[ThreadLocalRandom.current().nextInt(arr.length)];
    }
}
