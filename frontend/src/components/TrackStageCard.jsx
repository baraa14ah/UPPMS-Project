import React from "react";
import {
  Card,
  CardContent,
  IconButton,
  Stack,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useLanguage } from "../context/LanguageContext";

/** Single stage row inside the track builder with reorder and edit actions. */
export default function TrackStageCard({
  stage,
  index,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) {
  const { t } = useLanguage();

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label={index + 1} size="small" color="primary" sx={{ fontWeight: 800 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
              {stage.name || t("tracks.unnamedStage")}
            </Typography>
            {stage.academic_stage_name && (
              <Typography variant="caption" color="text.secondary" display="block">
                {stage.academic_stage_name}
              </Typography>
            )}
            <Chip
              size="small"
              label={
                stage.is_decisive !== false
                  ? t("tracks.decisiveStage")
                  : t("tracks.nonDecisiveStage")
              }
              color={stage.is_decisive !== false ? "secondary" : "default"}
              variant="outlined"
              sx={{ mt: 0.5, height: 20, fontSize: "0.65rem", fontWeight: 700 }}
            />
          </Box>
          <IconButton size="small" onClick={onMoveUp} disabled={isFirst} aria-label="move up">
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onMoveDown} disabled={isLast} aria-label="move down">
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
          {onEdit && (
            <IconButton size="small" onClick={onEdit} aria-label="edit">
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton size="small" color="error" onClick={onDelete} aria-label="delete">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
