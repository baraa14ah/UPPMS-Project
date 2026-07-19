import React from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  Switch,
  Typography,
  alpha,
} from "@mui/material";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import { useLanguage } from "../../context/LanguageContext";
import { textEllipsisSx } from "../../styles/textEllipsis";
import { sectionPaperSx } from "../../styles/dashboardUi";
import DoctorAvailabilityPanel from "./DoctorAvailabilityPanel";

/** Supervisor-only profile workspace: universities + defense availability. */
export default function SupervisorProfilePanel({
  memberships = [],
  availabilitySaving = {},
  onToggleAvailability,
}) {
  const { t } = useLanguage();

  const statusChip = (status) => {
    const map = {
      active: { color: "success", label: t("users.statusActive") },
      rejected: { color: "error", label: t("users.statusRejected") },
      pending: { color: "warning", label: t("users.statusPending") },
    };
    const cfg = map[status] || map.pending;
    return (
      <Chip
        size="small"
        color={cfg.color}
        label={cfg.label}
        sx={{ fontWeight: 800, flexShrink: 0 }}
      />
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        ...sectionPaperSx,
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {t("profile.supervisorWorkspaceTitle")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.35, fontWeight: 600, maxWidth: 640 }}
          >
            {t("profile.supervisorWorkspaceSubtitle")}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box
            sx={{
              height: "100%",
              p: 2,
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <SchoolRoundedIcon sx={{ color: "primary.main", fontSize: 22 }} />
              <Typography sx={{ fontWeight: 900 }}>
                {t("profile.supervisorUniversitiesTitle")}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600, lineHeight: 1.65 }}
            >
              {t("profile.supervisorUniversitiesHint")}
            </Typography>

            {memberships.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {t("profile.supervisorNoUniversities")}
              </Alert>
            ) : (
              <Stack spacing={1.25}>
                {memberships.map((uni) => {
                  const isActive = uni.status === "active";
                  const accepting = uni.accepting_supervision !== false;

                  return (
                    <Paper
                      key={uni.id}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        borderRadius: 2,
                        borderColor: isActive && accepting ? "success.main" : "divider",
                        bgcolor: "background.paper",
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography sx={{ fontWeight: 800, ...textEllipsisSx }}>
                            {uni.name}
                          </Typography>
                          {statusChip(uni.status)}
                        </Stack>

                        {isActive && (
                          <FormControlLabel
                            sx={{
                              m: 0,
                              alignItems: "flex-start",
                              width: "100%",
                              p: 1.25,
                              borderRadius: 2,
                              bgcolor: alpha(
                                accepting ? "#10B981" : "#64748B",
                                0.08,
                              ),
                            }}
                            control={
                              <Switch
                                size="small"
                                checked={accepting}
                                disabled={!!availabilitySaving[uni.id]}
                                onChange={(_, checked) =>
                                  onToggleAvailability(uni.id, checked)
                                }
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                  {accepting
                                    ? t("profile.availableForStudents")
                                    : t("profile.unavailableForStudents")}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t("profile.availabilityHint")}
                                </Typography>
                              </Box>
                            }
                          />
                        )}

                        {!isActive && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {uni.status === "pending"
                              ? t("profile.supervisorPendingHint")
                              : t("profile.supervisorRejectedHint")}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Box
            sx={{
              height: "100%",
              p: 2,
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <EventAvailableRoundedIcon
                sx={{ color: "primary.main", fontSize: 22 }}
              />
              <Typography sx={{ fontWeight: 900 }}>
                {t("profile.defenseAvailabilityTitle")}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2, fontWeight: 600, lineHeight: 1.65 }}
            >
              {t("profile.defenseAvailabilityHint")}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <DoctorAvailabilityPanel />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
