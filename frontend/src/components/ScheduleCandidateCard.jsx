import React, { useMemo, useState, startTransition } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import {
  CalendarViewDay,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  FilterAltOff,
  Groups,
  Search,
  Star,
  TableChart,
  ThumbDownAltOutlined,
  ThumbUpAltOutlined,
  WarningAmber,
} from "@mui/icons-material";
import { useLanguage } from "../context/LanguageContext";
import { NAVY } from "../styles/dashboardUi";
import {
  buildComparisonInsight,
  getCandidateStats,
} from "../utils/scheduleComparison";

function buildViolationRows(violations, assignments, t) {
  const byProject = Object.fromEntries((assignments || []).map((a) => [a.projectId, a]));

  return (violations || []).map((v, idx) => {
    const assignment = byProject[v.projectId];
    const typeLabel = t(
      `scheduling.generate.candidate.violationTypes.${v.type}`,
      v.type || "unknown",
    );
    return {
      key: `${v.projectId}-${v.type}-${idx}`,
      projectId: v.projectId,
      projectTitle: assignment?.projectTitle || `#${v.projectId}`,
      typeLabel,
      severity: v.severity || "hard",
      details: v.details || "",
      day: assignment?.formattedDate || assignment?.scheduledDay || "—",
      time: assignment?.scheduledTime || "—",
      room: assignment?.roomName || "—",
    };
  });
}

function memberIdsOf(assignment) {
  return (assignment.committeeMembers || []).map((m) => Number(m.userId ?? m.id));
}

/** Compact row list — click one to inspect. */
export function ScheduleCandidatePicker({
  candidates,
  selectedRank,
  onSelect,
  getRankLabel,
}) {
  const { t } = useLanguage();

  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: `repeat(${Math.min(candidates.length, 3)}, 1fr)` },
          gap: 1.25,
        }}
      >
        {candidates.map((candidate) => {
          const stats = getCandidateStats(candidate);
          const insight = buildComparisonInsight(candidate, candidates, t);
          const selected = selectedRank === candidate.rank;
          const isBest = candidate.rank === 1;

          return (
            <Paper
              key={candidate.rank}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(candidate.rank)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(candidate.rank);
                }
              }}
              elevation={0}
              sx={{
                textAlign: "start",
                cursor: "pointer",
                borderRadius: 2.5,
                overflow: "hidden",
                border: "2px solid",
                borderColor: selected ? NAVY : "divider",
                bgcolor: "#fff",
                outline: "none",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "border-color .15s ease",
                "&:hover": {
                  borderColor: NAVY,
                },
                "&:focus-visible": {
                  boxShadow: `0 0 0 3px ${NAVY}33`,
                },
              }}
            >
              <Box
                sx={{
                  px: 1.75,
                  py: 1.25,
                  bgcolor: selected || isBest ? NAVY : "#111827",
                  color: "#fff",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {isBest && <Star sx={{ fontSize: 18 }} />}
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                      {getRankLabel(candidate.rank)}
                    </Typography>
                  </Stack>
                  <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>
                    {stats.score.toFixed(0)}
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ px: 1.75, py: 1.5, bgcolor: "#fff", flex: 1 }}>
                <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mb: 1 }}>
                  <Chip
                    size="small"
                    color={stats.clean ? "success" : "warning"}
                    label={
                      stats.clean
                        ? t("scheduling.generate.candidate.noHardViolations")
                        : t("scheduling.generate.candidate.hardViolations", {
                            count: stats.hard,
                          })
                    }
                    sx={{ fontWeight: 800 }}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={t("scheduling.generate.candidate.sessionsCount", {
                      count: stats.sessions,
                    })}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  {insight.verdict === "best" ? (
                    <ThumbUpAltOutlined fontSize="small" color="success" />
                  ) : (
                    <ThumbDownAltOutlined fontSize="small" color="warning" />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                    {insight.points[0]}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
}

function WorkloadPanel({ workload, t, activeDoctorId, onSelectDoctor }) {
  const [q, setQ] = useState("");
  const maxLoad = Math.max(1, ...(workload || []).map((w) => Number(w.totalAssignments) || 0));
  const avg =
    workload?.length > 0
      ? workload.reduce((s, w) => s + (Number(w.totalAssignments) || 0), 0) / workload.length
      : 0;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (workload || []).filter((w) => {
      if (!needle) return true;
      return String(w.name || "").toLowerCase().includes(needle);
    });
  }, [workload, q]);

  if (!workload?.length) {
    return (
      <Alert severity="info">{t("scheduling.generate.candidate.workloadEmpty")}</Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Typography variant="body2" color="text.secondary">
          {t("scheduling.generate.candidate.workloadAvg", {
            avg: avg.toFixed(1),
            max: maxLoad,
          })}
        </Typography>
        <TextField
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("scheduling.generate.candidate.workloadSearch")}
          sx={{ minWidth: { sm: 220 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 1.25,
        }}
      >
        {rows.map((w) => {
          const load = Number(w.totalAssignments) || 0;
          const pct = Math.round((load / maxLoad) * 100);
          const selected = Number(activeDoctorId) === Number(w.userId);
          const idle = load === 0;

          return (
            <Paper
              key={w.userId || w.name}
              variant="outlined"
              onClick={() => onSelectDoctor?.(w)}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                borderColor: selected ? NAVY : "divider",
                bgcolor: selected ? `${NAVY}08` : "#fff",
                "&:hover": { borderColor: NAVY },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    fontWeight: 800,
                    fontSize: 13,
                    bgcolor: idle ? "action.hover" : NAVY,
                    color: idle ? "text.secondary" : "#fff",
                  }}
                >
                  {String(w.name || "?").slice(0, 1)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                    {w.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {idle
                      ? t("scheduling.generate.candidate.workloadIdle")
                      : t("scheduling.generate.candidate.workloadClickFilter")}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  color={pct >= 85 ? "warning" : "default"}
                  variant="outlined"
                  label={t("scheduling.generate.candidate.workloadSessions", { count: load })}
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={idle ? 0 : pct}
                sx={{
                  height: 7,
                  borderRadius: 99,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 99,
                    bgcolor: pct >= 85 ? "warning.main" : NAVY,
                  },
                }}
              />
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
}

function SessionDetail({ assignment, violations, t }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2, my: 0.75 }}>
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {t("scheduling.generate.candidate.colSupervisor")}:{" "}
          <strong>{assignment.supervisorName || "—"}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {t("scheduling.generate.candidate.colCommittee")}:{" "}
          <strong>
            {assignment.committeeName ? `${assignment.committeeName} — ` : ""}
            {(assignment.committeeMembers || []).map((m) => m.name).join(" · ") || "—"}
          </strong>
        </Typography>
        {violations?.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
            {violations.map((v) => (
              <Chip
                key={v.key}
                size="small"
                color={v.severity === "hard" ? "warning" : "default"}
                icon={<WarningAmber />}
                label={v.typeLabel}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function DayBoard({ rows, violatedIds, violationsByProject, expandedId, setExpandedId, t }) {
  const groups = useMemo(() => {
    const map = new Map();
    rows.forEach((a) => {
      const key = a.scheduledDate || a.formattedDate || a.scheduledDay || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });

    return Array.from(map.entries())
      .map(([key, sessions]) => {
        const label =
          sessions[0]?.formattedDate ||
          sessions[0]?.scheduledDay ||
          key;
        const sorted = [...sessions].sort((a, b) =>
          String(a.scheduledTime || "").localeCompare(String(b.scheduledTime || "")),
        );
        return [key, label, sorted];
      })
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  }, [rows]);

  const expanded = useMemo(
    () => rows.find((a) => a.projectId === expandedId) || null,
    [rows, expandedId],
  );

  if (rows.length === 0) {
    return (
      <Alert severity="info">{t("scheduling.generate.candidate.noRows")}</Alert>
    );
  }

  return (
    <>
      <Stack spacing={2}>
        {groups.map(([dayKey, dayLabel, sessions]) => (
          <Box key={dayKey}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: NAVY,
                }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                {dayLabel}
              </Typography>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
                gap: 1.25,
                alignItems: "start",
                ps: { xs: 0, sm: 1.5 },
                borderInlineStart: { sm: "2px solid #E5E7EB" },
              }}
            >
              {sessions.map((a) => {
                const flagged = violatedIds.has(a.projectId);
                const open = expandedId === a.projectId;
                return (
                  <Paper
                    key={a.projectId}
                    variant="outlined"
                    onClick={() => setExpandedId(a.projectId)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      bgcolor: "#fff",
                      borderColor: flagged ? "warning.main" : open ? NAVY : "divider",
                      alignSelf: "start",
                      "&:hover": { borderColor: NAVY },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
                          {a.projectTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {a.supervisorName}
                        </Typography>
                      </Box>
                      {flagged && <WarningAmber fontSize="small" color="warning" />}
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mt: 1 }}>
                      {a.phaseName && (
                        <Chip
                          size="small"
                          color="secondary"
                          variant="outlined"
                          label={a.phaseName}
                          sx={{ fontWeight: 800 }}
                        />
                      )}
                      <Chip size="small" label={a.scheduledTime || "—"} sx={{ fontWeight: 800 }} />
                      <Chip size="small" variant="outlined" label={a.roomName || "—"} />
                    </Stack>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        ))}
      </Stack>

      <Dialog
        open={Boolean(expanded)}
        onClose={() => setExpandedId(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          {expanded?.projectTitle || t("scheduling.generate.candidate.sessionDetails")}
        </DialogTitle>
        <DialogContent dividers>
          {expanded && (
            <Stack spacing={1.5}>
              {expanded.phaseName && (
                <Chip
                  size="small"
                  color="secondary"
                  variant="outlined"
                  label={expanded.phaseName}
                  sx={{ fontWeight: 800, alignSelf: "flex-start" }}
                />
              )}
              <Typography variant="body2" color="text.secondary">
                {expanded.formattedDate || expanded.scheduledDay} · {expanded.scheduledTime || "—"} ·{" "}
                {expanded.roomName || "—"}
              </Typography>
              <SessionDetail
                assignment={expanded}
                violations={violationsByProject.get(expanded.projectId) || []}
                t={t}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpandedId(null)} sx={{ fontWeight: 800 }}>
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** Detail view for the selected proposal — black header, white body. */
export default function ScheduleCandidateCard({
  candidate,
  allCandidates = [],
  rankLabel,
  onApprove,
  approving,
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);
  const [viewMode, setViewMode] = useState("board");
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState(null);
  const [violationsOnly, setViolationsOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const assignments = candidate.assignments || [];
  const breakdown = candidate.fitnessBreakdown || {};
  const workload = candidate.facultyWorkload || [];
  const stats = getCandidateStats(candidate);
  const insight = useMemo(
    () => buildComparisonInsight(candidate, allCandidates.length ? allCandidates : [candidate], t),
    [candidate, allCandidates, t],
  );

  const violationRows = useMemo(
    () => buildViolationRows(breakdown.violations, assignments, t),
    [breakdown.violations, assignments, t],
  );
  const violatedIds = useMemo(
    () => new Set(violationRows.map((v) => v.projectId)),
    [violationRows],
  );
  const violationsByProject = useMemo(() => {
    const map = new Map();
    violationRows.forEach((v) => {
      if (!map.has(v.projectId)) map.set(v.projectId, []);
      map.get(v.projectId).push(v);
    });
    return map;
  }, [violationRows]);

  const dayOptions = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const value = a.scheduledDay || a.formattedDate;
      if (!value) return;
      const prev = map.get(value) || {
        value,
        label: a.formattedDate || a.scheduledDay || value,
        date: a.scheduledDate || "",
        count: 0,
      };
      prev.count += 1;
      if (a.scheduledDate && (!prev.date || a.scheduledDate < prev.date)) {
        prev.date = a.scheduledDate;
      }
      if (a.formattedDate) prev.label = a.formattedDate;
      map.set(value, prev);
    });
    return Array.from(map.values()).sort((a, b) =>
      String(a.date || a.label).localeCompare(String(b.date || b.label)),
    );
  }, [assignments]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...assignments]
      .sort((a, b) => {
        const dateCmp = String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""));
        if (dateCmp !== 0) return dateCmp;
        return String(a.scheduledTime || "").localeCompare(String(b.scheduledTime || ""));
      })
      .filter((a) => {
        if (violationsOnly && !violatedIds.has(a.projectId)) return false;
        if (dayFilter !== "all") {
          const key = a.scheduledDay || a.formattedDate;
          if (key !== dayFilter) return false;
        }
        if (doctorFilter != null) {
          if (!memberIdsOf(a).includes(Number(doctorFilter))) return false;
        }
        if (!q) return true;
        const hay = [
          a.projectTitle,
          a.supervisorName,
          a.committeeName,
          a.roomName,
          a.phaseName,
          a.scheduledDay,
          a.scheduledTime,
          ...(a.committeeMembers || []).map((m) => m.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [assignments, search, dayFilter, doctorFilter, violationsOnly, violatedIds]);

  const clearFilters = () => {
    startTransition(() => {
      setSearch("");
      setDayFilter("all");
      setDoctorFilter(null);
      setViolationsOnly(false);
    });
  };

  const selectDoctor = (doctor) => {
    startTransition(() => {
      setDoctorFilter((prev) =>
        Number(prev) === Number(doctor.userId) ? null : Number(doctor.userId),
      );
      setTab(0);
    });
  };

  const jumpToProject = (projectId) => {
    startTransition(() => {
      setTab(0);
      setExpandedId(projectId);
      setViolationsOnly(true);
    });
  };

  const activeDoctorName = workload.find((w) => Number(w.userId) === Number(doctorFilter))?.name;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "#fff",
        }}
      >
        {/* Black header — minimal */}
        <Box sx={{ px: 2.5, py: 2, bgcolor: NAVY, color: "#fff" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  icon={stats.rank === 1 ? <Star sx={{ color: "#fff !important" }} /> : undefined}
                  label={rankLabel}
                  sx={{
                    fontWeight: 900,
                    bgcolor: "rgba(255,255,255,0.14)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                />
                <Chip
                  size="small"
                  icon={stats.clean ? <CheckCircle /> : <WarningAmber />}
                  color={stats.clean ? "success" : "warning"}
                  label={
                    stats.clean
                      ? t("scheduling.generate.candidate.noHardViolations")
                      : t("scheduling.generate.candidate.hardViolations", {
                          count: stats.hard,
                        })
                  }
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
            </Stack>
            <Box sx={{ textAlign: { xs: "start", sm: "end" } }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>
                {t("scheduling.generate.candidate.fitness")}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1, color: "#fff" }}>
                {stats.score.toFixed(0)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* White body */}
        <Box sx={{ p: 2.5, bgcolor: "#fff" }}>
          <Alert
            severity={insight.verdict === "best" ? "success" : "warning"}
            icon={
              insight.verdict === "best" ? <ThumbUpAltOutlined /> : <ThumbDownAltOutlined />
            }
            sx={{ mb: 2, borderRadius: 2 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.75 }}>
              {insight.verdict === "best"
                ? t("scheduling.generate.compare.whyBestTitle")
                : t("scheduling.generate.compare.whyWorseTitle")}
            </Typography>
            <Stack component="ul" spacing={0.35} sx={{ m: 0, ps: 2 }}>
              {insight.points.map((p) => (
                <Typography key={p} component="li" variant="body2">
                  {p}
                </Typography>
              ))}
            </Stack>
          </Alert>

          <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ mb: 2 }}>
            <Chip
              size="small"
              variant="outlined"
              label={`${t("scheduling.generate.candidate.summarySessions")}: ${stats.sessions}`}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`${t("scheduling.generate.candidate.summarySoft")}: ${stats.soft}`}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              variant="outlined"
              label={`${t("scheduling.generate.candidate.summaryDoctors")}: ${stats.doctors}`}
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              mb: 2,
              minHeight: 42,
              borderBottom: "1px solid",
              borderColor: "divider",
              "& .MuiTab-root": { minHeight: 42, fontWeight: 800, textTransform: "none" },
            }}
          >
            <Tab
              icon={<TableChart fontSize="small" />}
              iconPosition="start"
              label={t("scheduling.generate.candidate.tabSchedule")}
            />
            <Tab
              icon={<WarningAmber fontSize="small" />}
              iconPosition="start"
              label={`${t("scheduling.generate.candidate.tabViolations")} (${violationRows.length})`}
            />
            <Tab
              icon={<Groups fontSize="small" />}
              iconPosition="start"
              label={`${t("scheduling.generate.candidate.tabWorkload")} (${workload.length})`}
            />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <TextField
                  size="small"
                  fullWidth
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("scheduling.generate.candidate.searchPlaceholder")}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={viewMode}
                  onChange={(_, v) => v && setViewMode(v)}
                >
                  <ToggleButton value="board" sx={{ fontWeight: 800, gap: 0.5 }}>
                    <CalendarViewDay fontSize="small" />
                    {t("scheduling.generate.candidate.viewBoard")}
                  </ToggleButton>
                  <ToggleButton value="table" sx={{ fontWeight: 800, gap: 0.5 }}>
                    <TableChart fontSize="small" />
                    {t("scheduling.generate.candidate.viewTable")}
                  </ToggleButton>
                </ToggleButtonGroup>
                <ToggleButton
                  value="violations"
                  selected={violationsOnly}
                  onChange={() => setViolationsOnly((v) => !v)}
                  size="small"
                  sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
                >
                  {t("scheduling.generate.candidate.filterViolations")}
                </ToggleButton>
                <Tooltip title={t("scheduling.generate.candidate.clearFilters")}>
                  <IconButton onClick={clearFilters} size="small">
                    <FilterAltOff />
                  </IconButton>
                </Tooltip>
              </Stack>

              {dayOptions.length > 0 && (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={dayFilter}
                  onChange={(_, v) => v && setDayFilter(v)}
                  sx={{ flexWrap: "wrap", gap: 0.75 }}
                >
                  <ToggleButton value="all" sx={{ fontWeight: 800 }}>
                    {t("scheduling.generate.candidate.filterAllDays")}
                  </ToggleButton>
                  {dayOptions.map((d) => (
                    <ToggleButton key={d.value} value={d.value} sx={{ fontWeight: 700 }}>
                      {d.label || d.value}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}

              {(doctorFilter != null || search || violationsOnly || dayFilter !== "all") && (
                <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap alignItems="center">
                  {doctorFilter != null && (
                    <Chip
                      color="primary"
                      label={t("scheduling.generate.candidate.filterDoctor", {
                        name: activeDoctorName || doctorFilter,
                      })}
                      onDelete={() => setDoctorFilter(null)}
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {t("scheduling.generate.candidate.showingRows", {
                      shown: filteredRows.length,
                      total: assignments.length,
                    })}
                  </Typography>
                </Stack>
              )}

              {viewMode === "board" ? (
                <DayBoard
                  rows={filteredRows}
                  violatedIds={violatedIds}
                  violationsByProject={violationsByProject}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  t={t}
                />
              ) : (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ maxHeight: 420, borderRadius: 2 }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell width={40} />
                        <TableCell sx={{ fontWeight: 900 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colProject")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colPhase")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colCommittee")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colDay")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colTime")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colRoom")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                              {t("scheduling.generate.candidate.noRows")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRows.map((a, i) => {
                          const flagged = violatedIds.has(a.projectId);
                          const open = expandedId === a.projectId;
                          return (
                            <React.Fragment key={`${a.projectId}-${i}`}>
                              <TableRow
                                hover
                                selected={open}
                                onClick={() =>
                                  setExpandedId((id) =>
                                    id === a.projectId ? null : a.projectId,
                                  )
                                }
                                sx={{
                                  cursor: "pointer",
                                  bgcolor: flagged ? "rgba(245, 158, 11, 0.06)" : undefined,
                                }}
                              >
                                <TableCell>
                                  <IconButton size="small">
                                    {open ? <ExpandLess /> : <ExpandMore />}
                                  </IconButton>
                                </TableCell>
                                <TableCell>{i + 1}</TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={0.75} alignItems="center">
                                    {flagged && <WarningAmber fontSize="small" color="warning" />}
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                        {a.projectTitle}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {a.supervisorName}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  {a.phaseName ? (
                                    <Chip
                                      size="small"
                                      color="secondary"
                                      variant="outlined"
                                      label={a.phaseName}
                                      sx={{ fontWeight: 800 }}
                                    />
                                  ) : (
                                    "—"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {a.committeeName ||
                                    (a.committeeMembers || []).map((m) => m.name).join(" · ") ||
                                    "—"}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                  {a.formattedDate || a.scheduledDay || "—"}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                  {a.scheduledTime || "—"}
                                </TableCell>
                                <TableCell>{a.roomName || "—"}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                                  <Collapse in={open} timeout="auto" unmountOnExit>
                                    <SessionDetail
                                      assignment={a}
                                      violations={violationsByProject.get(a.projectId) || []}
                                      t={t}
                                    />
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={1.5}>
              {violationRows.length === 0 ? (
                <Alert severity="success" icon={<CheckCircle />}>
                  {t("scheduling.generate.candidate.summaryClean")}
                </Alert>
              ) : (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ maxHeight: 420, borderRadius: 2 }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colIssue")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colProject")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colDay")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colTime")}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>
                          {t("scheduling.generate.candidate.colRoom")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {violationRows.map((v) => (
                        <TableRow
                          key={v.key}
                          hover
                          onClick={() => jumpToProject(v.projectId)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>
                            <Chip
                              size="small"
                              color={v.severity === "hard" ? "warning" : "default"}
                              label={v.typeLabel}
                              sx={{ fontWeight: 800 }}
                            />
                            {v.details ? (
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                              >
                                {v.details}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{v.projectTitle}</TableCell>
                          <TableCell>{v.day}</TableCell>
                          <TableCell>{v.time}</TableCell>
                          <TableCell>{v.room}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          )}

          {tab === 2 && (
            <WorkloadPanel
              workload={workload}
              t={t}
              activeDoctorId={doctorFilter}
              onSelectDoctor={selectDoctor}
            />
          )}

          <Button
            fullWidth
            size="large"
            variant="contained"
            color={stats.clean ? "success" : "warning"}
            startIcon={<CheckCircle />}
            disabled={approving}
            onClick={() => setConfirmOpen(true)}
            sx={{
              mt: 2.5,
              fontWeight: 900,
              py: 1.25,
              borderRadius: 2,
              bgcolor: stats.clean ? undefined : NAVY,
              "&:hover": stats.clean ? undefined : { bgcolor: "#1E293B" },
            }}
          >
            {t("scheduling.generate.candidate.approve")}
          </Button>
        </Box>
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {t("scheduling.generate.candidate.confirmTitle")}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: stats.hard > 0 ? 1.5 : 0 }}>
            {t("scheduling.generate.candidate.confirmBody", { rank: rankLabel })}
          </Typography>
          {stats.hard > 0 && (
            <Alert severity="warning">
              {t("scheduling.generate.candidate.confirmWithViolations", { count: stats.hard })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            {t("scheduling.generate.candidate.cancel")}
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={approving}
            onClick={() => {
              setConfirmOpen(false);
              onApprove();
            }}
          >
            {t("scheduling.generate.candidate.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
