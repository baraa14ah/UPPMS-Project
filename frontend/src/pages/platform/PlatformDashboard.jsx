import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { textEllipsisSx } from "../../styles/textEllipsis";
import PageHeader from "../../components/shared/PageHeader";
import {
  headerActionBtnSx,
  dashboardCardSx,
  accentTop,
} from "../../styles/dashboardUi";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";

import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";

/** Super-admin dashboard with platform-wide stats and recent activity. */
export default function PlatformDashboard() {
  const { t } = useLanguage();
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentUniversities, setRecentUniversities] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [universitiesBreakdown, setUniversitiesBreakdown] = useState([]);

  const primaryCards = useMemo(
    () => [
      {
        key: "universities",
        label: t("dashboard.platformUniversities"),
        icon: <SchoolRoundedIcon />,
        color: "#3B82F6",
        to: "/dashboard/universities",
      },
      {
        key: "users",
        label: t("dashboard.platformUsers"),
        icon: <GroupRoundedIcon />,
        color: "#14B8A6",
        to: "/dashboard/users",
      },
      {
        key: "projects",
        label: t("dashboard.platformProjects"),
        icon: <FolderRoundedIcon />,
        color: "#A78BFA",
        to: "/dashboard/projects",
      },
      {
        key: "pending_users",
        label: t("dashboard.platformPending"),
        icon: <PendingActionsRoundedIcon />,
        color: "#F59E0B",
        to: "/dashboard/users?status=pending",
      },
    ],
    [t],
  );

  const academicCards = useMemo(
    () => [
      {
        key: "tracks",
        label: t("dashboard.platformTracks"),
        icon: <TimelineRoundedIcon />,
        color: "#0EA5E9",
      },
      {
        key: "active_schedules",
        label: t("dashboard.platformSchedules"),
        icon: <CalendarMonthRoundedIcon />,
        color: "#6366F1",
      },
      {
        key: "committees",
        label: t("dashboard.platformCommittees"),
        icon: <GroupsRoundedIcon />,
        color: "#EC4899",
      },
      {
        key: "pending_proposals",
        label: t("dashboard.platformPendingProposals"),
        icon: <DescriptionRoundedIcon />,
        color: "#F97316",
      },
      {
        key: "defense_rooms",
        label: t("dashboard.platformRooms"),
        icon: <MeetingRoomRoundedIcon />,
        color: "#10B981",
      },
      {
        key: "defense_types",
        label: t("dashboard.platformDefenseTypes"),
        icon: <CategoryRoundedIcon />,
        color: "#64748B",
      },
    ],
    [t],
  );

  const statCards = primaryCards;

  /** Loads dashboard stats and recent users from the admin API. */
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [statsRes, usersRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/admin/dashboard/stats`, { headers: authHeaders() }),
        apiFetch(`${API_BASE_URL}/admin/users?limit=5&sort=created_at&order=desc`, { headers: authHeaders() }),
      ]);

      if (!statsRes.res.ok) {
        throw new Error(statsRes.data?.message || t("dashboard.loadError"));
      }

      const breakdown = statsRes.data?.universities_breakdown || [];
      setStats(statsRes.data?.stats || {});
      setUniversitiesBreakdown(breakdown);
      setRecentUniversities(breakdown.slice(0, 5));
      setRecentUsers(usersRes.data?.users?.slice?.(0, 5) || usersRes.data?.data?.slice?.(0, 5) || []);
    } catch (e) {
      setError(e?.message || t("dashboard.loadError"));
      setStats({ universities: 0, users: 0, projects: 0, pending_users: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Renders a status chip for a recent user row. */
  const getStatusChip = (status) => {
    if (status === "active") {
      return (
        <Chip
          size="small"
          icon={<CheckCircleRoundedIcon />}
          label={t("dashboard.statusActive")}
          color="success"
          sx={{ fontWeight: 700 }}
        />
      );
    }
    if (status === "pending") {
      return (
        <Chip
          size="small"
          icon={<HourglassEmptyRoundedIcon />}
          label={t("dashboard.statusPending")}
          color="warning"
          sx={{ fontWeight: 700 }}
        />
      );
    }
    return (
      <Chip size="small" label={status || "—"} variant="outlined" sx={{ fontWeight: 700 }} />
    );
  };

  const totalUsers = stats?.users ?? 0;
  const pendingUsers = stats?.pending_users ?? 0;
  const activePercent = totalUsers > 0 ? Math.round(((totalUsers - pendingUsers) / totalUsers) * 100) : 0;

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      <PageHeader
        title={t("dashboard.platformTitle")}
        subtitle={t("dashboard.platformSubtitle")}
        icon={<AdminPanelSettingsRoundedIcon />}
        roleName="super_admin"
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Tooltip title={t("common.refresh")}>
              <IconButton
                onClick={loadData}
                disabled={loading}
                sx={{
                  color: "#fff",
                  border: "2px solid rgba(255,255,255,0.5)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                <RefreshRoundedIcon />
              </IconButton>
            </Tooltip>
            <Button
              component={RouterLink}
              to="/dashboard/universities"
              variant="outlined"
              startIcon={<SchoolRoundedIcon />}
              sx={headerActionBtnSx}
            >
              {t("dashboard.platformManageUniversities")}
            </Button>
            <Button
              component={RouterLink}
              to="/dashboard/users"
              variant="outlined"
              startIcon={<GroupRoundedIcon />}
              sx={headerActionBtnSx}
            >
              {t("dashboard.adminManageUsers")}
            </Button>
          </Stack>
        }
      />

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2, fontWeight: 700, color: "text.secondary" }}>
            {t("common.loading")}
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2.5,
            }}
          >
            {statCards.map((card) => (
              <Paper
                key={card.key}
                component={RouterLink}
                to={card.to}
                elevation={0}
                sx={{
                  ...dashboardCardSx,
                  ...accentTop(card.color),
                  p: 3,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: card.color }}>
                  {card.icon}
                  <Typography sx={{ fontWeight: 900, color: "text.primary" }}>
                    {card.label}
                  </Typography>
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 950, mt: 2, color: "text.primary" }}>
                  {stats?.[card.key] ?? 0}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 900, mt: 3.5, mb: 1.5 }}>
            {t("dashboard.platformAcademicTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            {t("dashboard.platformAcademicSubtitle")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
            }}
          >
            {academicCards.map((card) => (
              <Paper
                key={card.key}
                elevation={0}
                sx={{
                  ...dashboardCardSx,
                  ...accentTop(card.color),
                  p: 2.5,
                }}
              >
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ color: card.color }}>
                  {card.icon}
                  <Typography sx={{ fontWeight: 800, color: "text.primary" }}>
                    {card.label}
                  </Typography>
                </Stack>
                <Typography variant="h4" sx={{ fontWeight: 950, mt: 1.5, color: "text.primary" }}>
                  {stats?.[card.key] ?? 0}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <TrendingUpRoundedIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {t("dashboard.platformOverview")}
              </Typography>
            </Stack>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(59, 130, 246, 0.08)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {t("dashboard.platformActiveUsers")}
                </Typography>
                <Typography sx={{ fontWeight: 900, color: "primary.main" }}>
                  {activePercent}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={activePercent}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.08)",
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {totalUsers - pendingUsers} {t("dashboard.platformActiveOf")} {totalUsers} {t("dashboard.platformTotalUsers")}
              </Typography>
            </Box>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              mt: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {t("dashboard.platformUsersByUniversity")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                {t("dashboard.platformUsersByUniversitySub")}
              </Typography>
            </Box>
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>{t("dashboard.platformColUniversity")}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>{t("dashboard.platformColTotalUsers")}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>{t("dashboard.platformColProjects")}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>{t("dashboard.platformColTracks")}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>{t("dashboard.platformColSchedules")}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>{t("dashboard.platformColCommittees")}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>{t("dashboard.platformColPendingProposals")}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>{t("dashboard.platformColPending")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {universitiesBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        {t("dashboard.noDataYet")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    universitiesBreakdown.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 800 }}>{row.name}</Typography>
                            {!row.is_active && (
                              <Chip
                                size="small"
                                label={t("dashboard.platformInactiveUniversity")}
                                color="default"
                                sx={{ fontWeight: 700, height: 22 }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, color: "#14B8A6" }}>
                          {row.users_total ?? 0}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          {row.projects ?? 0}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          {row.active_tracks ?? row.tracks ?? 0}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          {row.active_schedules ?? 0}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          {row.committees ?? 0}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: "warning.dark" }}>
                          {row.pending_proposals ?? 0}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: "warning.main" }}>
                          {row.pending ?? 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{ mt: 3 }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 0,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.03)"
                      : "#FAFAFA",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SchoolRoundedIcon color="primary" fontSize="small" />
                    <Typography sx={{ fontWeight: 900 }}>
                      {t("dashboard.platformRecentUniversities")}
                    </Typography>
                  </Stack>
                  <Button
                    component={RouterLink}
                    to="/dashboard/universities"
                    size="small"
                    endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                    sx={{ fontWeight: 700 }}
                  >
                    {t("dashboard.viewAll")}
                  </Button>
                </Stack>
              </Box>
              <Box sx={{ p: recentUniversities.length === 0 ? 3 : 0 }}>
                {recentUniversities.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center">
                    {t("dashboard.noDataYet")}
                  </Typography>
                ) : (
                  <Stack divider={<Divider />}>
                    {recentUniversities.map((univ) => (
                      <Stack
                        key={univ.id}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{ p: 2, "&:hover": { bgcolor: "action.hover" } }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "primary.main",
                            color: "#fff",
                            width: 40,
                            height: 40,
                            fontWeight: 700,
                          }}
                        >
                          {univ.name?.charAt(0)?.toUpperCase() || "U"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, ...textEllipsisSx }}>
                            {univ.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("dashboard.platformUsersCount", { count: univ.users_total ?? 0 })}
                          </Typography>
                        </Box>
                        <Button
                          component={RouterLink}
                          to={`/dashboard/universities`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        >
                          {t("common.view")}
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                flex: 1,
                p: 0,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.03)"
                      : "#FAFAFA",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <GroupRoundedIcon color="success" fontSize="small" />
                    <Typography sx={{ fontWeight: 900 }}>
                      {t("dashboard.platformRecentUsers")}
                    </Typography>
                  </Stack>
                  <Button
                    component={RouterLink}
                    to="/dashboard/users"
                    size="small"
                    endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                    sx={{ fontWeight: 700 }}
                  >
                    {t("dashboard.viewAll")}
                  </Button>
                </Stack>
              </Box>
              <Box sx={{ p: recentUsers.length === 0 ? 3 : 0 }}>
                {recentUsers.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center">
                    {t("dashboard.noDataYet")}
                  </Typography>
                ) : (
                  <Stack divider={<Divider />}>
                    {recentUsers.map((user) => (
                      <Stack
                        key={user.id}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{ p: 2, "&:hover": { bgcolor: "action.hover" } }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: user.status === "active" ? "success.main" : "warning.main",
                            color: "#fff",
                            width: 40,
                            height: 40,
                            fontWeight: 700,
                          }}
                        >
                          {user.name?.charAt(0)?.toUpperCase() || "?"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, ...textEllipsisSx }}>
                            {user.name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary" sx={textEllipsisSx}>
                              {user.email}
                            </Typography>
                            <Chip
                              size="small"
                              label={t(`roles.${user.role?.name || user.role || "student"}`)}
                              sx={{ fontWeight: 700, fontSize: 10, height: 20 }}
                            />
                          </Stack>
                        </Box>
                        {getStatusChip(user.status)}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Stack>
        </>
      )}
    </Box>
  );
}
