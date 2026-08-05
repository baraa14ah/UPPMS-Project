import React from "react";
import {
  Chip,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

/** Combined search + stat filter pills for list pages. */
export default function StatsFilterStrip({
  search = "",
  onSearchChange,
  searchPlaceholder,
  filters = [],
  activeFilter = "",
  onFilterChange,
  countLabel,
  disabled = false,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        mb: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.25}
        alignItems={{ md: "center" }}
      >
        <TextField
          size="small"
          disabled={disabled}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          sx={{ minWidth: { xs: "100%", md: 220 }, flex: { md: 1 }, maxWidth: { md: 360 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
          {filters.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Chip
                key={f.key || "all"}
                size="small"
                disabled={disabled}
                label={`${f.label} (${f.count})`}
                clickable={!disabled}
                onClick={() => onFilterChange?.(f.key)}
                variant={active ? "filled" : "outlined"}
                sx={{
                  fontWeight: 800,
                  height: 30,
                  ...(active
                    ? {
                        bgcolor: alpha(f.color, 0.14),
                        color: f.color,
                        borderColor: alpha(f.color, 0.35),
                      }
                    : {}),
                }}
              />
            );
          })}
        </Stack>

        {countLabel && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {countLabel}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
