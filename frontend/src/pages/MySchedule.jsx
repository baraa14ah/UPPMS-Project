import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Button,
  Collapse,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  CalendarMonth,
  CalendarViewDay,
  ExpandLess,
  ExpandMore,
  Search,
  EventNote,
  TableChart,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";
import ListPageSkeleton from "../components/loading/ListPageSkeleton";
import ListToolbar from "../components/ListToolbar";
import DefenseWorkflowGuide from "../components/defense/DefenseWorkflowGuide";
import { useLanguage } from "../context/LanguageContext";
import { BLUE } from "../styles/dashboardUi";

function ResultChip({ session, t }) {
  const result = session.defense_result?.result;
  if (!result) return null;
  const color =
    result === "passed" ? "success" : result === "failed" ? "error" : "warning";
  const label =
    result === "passed"
      ? t("progress.completed")
      : result === "failed"
        ? t("progress.failed")
        : t("progress.incomplete");
  return <Chip size="small" color={color} label={label} sx={{ fontWeight: 800 }} />;
}

function SessionActions({ session, t }) {
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      <Button
        component={RouterLink}
        to={`/dashboard/projects/${session.project?.id}`}
        size="small"
        variant="outlined"
        sx={{ fontWeight: 700 }}
      >
        {t("mySchedule.openProject")}
      </Button>
      {session.can_record_result && !session.defense_result?.result && (
        <Button
          component={RouterLink}
          to={`/dashboard/projects/${session.project?.id}?tab=defense`}
          size="small"
          variant="contained"
          color="secondary"
          sx={{ fontWeight: 800 }}
        >
          {session.defense_result?.stage_is_decisive === false
            ? t("defenseResult.completeStage")
            : t("defenseResult.record")}
        </Button>
      )}
      <ResultChip session={session} t={t} />
    </Stack>
  );
}

function SessionCard({ session, t }) {
  const [open, setOpen] = useState(false);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        borderColor: "divider",
        transition: "transform .15s ease, box-shadow .15s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
          borderColor: BLUE,
        },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={1}
        onClick={() => setOpen((v) => !v)}
        sx={{ cursor: "pointer" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>
            {session.project?.title || "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" noWrap>
            {session.project?.supervisor?.name || "—"}
          </Typography>
        </Box>
        <IconButton size="small">{open ? <ExpandLess /> : <ExpandMore />}</IconButton>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mt: 1.25 }}>
        <Chip size="small" label={session.scheduled_time || "—"} sx={{ fontWeight: 800 }} />
        {session.room?.name && (
          <Chip size="small" color="primary" variant="outlined" label={session.room.name} sx={{ fontWeight: 700 }} />
        )}
        {session.academic_stage?.name && (
          <Chip size="small" variant="outlined" label={session.academic_stage.name} />
        )}
        <ResultChip session={session} t={t} />
      </Stack>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Stack spacing={1.25} sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
            {(session.committee_members || []).map((member) => (
              <Chip
                key={member.id}
                size="small"
                label={
                  member.role === "chair"
                    ? `${member.name} (${t("committees.chair")})`
                    : member.name
                }
                variant="outlined"
                color={member.role === "chair" ? "warning" : "default"}
              />
            ))}
          </Stack>
          <SessionActions session={session} t={t} />
        </Stack>
      </Collapse>
    </Paper>
  );
}

/** Faculty/admin schedule explorer with day board + table. */
export default function MySchedule() {
  const { authHeaders, apiFetch, API_BASE_URL, role } = useAuth();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [viewMode, setViewMode] = useState("board");
  const [expandedId, setExpandedId] = useState(null);

  const isAdmin = role === "admin";

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/schedules/my-sessions`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        setError(data?.message || t("mySchedule.loadFailed"));
        return;
      }

      setSessions(data.sessions || []);
    } catch {
      setError(t("mySchedule.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const stageOptions = useMemo(() => {
    const names = new Map();
    sessions.forEach((s) => {
      if (s.academic_stage?.name) {
        names.set(String(s.academic_stage.id), s.academic_stage.name);
      }
    });
    return [...names.entries()].map(([value, label]) => ({ value, label }));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((session) => {
      if (stageFilter && String(session.academic_stage?.id) !== stageFilter) {
        return false;
      }
      if (!q) return true;

      const projectTitle = (session.project?.title || "").toLowerCase();
      const supervisorName = (session.project?.supervisor?.name || "").toLowerCase();
      const committeeNames = (session.committee_members || [])
        .map((m) => m.name)
        .join(" ")
        .toLowerCase();

      return (
        projectTitle.includes(q) ||
        supervisorName.includes(q) ||
        committeeNames.includes(q)
      );
    });
  }, [sessions, search, stageFilter]);

  const dayGroups = useMemo(() => {
    const map = new Map();
    filteredSessions.forEach((s) => {
      const key = s.formatted_date || s.scheduled_date || s.scheduled_day || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries());
  }, [filteredSessions]);

  if (loading) {
    return <ListPageSkeleton rows={5} />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <PageHeader
        title={t("nav.mySchedule")}
        subtitle={
          isAdmin
            ? t("mySchedule.adminSubtitle")
            : t("mySchedule.memberSubtitle")
        }
        icon={<EventNote />}
      />

      <DefenseWorkflowGuide variant="schedule" />

      {sessions.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
          <CalendarMonth sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 800 }}>
            {t("mySchedule.emptyTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isAdmin ? t("mySchedule.emptyAdmin") : t("mySchedule.emptyMember")}
          </Typography>
        </Paper>
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("mySchedule.searchPlaceholder")}
            onRefresh={fetchSessions}
            filters={[
              {
                key: "stage",
                label: t("mySchedule.stageFilter"),
                value: stageFilter,
                onChange: setStageFilter,
                options: stageOptions,
              },
            ]}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_, v) => v && setViewMode(v)}
            >
              <ToggleButton value="board" sx={{ fontWeight: 800, gap: 0.5 }}>
                <CalendarViewDay fontSize="small" />
                {t("mySchedule.viewBoard")}
              </ToggleButton>
              <ToggleButton value="table" sx={{ fontWeight: 800, gap: 0.5 }}>
                <TableChart fontSize="small" />
                {t("mySchedule.viewTable")}
              </ToggleButton>
            </ToggleButtonGroup>
          </ListToolbar>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("mySchedule.showingCount", {
              shown: filteredSessions.length,
              total: sessions.length,
            })}
          </Typography>

          {viewMode === "board" ? (
            filteredSessions.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
                <Search color="disabled" sx={{ mb: 1 }} />
                <Typography color="text.secondary">{t("mySchedule.noMatch")}</Typography>
              </Paper>
            ) : (
              <Stack spacing={2.5}>
                {dayGroups.map(([day, items]) => (
                  <Box key={day}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: BLUE,
                          boxShadow: `0 0 0 4px ${BLUE}22`,
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                        {day}
                      </Typography>
                      <Chip size="small" label={items.length} sx={{ fontWeight: 800 }} />
                    </Stack>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "1fr 1fr",
                          lg: "1fr 1fr 1fr",
                        },
                        gap: 1.25,
                        ps: { xs: 0, sm: 2 },
                        borderInlineStart: { sm: `2px solid ${BLUE}33` },
                      }}
                    >
                      {items.map((session) => (
                        <SessionCard key={session.id} session={session} t={t} />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Stack>
            )
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflowX: "auto",
                maxHeight: 640,
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell width={40} />
                    <TableCell sx={{ fontWeight: 900 }}>{t("mySchedule.colProject")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("mySchedule.colSupervisor")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("mySchedule.colStage")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("mySchedule.colDate")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("mySchedule.colTime")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("mySchedule.colRoom")}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{t("common.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Stack alignItems="center" spacing={1}>
                          <Search color="disabled" />
                          <Typography color="text.secondary">{t("mySchedule.noMatch")}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => {
                      const open = expandedId === session.id;
                      return (
                        <React.Fragment key={session.id}>
                          <TableRow
                            hover
                            selected={open}
                            onClick={() =>
                              setExpandedId((id) => (id === session.id ? null : session.id))
                            }
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell>
                              <IconButton size="small">
                                {open ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>
                              {session.project?.title || "—"}
                            </TableCell>
                            <TableCell sx={{ minWidth: 140 }}>
                              {session.project?.supervisor?.name || "—"}
                            </TableCell>
                            <TableCell>
                              {session.academic_stage ? (
                                <Chip
                                  size="small"
                                  label={session.academic_stage.name}
                                  variant="outlined"
                                />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {session.formatted_date || session.scheduled_date || "—"}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                              {session.scheduled_time || "—"}
                            </TableCell>
                            <TableCell>
                              {session.room?.name ? (
                                <Chip
                                  size="small"
                                  label={session.room.name}
                                  color="primary"
                                  variant="outlined"
                                />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell
                              sx={{ minWidth: 180 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SessionActions session={session} t={t} />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={8} sx={{ py: 0, border: 0 }}>
                              <Collapse in={open} timeout="auto" unmountOnExit>
                                <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 2, m: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                                    {t("committees.members")}
                                  </Typography>
                                  <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
                                    {(session.committee_members || []).map((member) => (
                                      <Chip
                                        key={member.id}
                                        size="small"
                                        label={
                                          member.role === "chair"
                                            ? `${member.name} (${t("committees.chair")})`
                                            : member.name
                                        }
                                        variant="outlined"
                                        color={member.role === "chair" ? "warning" : "default"}
                                      />
                                    ))}
                                  </Stack>
                                </Box>
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
        </>
      )}
    </Box>
  );
}
