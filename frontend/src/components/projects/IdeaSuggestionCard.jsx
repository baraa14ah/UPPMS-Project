import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Stack,
  IconButton,
  Collapse,
  Tooltip,
  CircularProgress,
  Box,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import {
  ExpandMore,
  ExpandLess,
  Bookmark,
  BookmarkBorder,
  DescriptionOutlined,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { textEllipsisSx } from "../../styles/textEllipsis";

/** Expandable AI suggestion card with bookmark action. */
export default function IdeaSuggestionCard({
  suggestion,
  onBookmarked,
  initiallyBookmarked = false,
  onAdoptAndGenerate,
  isAdopting = false,
  adoptDisabled = false,
}) {
  const { t } = useLanguage();
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  useEffect(() => {
    setBookmarked(initiallyBookmarked);
  }, [initiallyBookmarked]);

  /** Save this suggestion to the student's bookmarks. */
  const handleBookmark = async () => {
    if (bookmarked || bookmarking) return;

    setBookmarking(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/ai/bookmarks`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: suggestion.name,
          goal: suggestion.goal,
          technologies: Array.isArray(suggestion.technologies)
            ? suggestion.technologies
            : [],
        }),
      });

      if (!res.ok) {
        throw new Error(data?.message || t("ideation.bookmarkError"));
      }

      setBookmarked(true);
      toast.success(data?.message || t("ideation.bookmarked"));
      if (onBookmarked) onBookmarked(suggestion);
    } catch (err) {
      toast.error(err?.message || t("ideation.bookmarkError"));
    } finally {
      setBookmarking(false);
    }
  };

  return (
    <Card sx={{ "&:hover": { boxShadow: 4 }, transition: "box-shadow 0.2s" }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
            {suggestion.name}
          </Typography>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Stack>

        <Collapse in={expanded} timeout="auto">
          <Typography variant="body1" color="text.secondary" sx={{ my: 2 }}>
            {suggestion.goal}
          </Typography>
        </Collapse>

        {!expanded && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ...textEllipsisSx }}>
            {suggestion.goal}
          </Typography>
        )}

      </CardContent>

      <CardActions sx={{ flexDirection: "column", alignItems: "stretch", pt: 0, px: 2, pb: 2 }}>
        {onAdoptAndGenerate && (
          <LoadingButton
            variant="contained"
            color="primary"
            startIcon={<DescriptionOutlined />}
            loading={isAdopting}
            loadingPosition="start"
            disabled={adoptDisabled || isAdopting}
            onClick={onAdoptAndGenerate}
            fullWidth
            sx={{ mb: 1 }}
          >
            {isAdopting ? t("ideation.adopting") : t("ideation.adoptAndGenerate")}
          </LoadingButton>
        )}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Tooltip
            title={
              bookmarked
                ? t("ideation.alreadyBookmarked")
                : t("ideation.bookmark")
            }
          >
            <span>
              <IconButton
                onClick={handleBookmark}
                disabled={bookmarking || bookmarked || adoptDisabled}
                color={bookmarked ? "primary" : "default"}
              >
                {bookmarking ? (
                  <CircularProgress size={20} />
                ) : bookmarked ? (
                  <Bookmark />
                ) : (
                  <BookmarkBorder />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
}
