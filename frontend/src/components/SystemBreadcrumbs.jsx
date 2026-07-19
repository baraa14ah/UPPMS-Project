import React from "react";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { Breadcrumbs, Link, Typography, Box } from "@mui/material";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import { useLanguage } from "../context/LanguageContext";
import { textEllipsisSx } from "../styles/textEllipsis";

/** Path segment → i18n key. Hyphenated routes included. */
const ROUTE_KEYS = {
  dashboard: "breadcrumbs.dashboard",
  projects: "breadcrumbs.projects",
  notifications: "breadcrumbs.notifications",
  profile: "breadcrumbs.profile",
  users: "breadcrumbs.users",
  universities: "breadcrumbs.universities",
  invitations: "breadcrumbs.invitations",
  supervisor: "breadcrumbs.invitations",
  student: "breadcrumbs.invitations",
  scheduling: "breadcrumbs.scheduling",
  committees: "breadcrumbs.committees",
  tracks: "breadcrumbs.tracks",
  ideation: "breadcrumbs.ideation",
  proposals: "breadcrumbs.proposals",
  "my-schedule": "breadcrumbs.mySchedule",
  "my-progress": "breadcrumbs.myProgress",
  "proposal-review": "breadcrumbs.proposalReview",
  "xml-import": "breadcrumbs.xmlImport",
  "platform-users": "breadcrumbs.platformUsers",
  "platform-projects": "breadcrumbs.platformProjects",
};

/** Renders translated breadcrumb trail from the current route path. */
export default function SystemBreadcrumbs({ embedded = false }) {
  const location = useLocation();
  const { t, dir } = useLanguage();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const isRtl = dir === "rtl";

  if (pathnames.length <= 1) return null;

  const fontSize = embedded ? "0.875rem" : "0.9rem";
  const Separator = isRtl ? NavigateBeforeRoundedIcon : NavigateNextRoundedIcon;

  return (
    <Box
      sx={{
        mb: embedded ? 0 : 1.5,
        maxWidth: embedded ? "none" : 1400,
        mx: embedded ? 0 : "auto",
        width: "100%",
        minWidth: 0,
      }}
    >
      <Breadcrumbs
        separator={<Separator sx={{ fontSize: 14 }} />}
        aria-label={t("breadcrumbs.aria")}
        dir={dir}
        sx={{
          "& .MuiBreadcrumbs-ol": { flexWrap: embedded ? "nowrap" : "wrap" },
          "& .MuiBreadcrumbs-li": { minWidth: 0 },
        }}
      >
        {pathnames.map((value, index) => {
          const isLast = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isId = !Number.isNaN(Number(value));
          const key = ROUTE_KEYS[value];
          let displayName = key ? t(key) : value.replace(/-/g, " ");
          if (isId) displayName = t("breadcrumbs.details");

          if (isLast) {
            return (
              <Typography
                color="text.primary"
                key={to}
                sx={{ fontWeight: 700, fontSize, ...textEllipsisSx }}
              >
                {displayName}
              </Typography>
            );
          }

          return (
            <Link
              component={RouterLink}
              underline="hover"
              color="text.secondary"
              to={to}
              key={to}
              sx={{ fontSize, fontWeight: 600, ...textEllipsisSx }}
            >
              {displayName}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
