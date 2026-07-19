import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  API_BASE_URL,
  apiFetch,
  registerStatusBlockedHandler,
} from "../utils/api";

const AuthContext = createContext();

/** Provides auth token, user profile, role, and API helpers app-wide. */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [user, setUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(
    () => Boolean(localStorage.getItem("token")),
  );
  const [status, setStatus] = useState(null);
  const [role, setRole] = useState(null);
  const [universityId, setUniversityId] = useState(null);
  const [universityName, setUniversityName] = useState(null);
  const [sessionBlock, setSessionBlock] = useState(null);

  /** Resets derived session fields without clearing the token. */
  const clearSessionFields = () => {
    setStatus(null);
    setRole(null);
    setUniversityId(null);
    setUniversityName(null);
    setSessionBlock(null);
  };

  /** Clears token, user, and persisted session state. */
  const invalidateSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setLoadingProfile(false);
    clearSessionFields();
    localStorage.removeItem("token");
  }, []);

  /** Maps `/profile` response into context state. */
  const applyProfileData = (data) => {
    const roleName =
      typeof data?.user?.role === "string"
        ? data.user.role
        : data?.user?.role?.name || data?.role?.name || "";

    setUser(data);
    setStatus(data?.user?.status || null);
    setRole(roleName || null);
    setUniversityId(data?.user?.university_id ?? null);
    const activeSupervisorUnis =
      data?.user?.active_supervisor_university_names || [];
    const supervisorMemberships = data?.user?.supervisor_memberships || [];

    let resolvedUniversityName =
      data?.user?.university?.name || data?.university_name || null;

    if (roleName === "supervisor") {
      if (activeSupervisorUnis.length > 0) {
        resolvedUniversityName = activeSupervisorUnis.join("، ");
      } else if (supervisorMemberships.length > 0) {
        resolvedUniversityName = supervisorMemberships
          .map((m) => m.name)
          .filter(Boolean)
          .join("، ");
      }
    }

    setUniversityName(resolvedUniversityName);
    setSessionBlock(null);

    const hasSupervisorUniversity =
      roleName === "supervisor" &&
      (supervisorMemberships.length > 0 || activeSupervisorUnis.length > 0);

    if (
      data?.user &&
      data.user.university_id == null &&
      roleName !== "super_admin" &&
      !hasSupervisorUniversity
    ) {
      setSessionBlock("no_university");
    }
  };

  useEffect(() => {
    registerStatusBlockedHandler((block) => {
      if (block?.type === "status") {
        setStatus(block.status);
      }
      if (block?.type === "no_university") {
        setSessionBlock("no_university");
      }
    });
    return () => registerStatusBlockedHandler(null);
  }, []);

  /** Loads the current user profile using the given bearer token. */
  const fetchUser = async (tok) => {
    if (!tok) return false;
    try {
      setLoadingProfile(true);
      const { res, data } = await apiFetch(`${API_BASE_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${tok}`,
          Accept: "application/json",
        },
      });

      if (res.ok && data?.user) {
        applyProfileData(data);
        setLoadingProfile(false);
        return true;
      }

      if (res.status === 403 && data?.code === "no_university") {
        setSessionBlock("no_university");
        setLoadingProfile(false);
        return true;
      }

      if (res.status === 401) {
        invalidateSession();
        setLoadingProfile(false);
        return false;
      }

      setLoadingProfile(false);
      return false;
    } catch (error) {
      console.error("Error fetching profile:", error);
      setLoadingProfile(false);
      return false;
    }
  };

  /** Stores a new token and loads the user profile. */
  const login = async (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    const ok = await fetchUser(newToken);
    if (!ok) {
      throw new Error("Failed to load profile after login");
    }
  };

  /** Ends the session and redirects to the login page. */
  const logout = useCallback(() => {
    invalidateSession();
    window.location.replace("/login");
  }, [invalidateSession]);

  /** Builds Authorization headers for authenticated API calls. */
  const authHeaders = useCallback(
    (extra = {}) => ({
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...extra,
    }),
    [token],
  );

  useEffect(() => {
    if (token && !user && !sessionBlock) {
      fetchUser(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isSuperAdmin = role === "super_admin";
  const isActive = status === "active" || status === "graduated";
  const isGraduated = status === "graduated";
  const isPending = status === "pending";
  const isRejected = status === "rejected";

  const refreshProfile = async () => {
    if (!token) return false;
    return fetchUser(token);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: !!token,
        loadingProfile,
        status,
        role,
        universityId,
        universityName,
        sessionBlock,
        isSuperAdmin,
        isActive,
        isGraduated,
        isPending,
        isRejected,
        refreshProfile,
        authHeaders,
        apiFetch,
        API_BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook for reading auth state and actions from AuthContext. */
export const useAuth = () => useContext(AuthContext);
