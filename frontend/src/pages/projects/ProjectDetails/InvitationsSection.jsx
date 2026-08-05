import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  Chip,
  Autocomplete,
  TextField,
  InputAdornment,
  Avatar,
  Paper,
  alpha,
} from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import { textEllipsisSx } from "../../../styles/textEllipsis";
import { btnPrimarySx } from "../../../styles/dashboardUi";
import ProjectSectionShell from "../../../components/projects/ProjectSectionShell";

/** Filters invite options by name, email, or student number. */
function filterByQuery(options, inputValue) {
  const q = String(inputValue || "").trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      String(u.student_number || "").includes(q),
  );
}

/** Project invitations section for supervisors and students. */
export default function InvitationsSection({
  projectId,
  project,
  canInviteSupervisor,
  canManageProject,
  compact = false,
}) {
  const { t } = useLanguage();
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();

  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [supervisorInput, setSupervisorInput] = useState("");
  const [invitingSupervisor, setInvitingSupervisor] = useState(false);
  const [inviteSupervisorMsg, setInviteSupervisorMsg] = useState("");

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentInput, setStudentInput] = useState("");
  const [inviteStudentMsg, setInviteStudentMsg] = useState("");
  const [invitingStudent, setInvitingStudent] = useState(false);
  const [studentsLoadMsg, setStudentsLoadMsg] = useState("");

  /** Loads supervisors available for invitation, optionally filtered by search. */
  const fetchSupervisors = useCallback(
    async (search = "") => {
      try {
        const qs = new URLSearchParams({ project_id: String(projectId) });
        if (search.trim()) qs.set("search", search.trim());
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/supervisors?${qs.toString()}`,
          { headers: authHeaders() },
        );
        if (res.ok) setSupervisors(data?.supervisors || []);
      } catch {
        setSupervisors([]);
      }
    },
    [API_BASE_URL, apiFetch, authHeaders, projectId],
  );

  /** Loads students eligible for invitation, optionally filtered by search. */
  const fetchStudentsForInvite = useCallback(
    async (search = "", showLoading = false) => {
      if (showLoading) setStudentsLoadMsg(t("common.loading"));
      try {
        const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/project/${projectId}/students${qs}`,
          { headers: authHeaders() },
        );

        if (!res.ok) {
          setStudents([]);
          setStudentsLoadMsg(data?.message || t("projects.loadError"));
          return;
        }

        const list = Array.isArray(data?.students) ? data.students : [];
        setStudents(list);
        setStudentsLoadMsg(
          list.length === 0
            ? t("projects.noStudentsToInvite")
            : `${t("projects.studentsLoaded")}: ${list.length}`,
        );
      } catch {
        setStudents([]);
        setStudentsLoadMsg(t("projects.loadError"));
      }
    },
    [API_BASE_URL, apiFetch, authHeaders, projectId, t],
  );

  const supervisorsLoaded = useRef(false);
  const studentsLoaded = useRef(false);

  useEffect(() => {
    supervisorsLoaded.current = false;
    studentsLoaded.current = false;
  }, [projectId]);

  useEffect(() => {
    if (!canInviteSupervisor) return undefined;
    const delay = supervisorsLoaded.current ? 400 : 0;
    const id = setTimeout(() => {
      fetchSupervisors(supervisorInput);
      supervisorsLoaded.current = true;
    }, delay);
    return () => clearTimeout(id);
  }, [supervisorInput, canInviteSupervisor, projectId, fetchSupervisors]);

  useEffect(() => {
    if (!canManageProject) return undefined;
    const delay = studentsLoaded.current ? 400 : 0;
    const id = setTimeout(() => {
      fetchStudentsForInvite(studentInput, !studentsLoaded.current);
      studentsLoaded.current = true;
    }, delay);
    return () => clearTimeout(id);
  }, [studentInput, canManageProject, projectId, fetchStudentsForInvite]);

  /** Builds the display label for an autocomplete invite option. */
  const optionLabel = (u) => {
    if (!u) return "";
    const parts = [u.name];
    if (u.student_number) parts.push(`#${u.student_number}`);
    if (u.email) parts.push(u.email);
    return parts.filter(Boolean).join(" — ");
  };

  /** Renders a student option in the invite autocomplete list. */
  const renderStudentOption = (props, option) => (
    <Box
      component="li"
      {...props}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Avatar
        sx={{
          width: 40,
          height: 40,
          bgcolor: "primary.main",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {option.name?.charAt(0)?.toUpperCase() || "?"}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, color: "text.primary", ...textEllipsisSx }}>
          {option.name || t("common.unknown")}
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
          {option.student_number && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <BadgeRoundedIcon sx={{ fontSize: 14, color: "primary.main" }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                {option.student_number}
              </Typography>
            </Stack>
          )}
          {option.email && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EmailRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", ...textEllipsisSx }}>
                {option.email}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );

  /** Renders a supervisor option in the invite autocomplete list. */
  const renderSupervisorOption = (props, option) => (
    <Box
      component="li"
      {...props}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Avatar
        sx={{
          width: 40,
          height: 40,
          bgcolor: "info.main",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        {option.name?.charAt(0)?.toUpperCase() || "?"}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, color: "text.primary", ...textEllipsisSx }}>
          {option.name || t("common.unknown")}
        </Typography>
        {option.email && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
            <EmailRoundedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", ...textEllipsisSx }}>
              {option.email}
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );

  const autocompleteCommon = useMemo(
    () => ({
      openOnFocus: true,
      clearOnBlur: false,
      handleHomeEndKeys: true,
      filterOptions: (opts, state) => filterByQuery(opts, state.inputValue),
      noOptionsText: t("projects.noInviteMatch"),
    }),
    [t],
  );

  /** Sends a supervisor invitation for the current project. */
  const handleSendSupervisorInvite = async () => {
    setInviteSupervisorMsg("");
    if (!selectedSupervisor?.id) {
      setInviteSupervisorMsg(t("projects.selectSupervisor"));
      return;
    }
    try {
      setInvitingSupervisor(true);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/project/${projectId}/invite-supervisor`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ supervisor_id: Number(selectedSupervisor.id) }),
        },
      );
      if (!res.ok) {
        setInviteSupervisorMsg(data?.message || t("common.error"));
        return;
      }
      setInviteSupervisorMsg(t("projects.inviteSent"));
      setSelectedSupervisor(null);
      setSupervisorInput("");
    } catch {
      setInviteSupervisorMsg(t("common.error"));
    } finally {
      setInvitingSupervisor(false);
    }
  };

  /** Sends a student invitation for the current project. */
  const handleInviteStudent = async () => {
    setInviteStudentMsg("");
    if (!selectedStudent?.id) {
      setInviteStudentMsg(t("projects.selectStudent"));
      return;
    }
    try {
      setInvitingStudent(true);
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/project/${projectId}/invite-student`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ student_id: Number(selectedStudent.id) }),
        },
      );
      if (!res.ok) {
        setInviteStudentMsg(data?.message || t("common.error"));
        return;
      }
      setInviteStudentMsg(t("projects.inviteSent"));
      setStudents((prev) => prev.filter((s) => s.id !== selectedStudent.id));
      setSelectedStudent(null);
      setStudentInput("");
    } catch {
      setInviteStudentMsg(t("common.error"));
    } finally {
      setInvitingStudent(false);
    }
  };

  if (!canInviteSupervisor && !canManageProject) return null;

  const inviteCardSx = {
    flex: 1,
    p: { xs: 2, md: 2.5 },
    borderRadius: 2.5,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: (theme) =>
      theme.palette.mode === "dark"
        ? alpha("#10B981", 0.08)
        : alpha("#10B981", 0.05),
  };

  return (
    <ProjectSectionShell
      icon={PersonAddAltRoundedIcon}
      title={t("projects.invitesTitle")}
      subtitle={t("projects.invitesSubtitle")}
      accent="#10B981"
      compact={compact}
      sx={{
        mt: 0,
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "none"
            : "0 8px 28px rgba(16,185,129,0.12)",
      }}
      actions={
        <Chip
          size="small"
          icon={<SchoolRoundedIcon />}
          label={t("projects.sameUniversityOnly")}
          color="success"
          variant="outlined"
          sx={{ fontWeight: 800 }}
        />
      }
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {canInviteSupervisor && (
          <Paper elevation={0} sx={inviteCardSx}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: alpha("#0EA5E9", 0.12),
                  color: "#0EA5E9",
                }}
              >
                <SupervisorAccountRoundedIcon />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: "1rem" }}>
                  {t("projects.inviteSupervisor")}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t("projects.inviteSupervisorHint")}
                </Typography>
              </Box>
            </Stack>
            {project?.supervisor_id ? (
              <Alert severity="info">{t("projects.supervisorAssigned")}</Alert>
            ) : (
              <>
                {inviteSupervisorMsg && (
                  <Alert
                    sx={{ mb: 1 }}
                    severity={
                      inviteSupervisorMsg === t("projects.inviteSent") ? "success" : "warning"
                    }
                  >
                    {inviteSupervisorMsg}
                  </Alert>
                )}
                <Stack spacing={1}>
                  <Autocomplete
                    {...autocompleteCommon}
                    options={supervisors}
                    value={selectedSupervisor}
                    inputValue={supervisorInput}
                    onInputChange={(_, v) => setSupervisorInput(v)}
                    onChange={(_, v) => setSelectedSupervisor(v)}
                    getOptionLabel={optionLabel}
                    isOptionEqualToValue={(a, b) => a?.id === b?.id}
                    renderOption={renderSupervisorOption}
                    ListboxProps={{
                      sx: { p: 0, maxHeight: 280 },
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label={t("projects.selectSupervisor")}
                        placeholder={t("projects.searchInvite")}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <InputAdornment position="start">
                                <SearchRoundedIcon fontSize="small" color="action" />
                              </InputAdornment>
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendSupervisorInvite}
                    disabled={invitingSupervisor || !selectedSupervisor}
                    sx={{ ...btnPrimarySx, borderRadius: 2 }}
                  >
                    {invitingSupervisor ? t("common.loading") : t("projects.sendInvite")}
                  </Button>
                </Stack>
              </>
            )}
          </Paper>
        )}

        {canManageProject && (
          <Paper elevation={0} sx={inviteCardSx}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              sx={{ mb: 1.5 }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha("#10B981", 0.15),
                    color: "#10B981",
                  }}
                >
                  <PersonRoundedIcon />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: "1rem" }}>
                    {t("projects.inviteStudent")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {t("projects.inviteStudentHint")}
                  </Typography>
                </Box>
              </Stack>
              <Button size="small" variant="outlined" onClick={() => fetchStudentsForInvite(studentInput)}>
                {t("projects.refreshList")}
              </Button>
            </Stack>

            {inviteStudentMsg && (
              <Alert
                sx={{ mb: 1 }}
                severity={inviteStudentMsg === t("projects.inviteSent") ? "success" : "info"}
              >
                {inviteStudentMsg}
              </Alert>
            )}

            <Stack spacing={1}>
              <Autocomplete
                {...autocompleteCommon}
                options={students}
                value={selectedStudent}
                inputValue={studentInput}
                onInputChange={(_, v) => setStudentInput(v)}
                onChange={(_, v) => setSelectedStudent(v)}
                getOptionLabel={optionLabel}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderOption={renderStudentOption}
                ListboxProps={{
                  sx: { p: 0, maxHeight: 280 },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label={t("projects.selectStudent")}
                    placeholder={t("projects.searchStudentInvite")}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" color="action" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Button
                variant="contained"
                color="success"
                onClick={handleInviteStudent}
                disabled={invitingStudent || !selectedStudent}
                sx={{ fontWeight: 800, borderRadius: 2, color: "#fff" }}
              >
                {invitingStudent ? t("common.loading") : t("projects.sendInvite")}
              </Button>
            </Stack>

            {studentsLoadMsg && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {studentsLoadMsg}
              </Typography>
            )}
          </Paper>
        )}
      </Stack>
    </ProjectSectionShell>
  );
}
