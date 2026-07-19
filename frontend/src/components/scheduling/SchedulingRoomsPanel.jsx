import React from "react";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Delete, MeetingRoom, ArrowForward } from "@mui/icons-material";
import SchedulingSection from "./SchedulingSection";
import { useLanguage } from "../../context/LanguageContext";

/** Step 2 — rooms; premium checkbox marks rooms reserved for last phase + last step only. */
export default function SchedulingRoomsPanel({
  rooms,
  roomForm,
  setRoomForm,
  onAdd,
  addingRoom,
  onDelete,
  deletingRoomId,
  onNext,
}) {
  const { t } = useLanguage();
  const standard = rooms.filter((r) => !r.is_premium);
  const premium = rooms.filter((r) => r.is_premium);

  return (
    <Stack spacing={3}>
      <SchedulingSection title={t("scheduling.rooms.title")} icon={<MeetingRoom fontSize="small" />}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3, bgcolor: "action.hover" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                label={t("scheduling.rooms.name")}
                placeholder={t("scheduling.rooms.namePlaceholder")}
                value={roomForm.name}
                onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label={t("scheduling.rooms.building")}
                placeholder={t("scheduling.rooms.buildingPlaceholder")}
                value={roomForm.building}
                onChange={(e) => setRoomForm((f) => ({ ...f, building: e.target.value }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(roomForm.is_premium)}
                    onChange={(e) =>
                      setRoomForm((f) => ({ ...f, is_premium: e.target.checked }))
                    }
                  />
                }
                label={t("scheduling.rooms.premiumCheckbox")}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={addingRoom ? <CircularProgress size={16} color="inherit" /> : <Add />}
                onClick={onAdd}
                disabled={addingRoom}
                sx={{ fontWeight: 800 }}
              >
                {t("common.add")}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {rooms.length === 0 ? (
          <Alert severity="info">{t("scheduling.rooms.empty")}</Alert>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                {t("scheduling.rooms.standardHeading", { count: standard.length })}
              </Typography>
              <Stack spacing={1}>
                {standard.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("scheduling.rooms.noStandard")}
                  </Typography>
                ) : (
                  standard.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      onDelete={onDelete}
                      deleting={deletingRoomId === room.id}
                    />
                  ))
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                {t("scheduling.rooms.premiumHeading", { count: premium.length })}
              </Typography>
              <Stack spacing={1}>
                {premium.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("scheduling.rooms.noPremium")}
                  </Typography>
                ) : (
                  premium.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      onDelete={onDelete}
                      deleting={deletingRoomId === room.id}
                      premium
                    />
                  ))
                )}
              </Stack>
            </Grid>
          </Grid>
        )}
      </SchedulingSection>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={onNext}
          sx={{ fontWeight: 800, px: 3 }}
        >
          {t("scheduling.rooms.continueToGenerate")}
        </Button>
      </Stack>
    </Stack>
  );
}

function RoomRow({ room, onDelete, deleting, premium }) {
  const { t } = useLanguage();
  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <MeetingRoom fontSize="small" color={premium ? "secondary" : "primary"} />
          <Typography sx={{ fontWeight: 700 }}>{room.name}</Typography>
          {room.building && <Chip size="small" label={room.building} variant="outlined" />}
          {premium && (
            <Chip size="small" label={t("scheduling.rooms.premiumBadge")} color="secondary" />
          )}
        </Stack>
        <IconButton size="small" color="error" onClick={() => onDelete(room.id)} disabled={deleting}>
          {deleting ? <CircularProgress size={18} /> : <Delete fontSize="small" />}
        </IconButton>
      </Stack>
    </Paper>
  );
}
