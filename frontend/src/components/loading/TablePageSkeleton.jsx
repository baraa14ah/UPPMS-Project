import React from "react";
import { Box, Stack } from "@mui/material";
import AppSkeleton from "./AppSkeleton";

const DEFAULT_COLUMNS = ["14%", "12%", "22%", "10%", "14%", "10%", "12%", "8%"];

/** Table-shaped skeleton for admin list pages (Users, etc.). */
export default function TablePageSkeleton({
  rows = 8,
  columnWidths = DEFAULT_COLUMNS,
}) {
  return (
    <Box sx={{ overflowX: "auto", width: "100%" }}>
      <Box sx={{ minWidth: { xs: 720, md: "100%" } }}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            px: 2,
            py: 1.75,
            bgcolor: "action.hover",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {columnWidths.map((width, i) => (
            <AppSkeleton key={i} width={width} height={18} sx={{ flexShrink: 0 }} />
          ))}
        </Stack>

        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Stack
            key={rowIndex}
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: rowIndex < rows - 1 ? "1px solid" : "none",
              borderColor: "divider",
            }}
          >
            {columnWidths.map((width, colIndex) => (
              <AppSkeleton
                key={colIndex}
                width={colIndex === 0 ? width : `calc(${width} - 4px)`}
                height={colIndex === columnWidths.length - 1 ? 30 : 18}
                variant={colIndex === columnWidths.length - 1 ? "rounded" : "text"}
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
