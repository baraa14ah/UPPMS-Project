import React from "react";
import {
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import { useLanguage } from "../../context/LanguageContext";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Renders committee members with optional edit actions. */
export default function CommitteeMembersList({
  members = [],
  editable = false,
  onRemove,
  onRoleChange,
}) {
  const { t } = useLanguage();

  if (!members.length) {
    return null;
  }

  return (
    <List dense disablePadding>
      {members.map((member) => {
        const isChair = member.role === "chair";

        return (
          <ListItem key={member.id} sx={{ px: 0 }}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: isChair ? "warning.light" : "primary.light" }}>
                {initials(member.name)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={member.name}
              secondary={member.email}
              primaryTypographyProps={{ fontWeight: 700 }}
            />
            <ListItemSecondaryAction>
              <Tooltip
                title={
                  editable
                    ? isChair
                      ? t("committees.member")
                      : t("committees.designateChair")
                    : ""
                }
              >
                <Chip
                  size="small"
                  icon={isChair ? <StarIcon /> : undefined}
                  label={isChair ? t("committees.chair") : t("committees.member")}
                  color={isChair ? "warning" : "default"}
                  onClick={
                    editable && onRoleChange
                      ? () => onRoleChange(member, isChair ? "member" : "chair")
                      : undefined
                  }
                  sx={{ mr: editable && onRemove ? 1 : 0, cursor: editable ? "pointer" : "default" }}
                />
              </Tooltip>
              {editable && onRemove ? (
                <IconButton edge="end" size="small" onClick={() => onRemove(member)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              ) : null}
            </ListItemSecondaryAction>
          </ListItem>
        );
      })}
    </List>
  );
}
