import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import PageHeader from "../../components/shared/PageHeader";
import ProgressTimelineChart from "../../components/tracks/ProgressTimelineChart";
import { dashboardCardSx, sectionPaperSx } from "../../styles/dashboardUi";

/** Student page showing academic track progress timeline and history. */
export default function StudentProgressTimeline() {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t } = useLanguage();

  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/student-progress`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        setError(data?.message || t("common.error"));
        return;
      }
      setProgress(data?.data || null);
    } catch {
      setError(t("common.serverError"));
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, apiFetch, authHeaders, t]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return (
    <Box sx={{ maxWidth: 1320, mx: "auto" }}>
      <PageHeader
        title={t("progress.title")}
        subtitle={t("progress.subtitle")}
        icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button onClick={loadProgress}>{t("common.retry")}</Button>}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper sx={{ ...dashboardCardSx, p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">{t("common.loading")}</Typography>
        </Paper>
      ) : !progress?.track ? (
        <Paper sx={{ ...sectionPaperSx, p: { xs: 3, md: 4 } }}>
          <Stack spacing={2} alignItems="flex-start">
            <SchoolRoundedIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {t("progress.noTrackTitle")}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ maxWidth: 560, lineHeight: 1.7 }}
            >
              {t("progress.noTrackBody")}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                component={RouterLink}
                to="/dashboard/proposals"
                variant="contained"
                sx={{ fontWeight: 800 }}
              >
                {t("progress.submitProposalCta")}
              </Button>
              <Button
                component={RouterLink}
                to="/dashboard/profile"
                variant="outlined"
                sx={{ fontWeight: 800 }}
              >
                {t("progress.viewProfileCta")}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <ProgressTimelineChart
          track={progress.track}
          timeline={progress.timeline || []}
          phases={progress.phases || []}
          history={progress.history || []}
          currentStage={progress.current_stage}
          overallStatus={progress.status}
          completionPercent={progress.completion_percent}
        />
      )}
    </Box>
  );
}
