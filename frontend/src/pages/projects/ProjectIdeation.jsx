import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Divider,
} from "@mui/material";
import { AutoAwesome, Send, DeleteOutline } from "@mui/icons-material";
import toast from "react-hot-toast";
import PageHeader from "../../components/shared/PageHeader";
import IdeaSuggestionCard from "../../components/projects/IdeaSuggestionCard";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

/** AI project ideation page for students. */
export default function ProjectIdeation() {
  const { t } = useLanguage();
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const navigate = useNavigate();

  const [interests, setInterests] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [previousNames, setPreviousNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const bookmarkedNames = useMemo(
    () => new Set(bookmarks.map((b) => b.suggestion_name)),
    [bookmarks],
  );

  /** Load saved bookmarks for the current student. */
  const loadBookmarks = useCallback(async () => {
    try {
      setBookmarksLoading(true);
      const { res, data } = await apiFetch(`${API_BASE_URL}/ai/bookmarks`, {
        headers: authHeaders(),
      });

      if (res.ok) {
        setBookmarks(data?.data?.bookmarks || []);
      }
    } catch {
      // Non-blocking: suggestions still work if bookmarks fail to load.
    } finally {
      setBookmarksLoading(false);
    }
  }, [API_BASE_URL, apiFetch, authHeaders]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  /** Submit interests to generate AI project suggestions. */
  const handleSubmit = async (e, isRegenerate = false) => {
    if (e?.preventDefault) e.preventDefault();

    if (interests.trim().length < 10) {
      setError(t("ideation.interestsTooShort"));
      return;
    }

    setLoading(true);
    setError("");
    if (!isRegenerate) {
      setSuggestions([]);
      setPreviousNames([]);
    }
    setLoadingMessage(t("ideation.generating"));

    const timer1 = setTimeout(
      () => setLoadingMessage(t("ideation.stillWorking")),
      5000,
    );
    const timer2 = setTimeout(
      () => setLoadingMessage(t("ideation.takingLonger")),
      30000,
    );

    const excludeNames = isRegenerate
      ? [...previousNames, ...suggestions.map((s) => s.name)]
      : [];

    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/ai/suggest-projects`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          interests: interests.trim(),
          exclude_names: excludeNames,
        }),
      });

      if (!res.ok) {
        throw new Error(data?.message || t("ideation.error"));
      }

      if (data?.data?.suggestions) {
        const nextSuggestions = data.data.suggestions;
        setSuggestions(nextSuggestions);
        setPreviousNames((prev) => [
          ...prev,
          ...nextSuggestions.map((s) => s.name),
        ]);
        toast.success(t("ideation.success"));
      }
    } catch (err) {
      const message = err?.message || t("ideation.error");
      setError(message);
      toast.error(message);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setLoading(false);
      setLoadingMessage("");
    }
  };

  /** Opens the proposal form with this idea prefilled (supervisor must approve). */
  const handleAdoptAsProposal = (suggestion) => {
    const title = String(suggestion?.name || "").trim();
    const description = String(suggestion?.goal || "").trim();

    if (!title || description.length < 20) {
      toast.error(t("ideation.descriptionTooShort"));
      return;
    }

    toast.success(t("ideation.adoptRedirect"));
    navigate("/dashboard/proposals", {
      state: {
        prefill: {
          title: title.slice(0, 200),
          description: description.slice(0, 5000),
        },
      },
    });
  };

  const handleDeleteBookmark = async (bookmarkId) => {
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/ai/bookmarks/${bookmarkId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      if (!res.ok) {
        throw new Error(data?.message || t("ideation.bookmarkError"));
      }

      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      toast.success(data?.message || t("ideation.deleteBookmark"));
    } catch (err) {
      toast.error(err?.message || t("ideation.bookmarkError"));
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("ideation.title")}
        subtitle={t("ideation.subtitle")}
        icon={<AutoAwesome />}
      />

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder={t("ideation.placeholder")}
            disabled={loading}
            inputProps={{ maxLength: 500 }}
            helperText={`${interests.length}/500`}
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || interests.trim().length < 10}
            startIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />
            }
            endIcon={!loading && <Send />}
          >
            {loading ? loadingMessage : t("ideation.generate")}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {suggestions.length > 0 && (
        <Stack spacing={3} sx={{ mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {t("ideation.suggestions")}
            </Typography>
            <Button
              variant="outlined"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} /> : <AutoAwesome />
              }
            >
              {t("ideation.regenerate")}
            </Button>
          </Stack>

          {suggestions.map((suggestion, index) => (
            <IdeaSuggestionCard
              key={`${suggestion.name}-${index}`}
              suggestion={suggestion}
              initiallyBookmarked={bookmarkedNames.has(suggestion.name)}
              onBookmarked={loadBookmarks}
              onAdoptAndGenerate={() => handleAdoptAsProposal(suggestion)}
            />
          ))}
        </Stack>
      )}

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {t("ideation.myBookmarks")}
        </Typography>

        {bookmarksLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : bookmarks.length === 0 ? (
          <Typography color="text.secondary">{t("ideation.noBookmarks")}</Typography>
        ) : (
          bookmarks.map((bookmark) => (
            <Paper key={bookmark.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box sx={{ flex: 1, pr: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {bookmark.suggestion_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {bookmark.suggestion_goal}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={t("ideation.deleteBookmark")}
                    onClick={() => handleDeleteBookmark(bookmark.id)}
                  >
                    <DeleteOutline />
                  </IconButton>
                </Stack>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() =>
                    handleAdoptAsProposal({
                      name: bookmark.suggestion_name,
                      goal: bookmark.suggestion_goal,
                    })
                  }
                  sx={{ alignSelf: "flex-start", fontWeight: 800 }}
                >
                  {t("ideation.adoptAndGenerate")}
                </Button>
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Box>
  );
}
