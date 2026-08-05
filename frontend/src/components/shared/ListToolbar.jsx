import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  InputAdornment,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

/** Shared search and filter bar for list pages. */
export default function ListToolbar({
  search = "",
  onSearchChange,
  searchPlaceholder,
  filters = [],
  onRefresh,
  children,
}) {
  const { t } = useLanguage();
  const placeholder = searchPlaceholder || t("common.search");

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        flexWrap="wrap"
        useFlexGap
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ minWidth: 0, maxWidth: "100%" }}
      >
        <TextField
          size="small"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          sx={{ minWidth: 0, flex: "1 1 220px", maxWidth: "100%" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        {filters.map((f) => (
          <TextField
            key={f.key}
            select
            size="small"
            label={f.label}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            sx={{ minWidth: 0, flex: "0 1 160px", maxWidth: "100%" }}
          >
            <MenuItem value="">{t("common.all")}</MenuItem>
            {(f.options || []).map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        ))}

        {children}

        {onRefresh && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={onRefresh}
            sx={{ fontWeight: 700 }}
          >
            {t("common.refresh")}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
