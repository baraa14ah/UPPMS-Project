import React from "react";
import { Chip } from "@mui/material";
import { useLanguage } from "../context/LanguageContext";

const STATUS_COLORS = {
  pending: "warning",
  approved: "success",
  rejected: "error",
};

/** Status chip for project proposal lifecycle states. */
export default function ProposalStatusBadge({ status }) {
  const { t } = useLanguage();
  const normalized = String(status || "pending").toLowerCase();

  return (
    <Chip
      size="small"
      color={STATUS_COLORS[normalized] || "default"}
      label={t(`proposals.${normalized}`, normalized)}
    />
  );
}
