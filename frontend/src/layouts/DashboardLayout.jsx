import React, {
  Suspense,
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { textEllipsisSx } from "../styles/textEllipsis";
import SystemBreadcrumbs from "../components/SystemBreadcrumbs";
import NotificationBellMenu from "../components/NotificationBellMenu";
import RouteLoadingFallback from "../components/loading/RouteLoadingFallback";
import NavigationProgress from "../components/loading/NavigationProgress";
import ContentFadeIn from "../components/loading/ContentFadeIn";
import BrandLogo from "../components/BrandLogo";
import LanguageSwitcher from "../components/LanguageSwitcher";
import {
  getNavForRole,
  groupNavBySection,
  shouldGroupNavBySection,
} from "../config/navConfig";
import { getRoleTheme } from "../config/roleTheme";
import { brandColors } from "../theme";
import { rtlSafeGradientStyle } from "../utils/rtlSafeGradient";

import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
  IconButton,
  Button,
  Stack,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Chip,
  alpha,
} from "@mui/material";

import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

const DRAWER_WIDTH = 264;
const DRAWER_WIDTH_ADMIN = 300;
const DRAWER_MINI_WIDTH = 64;
const SIDEBAR_STORAGE_KEY = "pms_sidebar_expanded";

/** Main dashboard shell with sidebar navigation, badges, and content outlet. */
export default function DashboardLayout() {
  const {
    user,
    token: ctxToken,
    logout,
    authHeaders,
    apiFetch,
    API_BASE_URL,
    universityName,
    isSuperAdmin: isSuperAdminCtx,
  } = useAuth();
  const { t, isRtl } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleTheme } = useThemeMode() || {
    mode: "light",
    toggleTheme: () => {},
  };

  const token = ctxToken || localStorage.getItem("token");
  const roleName = String(user?.role?.name ?? user?.role ?? "").toLowerCase();
  const isSuperAdmin = isSuperAdminCtx || roleName === "super_admin";
  const isTenantUser = !isSuperAdmin;
  const isUniversityAdmin = roleName === "admin";

  const displayName = user?.user?.name || user?.name || "User";
  const roleLabel = t(`roles.${roleName}`, roleName);
  const roleTheme = getRoleTheme(roleName);

  const workspaceLabel = isSuperAdmin
    ? t("common.platformAdmin")
    : universityName || null;

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [studentInvCount, setStudentInvCount] = useState(0);
  const [supervisorInvCount, setSupervisorInvCount] = useState(0);
  const [passwordResetCount, setPasswordResetCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarExpanded));
    } catch {
      /* ignore */
    }
  }, [sidebarExpanded]);

  const badges = useMemo(
    () => ({
      unread: unreadCount,
      supervisorInv: supervisorInvCount,
      studentInv: studentInvCount,
      passwordReset: passwordResetCount,
      pendingUsers: pendingUsersCount,
      usersAlerts: pendingUsersCount + passwordResetCount,
    }),
    [
      unreadCount,
      supervisorInvCount,
      studentInvCount,
      passwordResetCount,
      pendingUsersCount,
    ],
  );

  const navItems = getNavForRole(roleName);
  const useGroupedNav = shouldGroupNavBySection(navItems);
  const navSections = useGroupedNav
    ? groupNavBySection(navItems)
    : [{ sectionKey: null, labelKey: null, items: navItems }];

  const drawerWidth = sidebarExpanded
    ? isUniversityAdmin
      ? DRAWER_WIDTH_ADMIN
      : DRAWER_WIDTH
    : DRAWER_MINI_WIDTH;
  const badgesFetchedAt = useRef(0);
  const BADGE_TTL_MS = 45_000;

  const fetchBadges = useCallback(
    async (force = false) => {
      if (!token) return;
      const now = Date.now();
      if (!force && now - badgesFetchedAt.current < BADGE_TTL_MS) return;

      try {
        const notifRes = await apiFetch(`${API_BASE_URL}/notifications`, {
          headers: authHeaders(),
        });
        if (notifRes.res.ok) {
          setUnreadCount(Number(notifRes.data?.unread_count) || 0);
        }
        if (!isSuperAdmin) {
          const { res, data } = await apiFetch(
            `${API_BASE_URL}/dashboard/badges`,
            { headers: authHeaders() },
          );
          if (res.ok) {
            setStudentInvCount(Number(data?.student_invitations) || 0);
            setSupervisorInvCount(Number(data?.supervisor_invitations) || 0);
            setPasswordResetCount(Number(data?.password_reset_requests) || 0);
            setPendingUsersCount(Number(data?.pending_users) || 0);
          }
        }
        badgesFetchedAt.current = Date.now();
      } catch (e) {
        console.error("badges", e);
      }
    },
    [API_BASE_URL, apiFetch, authHeaders, isSuperAdmin, token],
  );

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => fetchBadges(true), 0);
    const onUpdate = () => fetchBadges(true);
    window.addEventListener("updateSidebarBadges", onUpdate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("updateSidebarBadges", onUpdate);
    };
  }, [token, fetchBadges]);

  const resolveBadge = (item) => {
    if (!item.badgeKey) return 0;
    return badges[item.badgeKey] ?? 0;
  };

  const isActive = (item) => {
    if (item.end) {
      return (
        location.pathname === "/dashboard" ||
        location.pathname === "/dashboard/"
      );
    }
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
    );
  };

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
  };

  const renderNavItem = (item) => {
    const active = isActive(item);
    const Icon = item.icon;
    const labelKey =
      isSuperAdmin && item.labelKeySuper ? item.labelKeySuper : item.labelKey;
    const badge = resolveBadge(item);
    const label = t(labelKey);

    const button = (
      <ListItemButton
        component={NavLink}
        to={item.to}
        selected={active}
        sx={{
          mb: 0.5,
          py: 0.75,
          px: sidebarExpanded ? 1.25 : 0.5,
          borderRadius: 1.5,
          justifyContent: sidebarExpanded ? "flex-start" : "center",
          minHeight: 38,
          width: "100%",
          "&.Mui-selected": {
            bgcolor: alpha(roleTheme.accent, 0.14),
            borderInlineStart: `3px solid ${roleTheme.accent}`,
            "& .MuiListItemIcon-root": { color: roleTheme.accent },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: sidebarExpanded ? 36 : 0,
            justifyContent: "center",
            color: active ? "secondary.main" : "text.secondary",
          }}
        >
          {badge > 0 ? (
            <Badge color="error" badgeContent={badge} max={99}>
              <Icon fontSize="small" />
            </Badge>
          ) : (
            <Icon fontSize="small" />
          )}
        </ListItemIcon>
        {sidebarExpanded && (
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              fontWeight: active ? 800 : 600,
              fontSize: 13.5,
              lineHeight: 1.35,
              ...textEllipsisSx,
            }}
          />
        )}
      </ListItemButton>
    );

    if (sidebarExpanded) {
      return (
        <Box key={item.id} component="span" sx={{ display: "block" }}>
          {button}
        </Box>
      );
    }

    return (
      <Tooltip key={item.id} title={label} placement="right">
        <Box component="span" sx={{ display: "block" }}>
          {button}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      <NavigationProgress />
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            border: "none",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            overflowX: "hidden",
            top: 0,
            height: "100vh",
            transition: (theme) =>
              theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
      >
        <Box
          style={rtlSafeGradientStyle(roleTheme.gradient)}
          sx={{ px: sidebarExpanded ? 1.5 : 1, py: 1.5, color: "white" }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={sidebarExpanded ? 1 : 0}
            justifyContent={sidebarExpanded ? "flex-start" : "center"}
          >
            <BrandLogo size="sm" variant="role" roleName={roleName} />
            {sidebarExpanded && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900, fontSize: "0.82rem", lineHeight: 1.1 }}>
                  {t("common.appName")}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.8, fontSize: "0.65rem", ...textEllipsisSx }}
                >
                  {t("common.appTagline")}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        <Stack
          sx={{ px: sidebarExpanded ? 1.5 : 0.75, py: 1.25 }}
          spacing={1}
          alignItems={sidebarExpanded ? "stretch" : "center"}
        >
          <Tooltip title={displayName} placement="right" disableHoverListener={sidebarExpanded}>
            <Stack
              direction="row"
              spacing={sidebarExpanded ? 1 : 0}
              alignItems="center"
              justifyContent={sidebarExpanded ? "flex-start" : "center"}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                cursor: "pointer",
                borderRadius: 1.5,
                p: 0.5,
                width: sidebarExpanded ? "100%" : "auto",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: roleTheme.accent,
                  fontWeight: 900,
                  boxShadow: `0 0 0 2px ${roleTheme.accentSoft}`,
                }}
              >
                {(displayName?.[0] || "U").toUpperCase()}
              </Avatar>
              {sidebarExpanded && (
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14, ...textEllipsisSx }}>
                    {displayName}
                  </Typography>
                  <Chip
                    label={roleLabel}
                    size="small"
                    sx={{
                      mt: 0.3,
                      height: 22,
                      fontSize: 11,
                      fontWeight: 800,
                      bgcolor: alpha(brandColors.teal, 0.15),
                      color: brandColors.teal,
                    }}
                  />
                  {workspaceLabel && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={textEllipsisSx}
                    >
                      {workspaceLabel}
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </Tooltip>

          {sidebarExpanded ? (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <LanguageSwitcher size="small" sx={{ flex: 1 }} />
              <Tooltip title={mode === "dark" ? t("common.lightMode") : t("common.darkMode")}>
                <IconButton size="small" onClick={toggleTheme} sx={{ color: "text.secondary" }}>
                  {mode === "dark" ? (
                    <LightModeRoundedIcon fontSize="small" />
                  ) : (
                    <DarkModeRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Tooltip title={mode === "dark" ? t("common.lightMode") : t("common.darkMode")}>
              <IconButton size="small" onClick={toggleTheme} sx={{ color: "text.secondary" }}>
                {mode === "dark" ? (
                  <LightModeRoundedIcon fontSize="small" />
                ) : (
                  <DarkModeRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          disableScrollLock
          PaperProps={{ sx: { borderRadius: 2.5, minWidth: 200 } }}
        >
          {isTenantUser && (
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/dashboard/profile");
              }}
            >
              <ListItemIcon>
                <AccountCircleRoundedIcon fontSize="small" />
              </ListItemIcon>
              {t("common.profile")}
            </MenuItem>
          )}
          <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
            <ListItemIcon sx={{ color: "error.main" }}>
              <LogoutRoundedIcon fontSize="small" />
            </ListItemIcon>
            {t("common.logout")}
          </MenuItem>
        </Menu>

        <Divider />

        <List
          sx={{
            px: sidebarExpanded ? 0.75 : 0,
            py: 0.5,
            flex: 1,
            overflowY: "auto",
            width: "100%",
          }}
        >
          {navSections.map((section, sectionIndex) => (
            <Box key={section.sectionKey || "flat"}>
              {sidebarExpanded && section.labelKey && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    px: 1.25,
                    pt: sectionIndex > 0 ? 1.25 : 0.25,
                    pb: 0.5,
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "text.secondary",
                  }}
                >
                  {t(section.labelKey)}
                </Typography>
              )}
              {section.items.map(renderNavItem)}
            </Box>
          ))}
        </List>

      </Drawer>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ flex: 1, p: { xs: 1.5, md: 2.5 }, minWidth: 0, overflow: "auto" }}>
          <Box
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              px: { xs: 1.5, md: 2 },
              py: 1.25,
              mb: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "none"
                  : "0 4px 20px rgba(15,23,42,0.05)",
            }}
          >
            <Tooltip
              title={sidebarExpanded ? t("common.closeSidebar") : t("common.openSidebar")}
            >
              <IconButton
                size="small"
                onClick={() => setSidebarExpanded((v) => !v)}
                sx={{ color: "text.secondary" }}
              >
                <MenuRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SystemBreadcrumbs embedded />
            </Box>

            <NotificationBellMenu
              token={token}
              authHeaders={authHeaders}
              apiFetch={apiFetch}
              API_BASE_URL={API_BASE_URL}
              unreadCount={unreadCount}
              setUnreadCount={setUnreadCount}
            />

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                cursor: "pointer",
                px: 1.25,
                py: 0.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: brandColors.navy, fontSize: 14 }}>
                {(displayName?.[0] || "U").toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>
                  {displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {roleLabel}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Suspense fallback={<RouteLoadingFallback />}>
            <ContentFadeIn routeKey={location.pathname}>
              <Outlet context={{ unreadCount, setUnreadCount }} />
            </ContentFadeIn>
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
}
