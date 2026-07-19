import React from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { Link as RouterLink } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import ProposalStatusBadge from "./ProposalStatusBadge";
import {
  dashboardCardSx,
  accentTop,
  btnPrimarySx,
} from "../styles/dashboardUi";

const STATUS_COLORS = {
  pending: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
};

/** Card displaying a project proposal summary and optional review actions. */
export default function ProposalCard({
  proposal,
  onApprove,
  onReject,
  onReassign,
  onView,
  onDelete,
  onResubmit,
  showActions = false,
  showDelete = false,
  userRole = "",
  variant = "default",
  selected = false,
}) {
  const { t, lang } = useLanguage();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
  const role = String(userRole || "").toLowerCase();
  const isPending = proposal?.status === "pending";
  const isRejected = proposal?.status === "rejected";
  const isRich = variant === "dashboard";
  const accent = STATUS_COLORS[proposal?.status] || "#8B5CF6";

  const primaryName =
    role === "student"
      ? proposal?.requested_supervisor?.name ||
        proposal?.requestedSupervisor?.name
      : proposal?.student?.name;

  return (
    <Card
      elevation={0}
      sx={
        isRich
          ? {
              ...dashboardCardSx,
              ...accentTop(accent),
              height: "100%",
              display: "flex",
              flexDirection: "column",
              ...(selected && {
                borderColor: "primary.main",
                boxShadow: (theme) =>
                  `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`,
              }),
            }
          : {
              height: "100%",
              borderRadius: 3,
              border: "1px solid",
              borderColor: selected ? "primary.main" : "divider",
              display: "flex",
              flexDirection: "column",
            }
      }
    >
      <CardContent
        sx={{
          p: 2.5,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          "&:last-child": { pb: 1.5 },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
          sx={{ mb: 1.25 }}
        >
          <Typography sx={{ fontWeight: 900, fontSize: "1.02rem", lineHeight: 1.4, flex: 1 }}>
            {proposal?.title}
          </Typography>
          <ProposalStatusBadge status={proposal?.status} />
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
          <PersonRoundedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
            {role === "student"
              ? `${t("projects.supervisor")}: ${primaryName || "—"}`
              : `${t("projects.owner")}: ${primaryName || "—"}`}
          </Typography>
        </Stack>

        {proposal?.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.25,
              flex: 1,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: 1.65,
            }}
          >
            {proposal.description}
          </Typography>
        )}

        {proposal?.supervisor_feedback && isRejected && (
          <Box
            sx={{
              mb: 1,
              p: 1.25,
              borderRadius: 2,
              bgcolor: alpha("#EF4444", 0.08),
              border: "1px solid",
              borderColor: alpha("#EF4444", 0.2),
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "#EF4444" }}>
              {t("proposals.rejectedHint")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              {proposal.supervisor_feedback}
            </Typography>
          </Box>
        )}

        {proposal?.resubmission_count > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t("proposals.resubmissionCount", { count: proposal.resubmission_count })}
          </Typography>
        )}

        {proposal?.created_at && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.75, fontWeight: 600 }}>
            {new Date(proposal.created_at).toLocaleDateString(dateLocale, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0, gap: 1, flexWrap: "wrap" }}>
        {onView && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onView(proposal)}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {t("common.view")}
          </Button>
        )}

        {isRejected && onResubmit && (
          <Button
            size="small"
            variant="contained"
            startIcon={<EditRoundedIcon />}
            onClick={() => onResubmit(proposal)}
            sx={{ ...btnPrimarySx, borderRadius: 2 }}
          >
            {t("proposals.modifyResubmit")}
          </Button>
        )}

        {proposal?.project?.id && (
          <Button
            component={RouterLink}
            to={`/dashboard/projects/${proposal.project.id}`}
            size="small"
            variant="contained"
            endIcon={<OpenInNewRoundedIcon />}
            sx={{ ...btnPrimarySx, borderRadius: 2 }}
          >
            {t("proposals.openProject")}
          </Button>
        )}

        {showDelete && proposal?.status !== "approved" && (
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineRoundedIcon />}
            onClick={() => onDelete?.(proposal)}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            {t("proposals.deleteProposal")}
          </Button>
        )}

        {showActions && isPending && role === "supervisor" && (
          <>
            <Button size="small" color="success" variant="contained" onClick={() => onApprove?.(proposal)} sx={{ fontWeight: 800 }}>
              {t("proposals.approve")}
            </Button>
            <Button size="small" color="error" variant="outlined" onClick={() => onReject?.(proposal)} sx={{ fontWeight: 800 }}>
              {t("proposals.reject")}
            </Button>
          </>
        )}

        {showActions && isPending && role === "admin" && (
          <Button size="small" color="primary" onClick={() => onReassign?.(proposal)} sx={{ fontWeight: 800 }}>
            {t("proposals.reassign")}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
