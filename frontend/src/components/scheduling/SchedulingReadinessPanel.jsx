import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  CheckCircle,
  RadioButtonUnchecked,
  Groups,
  MeetingRoom,
  School,
  EventAvailable,
  ArrowForward,
} from "@mui/icons-material";
import SchedulingSection from "./SchedulingSection";
import { isMandatoryStage } from "../../utils/schedulingFormUtils";
import { useLanguage } from "../../context/LanguageContext";

function CheckItem({ ok, title, detail, action }) {
  return (
    <ListItem
      sx={{
        px: 0,
        py: 1,
        alignItems: "flex-start",
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
        {ok ? <CheckCircle color="success" /> : <RadioButtonUnchecked color="disabled" />}
      </ListItemIcon>
      <ListItemText
        primary={<Typography sx={{ fontWeight: 800 }}>{title}</Typography>}
        secondary={detail}
      />
      {action}
    </ListItem>
  );
}

/** Step 3 — readiness checklist with supervisor progress. */
export default function SchedulingReadinessPanel({
  readiness,
  selectedStage,
  onOpenAvailability,
  openingAvailabilityStageId,
  onNext,
}) {
  const { t } = useLanguage();

  if (!readiness) {
    return (
      <SchedulingSection
        title={t("scheduling.readinessTitle")}
        subtitle={t("scheduling.readinessLoading")}
      >
        <LinearProgress />
      </SchedulingSection>
    );
  }

  const mandatory = selectedStage && isMandatoryStage(selectedStage);
  const roomsOk = (readiness.effective_rooms_count ?? readiness.rooms_count ?? 0) > 0;
  const projectsOk = readiness.projects_with_supervisor_count > 0;
  const tracksEnabled = readiness.tracks_enabled;
  const linkedTrackStages = readiness.linked_track_stages_count ?? 0;
  const facultyOk = readiness.faculty_with_availability_count > 0;
  const periodOk = Boolean(
    selectedStage?.defense_period_start && selectedStage?.defense_period_end,
  );
  const mandatoryOk =
    !mandatory || (readiness.stage?.mandatory_slots?.length ?? 0) > 0;
  const supervisorsOk = mandatory || facultyOk;

  const supervisorPct =
    readiness.supervisors_total > 0
      ? Math.round(
          ((readiness.supervisors_submitted || 0) / readiness.supervisors_total) * 100,
        )
      : 0;

  return (
    <Stack spacing={3}>
      <SchedulingSection
        title={t("scheduling.readinessTitle")}
        icon={<EventAvailable fontSize="small" />}
        action={
          <Chip
            label={
              readiness.ready_to_generate
                ? t("scheduling.readinessReady")
                : t("scheduling.readinessIncomplete")
            }
            color={readiness.ready_to_generate ? "success" : "warning"}
            sx={{ fontWeight: 800 }}
          />
        }
      >
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            {
              label: t("scheduling.readinessStatProjects"),
              value: readiness.projects_with_supervisor_count,
              icon: <School />,
            },
            {
              label: t("scheduling.readinessStatSupervisors"),
              value: readiness.faculty_with_availability_count,
              icon: <Groups />,
            },
            {
              label: t("scheduling.readinessStatRooms"),
              value: readiness.effective_rooms_count ?? readiness.rooms_count ?? 0,
              icon: <MeetingRoom />,
            },
          ].map((stat) => (
            <Grid item xs={12} sm={4} key={stat.label}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: "center" }}>
                <Box sx={{ color: "primary.main", mb: 0.5 }}>{stat.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {tracksEnabled && linkedTrackStages === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t("scheduling.noLinkedTrackStages")}
          </Alert>
        )}

        <List disablePadding>
          <CheckItem
            ok={periodOk}
            title={t("scheduling.readinessPeriodTitle")}
            detail={
              periodOk
                ? `${String(selectedStage.defense_period_start).slice(0, 10)} → ${String(selectedStage.defense_period_end).slice(0, 10)}`
                : t("scheduling.readinessPeriodMissing")
            }
          />
          <CheckItem
            ok={projectsOk}
            title={t("scheduling.eligibleProjectsTitle")}
            detail={
              projectsOk
                ? t("scheduling.eligibleProjectsDetail", {
                    count: readiness.projects_with_supervisor_count,
                  })
                : tracksEnabled
                  ? t("scheduling.noEligibleProjects")
                  : t("scheduling.noSupervisedProjects")
            }
          />
          <CheckItem
            ok={roomsOk}
            title={t("scheduling.readinessRoomsTitle")}
            detail={
              mandatory
                ? t("scheduling.readinessRoomsPremium")
                : t("scheduling.readinessRoomsStandard")
            }
          />
          {mandatory ? (
            <CheckItem
              ok={mandatoryOk}
              title={t("scheduling.readinessMandatoryTitle")}
              detail={
                mandatoryOk
                  ? t("scheduling.readinessMandatoryOk")
                  : t("scheduling.readinessMandatoryMissing")
              }
            />
          ) : (
            <CheckItem
              ok={supervisorsOk}
              title={t("scheduling.readinessSupervisorRegTitle")}
              detail={
                readiness.supervisors_total != null
                  ? t("scheduling.readinessSupervisorRegProgress", {
                      submitted: readiness.supervisors_submitted,
                      total: readiness.supervisors_total,
                      pending: readiness.supervisors_pending || 0,
                    })
                  : t("scheduling.readinessSupervisorRegOpen")
              }
              action={
                selectedStage &&
                !selectedStage.availability_open &&
                periodOk && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onOpenAvailability(selectedStage.id)}
                    disabled={openingAvailabilityStageId === selectedStage.id}
                  >
                    {t("scheduling.generate.readiness.openSupervisorRegistration")}
                  </Button>
                )
              }
            />
          )}
        </List>

        {!mandatory && readiness.supervisors_total > 0 && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={supervisorPct} sx={{ height: 10, borderRadius: 99 }} />
          </Box>
        )}
      </SchedulingSection>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={onNext}
          disabled={!readiness.ready_to_generate}
        >
          {t("scheduling.rooms.continueToGenerate")}
        </Button>
      </Stack>
    </Stack>
  );
}
