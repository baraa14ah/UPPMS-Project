import React from "react";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useLanguage } from "../context/LanguageContext";
import { dashboardCardSx } from "../styles/dashboardUi";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Summary card for a defense committee in the admin list. */
export default function CommitteeCard({
  committee,
  onEdit,
  onDeactivate,
  onReactivate,
}) {
  const { t } = useLanguage();
  const members = committee.members || [];

  return (
    <Card
      elevation={0}
      sx={{
        ...dashboardCardSx,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        opacity: committee.is_active ? 1 : 0.85,
        "&:hover": { boxShadow: 2 },
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
              color: "success.dark",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <GroupsRoundedIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.3 }} noWrap>
                {committee.name}
              </Typography>
              <Chip
                size="small"
                label={committee.is_active ? t("committees.active") : t("committees.inactive")}
                color={committee.is_active ? "success" : "default"}
                sx={{ fontWeight: 800 }}
              />
            </Stack>
            {committee.description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.5 }}>
                {committee.description}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        <Divider sx={{ my: 1.75 }} />

        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              {t("committees.members")}:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {committee.member_count ?? members.length}
            </Typography>
          </Stack>
          {committee.chair?.name ? (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <StarRoundedIcon sx={{ fontSize: 16, color: "warning.main" }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {committee.chair.name}
              </Typography>
            </Stack>
          ) : null}
          {members.length > 0 ? (
            <AvatarGroup
              max={5}
              sx={{
                justifyContent: "flex-start",
                "& .MuiAvatar-root": {
                  width: 30,
                  height: 30,
                  fontSize: 12,
                  border: "2px solid",
                  borderColor: "background.paper",
                },
              }}
            >
              {members.map((member) => (
                <Avatar key={member.id} sx={{ width: 30, height: 30, fontSize: 12 }}>
                  {initials(member.name)}
                </Avatar>
              ))}
            </AvatarGroup>
          ) : null}
        </Stack>
      </CardContent>

      <Divider />
      <CardActions sx={{ px: 2, py: 1.25, justifyContent: "flex-end", flexWrap: "wrap", gap: 0.5 }}>
        <Button size="small" onClick={() => onEdit?.(committee)} sx={{ fontWeight: 700 }}>
          {t("common.edit")}
        </Button>
        {committee.is_active ? (
          <Button size="small" color="warning" onClick={() => onDeactivate?.(committee)} sx={{ fontWeight: 700 }}>
            {t("committees.deactivate")}
          </Button>
        ) : (
          <Button size="small" color="primary" onClick={() => onReactivate?.(committee)} sx={{ fontWeight: 700 }}>
            {t("committees.reactivate")}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
