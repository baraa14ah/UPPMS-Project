import React from "react";
import {
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { isMandatoryStage } from "../../utils/schedulingFormUtils";
import { useLanguage } from "../../context/LanguageContext";
import { sectionPaperSx } from "../../styles/dashboardUi";

/** Compact bar: selected defense type + single status chip. */
export default function SchedulingContextBar({
  stages,
  selectedStageId,
  onSelectStage,
  readiness,
  stageStatus,
}) {
  const { t } = useLanguage();
  const selectedStage = stages.find((s) => String(s.id) === String(selectedStageId));
  const mandatory = selectedStage && isMandatoryStage(selectedStage);

  let statusChip = null;
  if (stageStatus?.has_active_schedule) {
    statusChip = (
      <Chip size="small" label={t("scheduling.approvedSchedule")} color="success" sx={{ fontWeight: 800 }} />
    );
  } else if (readiness?.ready_to_generate) {
    statusChip = (
      <Chip size="small" label={t("scheduling.readyToGenerate")} color="primary" sx={{ fontWeight: 800 }} />
    );
  } else {
    statusChip = (
      <Chip size="small" label={t("scheduling.notReady")} color="warning" variant="outlined" sx={{ fontWeight: 800 }} />
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        ...sectionPaperSx,
        mb: 3,
        p: { xs: 1.5, md: 2 },
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
      >
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 280 }, flex: 1 }}>
          <InputLabel>{t("scheduling.defenseType")}</InputLabel>
          <Select
            value={selectedStageId}
            label={t("scheduling.defenseType")}
            onChange={(e) => onSelectStage(e.target.value)}
          >
            {stages.map((stage) => (
              <MenuItem key={stage.id} value={String(stage.id)}>
                {stage.name}
                {stage.is_system_stage ? ` (${t("scheduling.systemType")})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {mandatory ? (
            <Chip size="small" label={t("scheduling.mandatorySlots")} variant="outlined" sx={{ fontWeight: 700 }} />
          ) : selectedStage?.availability_open ? (
            <Chip size="small" label={t("scheduling.supervisorOpen")} color="success" variant="outlined" sx={{ fontWeight: 700 }} />
          ) : selectedStage ? (
            <Chip size="small" label={t("scheduling.supervisorClosed")} variant="outlined" sx={{ fontWeight: 700 }} />
          ) : null}
          {statusChip}
        </Stack>
      </Stack>
    </Paper>
  );
}
