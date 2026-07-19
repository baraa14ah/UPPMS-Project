import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import XmlUploadDropzone from "../XmlUploadDropzone";

function rateColor(rate) {
  if (rate > 70) return "success";
  if (rate >= 30) return "warning";
  return "error";
}

function statusChipColor(status) {
  if (status === "completed") return "success";
  if (status === "failed") return "error";
  return "warning";
}

/** Compact list of comparison rows for one category. */
function ComparisonList({ title, color, items, emptyLabel, t, showNameChange = false }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Chip size="small" color={color} label={`${title}: ${items.length}`} sx={{ fontWeight: 800 }} />
      </Stack>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      ) : (
        <Stack spacing={0.75} sx={{ maxHeight: 180, overflowY: "auto" }}>
          {items.slice(0, 50).map((item, idx) => (
            <Box key={`${item.email}-${idx}`} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {item.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {item.user_type === "student" ? t("xmlImport.typeStudent") : t("xmlImport.typeSupervisor")}
                {" · "}
                {item.email}
                {item.university_number ? ` · ${item.university_number}` : ""}
              </Typography>
              {showNameChange && item.previous_full_name ? (
                <Typography variant="caption" color="warning.main">
                  {t("xmlImport.nameChange", {
                    from: item.previous_full_name,
                    to: item.full_name,
                  })}
                </Typography>
              ) : null}
            </Box>
          ))}
          {items.length > 50 ? (
            <Typography variant="caption" color="text.secondary">
              +{items.length - 50}
            </Typography>
          ) : null}
        </Stack>
      )}
    </Paper>
  );
}

/** XML import panel embedded in user management. */
export default function XmlImportPanel() {
  const { apiFetch, authHeaders, API_BASE_URL } = useAuth();
  const { t } = useLanguage();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [importHistory, setImportHistory] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [importDetails, setImportDetails] = useState(null);

  const loadStatistics = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/admin/xml-import/statistics`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        setStatistics(data?.data ?? null);
      } else {
        throw new Error(data?.message || t("xmlImport.loadStatsFailed"));
      }
    } catch (err) {
      setError(err.message || t("common.serverError"));
    } finally {
      setLoadingStats(false);
    }
  }, [apiFetch, authHeaders, API_BASE_URL, t]);

  const loadHistory = useCallback(
    async (page = 1) => {
      setLoadingHistory(true);
      try {
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/admin/xml-import/history?per_page=15&page=${page}`,
          { headers: authHeaders() },
        );
        if (res.ok) {
          setImportHistory(data?.data?.imports ?? []);
          setPagination(data?.data?.pagination ?? null);
        } else {
          throw new Error(data?.message || t("xmlImport.loadHistoryFailed"));
        }
      } catch (err) {
        setError(err.message || t("common.serverError"));
      } finally {
        setLoadingHistory(false);
      }
    },
    [apiFetch, authHeaders, API_BASE_URL, t],
  );

  useEffect(() => {
    loadStatistics();
    loadHistory();
  }, [loadStatistics, loadHistory]);

  const runPreview = useCallback(
    async (file) => {
      if (!file) {
        setPreview(null);
        return;
      }

      setPreviewLoading(true);
      setPreview(null);
      setUploadResult(null);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("xml_file", file);
        const { res, data } = await apiFetch(`${API_BASE_URL}/admin/xml-import/preview`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
        if (!res.ok) {
          throw new Error(
            data?.errors?.xml_file?.[0] || data?.message || t("xmlImport.compareFailed"),
          );
        }
        setPreview(data?.data ?? null);
      } catch (err) {
        setSelectedFile(null);
        setPreview(null);
        setError(err.message || t("xmlImport.compareFailed"));
        toast.error(err.message || t("xmlImport.compareFailed"));
      } finally {
        setPreviewLoading(false);
      }
    },
    [API_BASE_URL, apiFetch, authHeaders, t],
  );

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    runPreview(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setUploadResult(null);
  };

  const handleRefresh = () => {
    loadStatistics();
    loadHistory(pagination?.current_page ?? 1);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("xml_file", selectedFile);

      const { res, data } = await apiFetch(`${API_BASE_URL}/admin/xml-import`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const msg =
          data?.errors?.xml_file?.[0] || data?.message || t("xmlImport.uploadFailed");
        throw new Error(msg);
      }

      setUploadResult(data?.data ?? null);
      setSelectedFile(null);
      setPreview(null);

      const successCount = data?.data?.success_count ?? 0;
      const errorCount = data?.data?.error_count ?? 0;
      if (errorCount > 0) {
        toast.success(
          t("xmlImport.uploadPartial", { success: successCount, errors: errorCount }),
        );
      } else {
        toast.success(t("xmlImport.uploadSuccess", { count: successCount }));
      }

      await Promise.all([loadStatistics(), loadHistory()]);
    } catch (err) {
      setError(err.message || t("xmlImport.uploadFailed"));
      toast.error(err.message || t("xmlImport.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const openImportDetails = async (importId) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setImportDetails(null);

    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/admin/xml-import/${importId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        throw new Error(data?.message || t("xmlImport.detailsFailed"));
      }
      setImportDetails(data?.data ?? null);
    } catch (err) {
      toast.error(err.message || t("xmlImport.detailsFailed"));
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const renderStatCard = (title, stats) => {
    if (!stats) return null;
    const rate = stats.registration_rate ?? 0;

    return (
      <Paper sx={{ p: 2.5, height: "100%" }} elevation={0} variant="outlined">
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {stats.total}
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          <Typography variant="body2">
            {t("xmlImport.registered")}: {stats.registered}
          </Typography>
          <Typography variant="body2">
            {t("xmlImport.available")}: {stats.available}
          </Typography>
        </Stack>
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(rate, 100)}
            color={rateColor(rate)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>
    );
  };

  const comparison = preview?.comparison;
  const summary = comparison?.summary;
  const noDiff =
    summary &&
    summary.new === 0 &&
    summary.updated === 0 &&
    summary.removed === 0 &&
    summary.unchanged > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loadingStats || loadingHistory}
          size="small"
          sx={{ fontWeight: 700 }}
        >
          {t("common.refresh")}
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
          {t("xmlImport.uploadSection")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("xmlImport.compareHint")}
        </Typography>
        <XmlUploadDropzone
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          disabled={uploading || previewLoading}
        />

        {previewLoading ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">{t("xmlImport.compareLoading")}</Typography>
          </Stack>
        ) : null}

        {comparison ? (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5 }}>
              {t("xmlImport.compareSection")}
            </Typography>
            {noDiff ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("xmlImport.noChanges")}
              </Alert>
            ) : null}
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              useFlexGap
              flexWrap="wrap"
            >
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <ComparisonList
                  title={t("xmlImport.compareNew")}
                  color="success"
                  items={comparison.new || []}
                  emptyLabel="—"
                  t={t}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <ComparisonList
                  title={t("xmlImport.compareUnchanged")}
                  color="default"
                  items={comparison.unchanged || []}
                  emptyLabel="—"
                  t={t}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <ComparisonList
                  title={t("xmlImport.compareUpdated")}
                  color="warning"
                  items={comparison.updated || []}
                  emptyLabel="—"
                  t={t}
                  showNameChange
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <ComparisonList
                  title={t("xmlImport.compareRemoved")}
                  color="error"
                  items={comparison.removed || []}
                  emptyLabel="—"
                  t={t}
                />
              </Box>
            </Stack>
            {(comparison.removed || []).length > 0 ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {t("xmlImport.compareRemovedHint")}
              </Alert>
            ) : null}
          </Box>
        ) : null}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading || previewLoading || !preview}
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ fontWeight: 800 }}
          >
            {uploading ? t("common.executing") : t("xmlImport.confirmImport")}
          </Button>
          {selectedFile ? (
            <Button variant="outlined" onClick={clearFile} disabled={uploading} sx={{ fontWeight: 700 }}>
              {t("xmlImport.clearPreview")}
            </Button>
          ) : null}
        </Stack>

        {uploadResult ? (
          <Alert severity={uploadResult.error_count > 0 ? "warning" : "success"} sx={{ mt: 2 }}>
            {uploadResult.error_count > 0
              ? t("xmlImport.uploadPartial", {
                  success: uploadResult.success_count,
                  errors: uploadResult.error_count,
                })
              : t("xmlImport.uploadSuccess", { count: uploadResult.success_count })}
            {uploadResult.comparison?.summary ? (
              <Typography variant="body2" sx={{ mt: 0.75 }}>
                {t("xmlImport.compareNew")}: {uploadResult.comparison.summary.new}
                {" · "}
                {t("xmlImport.compareUnchanged")}: {uploadResult.comparison.summary.unchanged}
                {" · "}
                {t("xmlImport.compareUpdated")}: {uploadResult.comparison.summary.updated}
              </Typography>
            ) : null}
          </Alert>
        ) : null}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>
          {t("xmlImport.statisticsSection")}
        </Typography>
        {loadingStats ? (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={140} sx={{ flex: 1 }} />
            ))}
          </Stack>
        ) : (
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 2.5, height: "100%" }} variant="outlined">
                <Typography variant="subtitle2" color="text.secondary">
                  {t("xmlImport.totalAuthorized")}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {statistics?.total_authorized ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t("xmlImport.overallRate")}: {statistics?.overall_registration_rate ?? 0}%
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: 1 }}>{renderStatCard(t("xmlImport.students"), statistics?.students)}</Box>
            <Box sx={{ flex: 1 }}>{renderStatCard(t("xmlImport.supervisors"), statistics?.supervisors)}</Box>
          </Stack>
        )}
      </Paper>

      <Paper sx={{ p: 3 }} variant="outlined">
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>
          {t("xmlImport.historySection")}
        </Typography>
        {loadingHistory ? (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("xmlImport.date")}</TableCell>
                  <TableCell>{t("xmlImport.filename")}</TableCell>
                  <TableCell align="right">{t("xmlImport.records")}</TableCell>
                  <TableCell align="right">{t("xmlImport.success")}</TableCell>
                  <TableCell align="right">{t("xmlImport.errors")}</TableCell>
                  <TableCell>{t("common.status")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {t("xmlImport.noImports")}
                    </TableCell>
                  </TableRow>
                ) : (
                  importHistory.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => openImportDetails(row.id)}
                    >
                      <TableCell>
                        {row.uploaded_at ? new Date(row.uploaded_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>{row.filename}</TableCell>
                      <TableCell align="right">{row.total_records}</TableCell>
                      <TableCell align="right">{row.success_count}</TableCell>
                      <TableCell align="right">{row.error_count}</TableCell>
                      <TableCell>
                        <Chip size="small" label={row.status} color={statusChipColor(row.status)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination && pagination.total_pages > 1 ? (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="center">
                <Button
                  size="small"
                  disabled={pagination.current_page <= 1}
                  onClick={() => loadHistory(pagination.current_page - 1)}
                >
                  {t("xmlImport.prevPage")}
                </Button>
                <Typography variant="body2" sx={{ alignSelf: "center" }}>
                  {pagination.current_page} / {pagination.total_pages}
                </Typography>
                <Button
                  size="small"
                  disabled={pagination.current_page >= pagination.total_pages}
                  onClick={() => loadHistory(pagination.current_page + 1)}
                >
                  {t("xmlImport.nextPage")}
                </Button>
              </Stack>
            ) : null}
          </>
        )}
      </Paper>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {t("xmlImport.importDetails")}
          <IconButton onClick={() => setDetailsOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <CircularProgress size={28} />
          ) : importDetails ? (
            <Stack spacing={2}>
              <Typography variant="body2">
                <strong>{t("xmlImport.filename")}:</strong> {importDetails.filename}
              </Typography>
              {(importDetails.errors ?? []).length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("xmlImport.row")}</TableCell>
                      <TableCell>{t("xmlImport.field")}</TableCell>
                      <TableCell>{t("xmlImport.errorMessage")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importDetails.errors.map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{err.row ?? "—"}</TableCell>
                        <TableCell>{err.field ?? "—"}</TableCell>
                        <TableCell>{err.message ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert severity="success">{t("xmlImport.noImportErrors")}</Alert>
              )}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
