import React from "react";
import { Box, alpha } from "@mui/material";
import Logo from "../../assets/byte.png";
import { getRoleTheme } from "../../config/roleTheme";
import {
  GRADIENT,
  logoRoleGradient,
  rtlSafeGradientStyle,
} from "../../utils/rtlSafeGradient";

const SIZES = { sm: 36, md: 44, lg: 56, xl: 72 };

export default function BrandLogo({
  size = "md",
  variant = "onLight",
  roleName,
  sx = {},
}) {
  const px = typeof size === "number" ? size : SIZES[size] || SIZES.md;
  const pad = variant === "hero" || variant === "role" ? 1.25 : 0.65;
  const box = px + pad * 8 * 2;
  const roleTheme = variant === "role" ? getRoleTheme(roleName) : null;

  const shell =
    variant === "onDark"
      ? {
          bgcolor: "transparent",
          border: "none",
          boxShadow: "none",
        }
      : variant === "role" && roleTheme
        ? {
            border: `1px solid ${alpha("#fff", 0.22)}`,
            boxShadow: `0 6px 20px ${alpha(roleTheme.accent, 0.32)}`,
          }
        : variant === "hero"
          ? {
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 12px 32px rgba(15,23,42,0.35)",
            }
          : {
              bgcolor: "#0B1220",
              border: "1px solid #1E293B",
              boxShadow: "0 4px 14px rgba(15,23,42,0.2)",
            };

  const gradientStyle =
    variant === "role" && roleName
      ? rtlSafeGradientStyle(logoRoleGradient(roleName))
      : variant === "hero"
        ? rtlSafeGradientStyle(GRADIENT.logoHero)
        : undefined;

  return (
    <Box
      style={gradientStyle}
      sx={{
        width: box,
        height: box,
        borderRadius: variant === "hero" || variant === "role" ? 3 : 2,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        ...shell,
        ...sx,
      }}
    >
      <Box
        component="img"
        src={Logo}
        alt="ByteHub"
        sx={{
          width: px,
          height: px,
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
  );
}
