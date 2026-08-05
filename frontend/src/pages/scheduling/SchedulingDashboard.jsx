import React, { useEffect, useState } from "react";
import { Box, Alert } from "@mui/material";
import { CalendarMonth } from "@mui/icons-material";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import PageHeader from "../../components/shared/PageHeader";
import SchedulingWorkflowStepper from "../../components/scheduling/SchedulingWorkflowStepper";
import SchedulingContextBar from "../../components/scheduling/SchedulingContextBar";
import SchedulingStagesPanel from "../../components/scheduling/SchedulingStagesPanel";
import SchedulingRoomsPanel from "../../components/scheduling/SchedulingRoomsPanel";
import SchedulingGeneratePanel from "../../components/scheduling/SchedulingGeneratePanel";
import DefenseWorkflowGuide from "../../components/defense/DefenseWorkflowGuide";
import SchedulingPageSkeleton from "../../components/loading/SchedulingPageSkeleton";
import { pageContainerSx } from "../../styles/dashboardUi";
import { DEFAULT_DEFENSE_DAYS } from "../../config/schedulingDays";
import {
  emptyStageForm,
  isMandatoryStage,
  normalizeTimeValue,
  stageFormFromStage,
  syncMandatorySlotsWithDays,
  validateStagePeriod,
} from "../../utils/schedulingFormUtils";

const PERIOD_ERROR_TOAST = {
  periodBothRequired: "scheduling.periodErrors.periodBothRequired",
  periodStartPast: "scheduling.periodErrors.periodStartPast",
  periodEndBeforeStart: "scheduling.periodErrors.periodEndBeforeStart",
  dayHoursInvalid: "scheduling.periodErrors.dayHoursInvalid",
};

/** Build a clean API payload for stage create/update (avoids H:i:s validation traps). */
function buildStagePayload(form, { includeMandatory = false } = {}) {
  const dayStart = normalizeTimeValue(form.day_start_time, "08:00");
  const dayEnd = normalizeTimeValue(form.day_end_time, "15:00");
  const days = form.allowed_defense_days?.length
    ? form.allowed_defense_days
    : [];

  const payload = {
    name: form.name,
    duration_minutes: Number(form.duration_minutes) || 60,
    default_committee_size: Number(form.default_committee_size) || 3,
    defense_period_start: form.defense_period_start || null,
    defense_period_end: form.defense_period_end || null,
    allowed_defense_days: days,
    day_start_time: dayStart,
    day_end_time: dayEnd,
  };

  if (includeMandatory) {
    payload.mandatory_slots = syncMandatorySlotsWithDays(days, [
      { day_of_week: days[0] ?? 0, start_time: dayStart, end_time: dayEnd },
    ]);
  }

  return payload;
}

function mapApiFieldErrors(errors) {
  if (!errors || typeof errors !== "object") return {};
  const mapped = {};
  Object.entries(errors).forEach(([key, messages]) => {
    const msg = Array.isArray(messages) ? messages[0] : String(messages);
    if (key.startsWith("mandatory_slots")) {
      mapped.day_end_time = mapped.day_end_time || msg;
      return;
    }
    mapped[key] = msg;
  });
  return mapped;
}

/** Admin dashboard — 4-step workflow for smart scheduling. */
export default function SchedulingDashboard() {
  const { authHeaders, apiFetch, API_BASE_URL, token } = useAuth();
  const { t } = useLanguage();

  const [activeStep, setActiveStep] = useState(0);
  const [bootLoading, setBootLoading] = useState(true);
  const [stages, setStages] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [candidates, setCandidates] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [stageStatus, setStageStatus] = useState(null);
  const [readiness, setReadiness] = useState(null);

  const [stageForm, setStageForm] = useState(() => emptyStageForm());
  const [stageFormErrors, setStageFormErrors] = useState({});
  const [addingStage, setAddingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState(null);
  const [editForm, setEditForm] = useState(emptyStageForm());
  const [editFormErrors, setEditFormErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingStageId, setDeletingStageId] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [roomForm, setRoomForm] = useState({ name: "", building: "", is_premium: false });
  const [addingRoom, setAddingRoom] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState(null);
  const [openingAvailabilityStageId, setOpeningAvailabilityStageId] = useState(null);
  const [ensuringCatalog, setEnsuringCatalog] = useState(false);
  const [useCommittees, setUseCommittees] = useState(false);
  const [activeCommitteeCount, setActiveCommitteeCount] = useState(null);

  const selectedStage = stages.find((s) => String(s.id) === String(selectedStageId));
  const selectedStageReady = Boolean(
    selectedStage?.defense_period_start &&
      selectedStage?.defense_period_end &&
      (selectedStage?.allowed_defense_days?.length || DEFAULT_DEFENSE_DAYS.length),
  );

  const apiErrorMessage = (res, data, fallback) => {
    if (res.status === 401) {
      return t("scheduling.toast.sessionExpired");
    }
    return data?.message || fallback;
  };

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          fetchStages(),
          fetchReadiness(),
          fetchRooms(),
          fetchActiveCommitteeCount(),
        ]);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const fetchActiveCommitteeCount = async () => {
    if (!token) return;
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/committees?status=active&per_page=1`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        setActiveCommitteeCount(data?.data?.pagination?.total ?? 0);
      }
    } catch {
      setActiveCommitteeCount(null);
    }
  };

  useEffect(() => {
    if (!token || !selectedStageId) return;
    fetchReadiness(selectedStageId, useCommittees);
    fetchStageStatus();
  }, [selectedStageId, useCommittees, token]);

  useEffect(() => {
    if (stages.length > 0 && !selectedStageId) {
      setSelectedStageId(String(stages[0].id));
    }
  }, [stages, selectedStageId]);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const fetchStages = async () => {
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/academic-stages`, {
        headers: authHeaders(),
      });
      if (res.ok) setStages(data.data || []);
    } catch (err) {
      console.error("Failed to fetch stages:", err);
    }
  };

  const fetchReadiness = async (stageId = selectedStageId, committeeMode = useCommittees) => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (stageId) params.set("stage_id", String(stageId));
      if (committeeMode) params.set("use_committees", "1");
      const query = params.toString();
      const url = `${API_BASE_URL}/schedules/readiness${query ? `?${query}` : ""}`;
      const { res, data } = await apiFetch(url, { headers: authHeaders() });
      if (res.ok) {
        setReadiness(data);
      } else if (res.status === 401) {
        setError(apiErrorMessage(res, data, t("common.error")));
      }
    } catch (err) {
      console.error("Failed to fetch readiness:", err);
    }
  };

  const fetchRooms = async () => {
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/available-rooms`, {
        headers: authHeaders(),
      });
      if (res.ok) setRooms(data.data || []);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

  const fetchStageStatus = async () => {
    if (!selectedStageId) return;
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/schedules/status/${selectedStageId}`,
        { headers: authHeaders() },
      );
      if (res.ok) setStageStatus(data);
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const handleEnsureCatalog = async () => {
    setEnsuringCatalog(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/academic-stages/ensure-catalog`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error(data?.message || t("common.error"));
        return;
      }
      toast.success(t("scheduling.catalogEnsured"));
      await fetchStages();
    } catch {
      toast.error(t("common.error"));
    } finally {
      setEnsuringCatalog(false);
    }
  };

  const handleOpenAvailability = async (stageId) => {
    setOpeningAvailabilityStageId(stageId);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/academic-stages/${stageId}/open-availability`,
        { method: "POST", headers: authHeaders() },
      );
      if (!res.ok) {
        toast.error(data?.message || t("scheduling.toast.openAvailabilityFailed"));
        return;
      }
      toast.success(
        t("scheduling.toast.openAvailabilitySuccess", {
          submitted: data.supervisors_submitted ?? 0,
          total: data.supervisors_total ?? 0,
        }),
      );
      await fetchStages();
      await fetchReadiness(String(stageId));
      if (String(selectedStageId) === String(stageId)) await fetchStageStatus();
    } catch {
      toast.error(t("scheduling.toast.openAvailabilityFailed"));
    } finally {
      setOpeningAvailabilityStageId(null);
    }
  };

  const handleAddStage = async () => {
    if (!stageForm.name.trim()) {
      toast.error(t("scheduling.toast.stageNameRequired"));
      return;
    }
    const periodError = validateStagePeriod(stageForm);
    if (periodError) {
      const msg = t(PERIOD_ERROR_TOAST[periodError] || periodError);
      setStageFormErrors({
        defense_period_start:
          periodError === "periodStartPast" || periodError === "periodBothRequired" ? msg : undefined,
        defense_period_end:
          periodError === "periodEndBeforeStart" || periodError === "periodBothRequired"
            ? msg
            : undefined,
        day_end_time: periodError === "dayHoursInvalid" ? msg : undefined,
      });
      toast.error(msg);
      return;
    }
    setStageFormErrors({});
    setAddingStage(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/academic-stages`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(buildStagePayload(stageForm)),
      });
      if (!res.ok) {
        const fieldErrors = mapApiFieldErrors(data?.errors);
        setStageFormErrors(fieldErrors);
        const firstError = Object.values(fieldErrors)[0];
        toast.error(firstError || data?.message || t("scheduling.toast.addStageFailed"));
        return;
      }
      toast.success(t("scheduling.toast.addStageSuccess"));
      setStageForm(emptyStageForm());
      setStageFormErrors({});
      await fetchStages();
      await fetchReadiness();
      if (data.data?.id) setSelectedStageId(String(data.data.id));
    } catch {
      toast.error(t("scheduling.toast.addStageFailed"));
    } finally {
      setAddingStage(false);
    }
  };

  const startEditStage = (stage) => {
    setEditingStageId(stage.id);
    setEditForm(stageFormFromStage(stage));
    setEditFormErrors({});
  };

  const handleSaveEdit = async () => {
    const editingStage = stages.find((s) => s.id === editingStageId);
    if (!editingStageId || (!editingStage?.is_system_stage && !editForm.name.trim())) {
      toast.error(t("scheduling.toast.stageNameRequired"));
      return;
    }
    const periodError = validateStagePeriod(editForm);
    if (periodError) {
      const msg = t(PERIOD_ERROR_TOAST[periodError] || periodError);
      setEditFormErrors({
        defense_period_start:
          periodError === "periodStartPast" || periodError === "periodBothRequired" ? msg : undefined,
        defense_period_end:
          periodError === "periodEndBeforeStart" || periodError === "periodBothRequired"
            ? msg
            : undefined,
        day_end_time: periodError === "dayHoursInvalid" ? msg : undefined,
      });
      toast.error(msg);
      return;
    }
    if (isMandatoryStage(editingStage) && editForm.allowed_defense_days.length === 0) {
      toast.error(t("scheduling.toast.selectDayRequired"));
      return;
    }
    setEditFormErrors({});
    setSavingEdit(true);
    try {
      const payload = buildStagePayload(editForm, {
        includeMandatory: isMandatoryStage(editingStage),
      });
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/academic-stages/${editingStageId}`,
        {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const fieldErrors = mapApiFieldErrors(data?.errors);
        setEditFormErrors(fieldErrors);
        const firstError = Object.values(fieldErrors)[0];
        toast.error(firstError || data?.message || t("scheduling.toast.updateStageFailed"));
        return;
      }
      toast.success(t("scheduling.toast.updateStageSuccess"));
      setEditingStageId(null);
      setEditFormErrors({});
      await fetchStages();
      await fetchReadiness();
    } catch {
      toast.error(t("scheduling.toast.updateStageFailed"));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (!window.confirm(t("scheduling.toast.deleteStageConfirm"))) return;
    setDeletingStageId(stageId);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/academic-stages/${stageId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error(data?.message || t("scheduling.toast.deleteStageFailed"));
        return;
      }
      toast.success(t("scheduling.toast.deleteStageSuccess"));
      if (String(selectedStageId) === String(stageId)) {
        setSelectedStageId("");
        setStageStatus(null);
      }
      await fetchStages();
      await fetchReadiness();
    } catch {
      toast.error(t("scheduling.toast.deleteStageFailed"));
    } finally {
      setDeletingStageId(null);
    }
  };

  const handleAddRoom = async () => {
    if (!roomForm.name.trim()) {
      toast.error(t("scheduling.toast.roomNameRequired"));
      return;
    }
    setAddingRoom(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/available-rooms`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: roomForm.name.trim(),
          building: roomForm.building.trim() || null,
          is_premium: Boolean(roomForm.is_premium),
        }),
      });
      if (!res.ok) {
        toast.error(data?.message || t("scheduling.toast.addRoomFailed"));
        return;
      }
      toast.success(t("scheduling.toast.addRoomSuccess"));
      setRoomForm({ name: "", building: "", is_premium: false });
      await fetchRooms();
      await fetchReadiness();
    } catch {
      toast.error(t("scheduling.toast.addRoomFailed"));
    } finally {
      setAddingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm(t("scheduling.toast.deleteRoomConfirm"))) return;
    setDeletingRoomId(roomId);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/available-rooms/${roomId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        toast.error(data?.message || t("scheduling.toast.deleteRoomFailed"));
        return;
      }
      toast.success(t("scheduling.toast.deleteRoomSuccess"));
      await fetchRooms();
      await fetchReadiness();
    } catch {
      toast.error(t("scheduling.toast.deleteRoomFailed"));
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStageId) {
      toast.error(t("scheduling.toast.selectAcademicStage"));
      return;
    }
    if (!selectedStageReady) {
      toast.error(t("scheduling.toast.setPeriodAndDaysFirst"));
      return;
    }
    setLoading(true);
    setElapsedSeconds(0);
    setError(null);
    setCandidates(null);
    setMetadata(null);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/schedules/generate`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          academic_stage_id: Number(selectedStageId),
          use_committees: useCommittees,
        }),
      });
      if (!res.ok) {
        const message = apiErrorMessage(res, data, t("scheduling.toast.generateFailed"));
        setError(message);
        toast.error(message);
        return;
      }
      setCandidates(data.candidates);
      setMetadata(data.metadata);
      setWarnings(data.warnings || []);
      toast.success(t("scheduling.toast.generateSuccess"));
    } catch {
      const message = t("scheduling.toast.generateFailed");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (rank) => {
    if (!candidates) return;
    setApproving(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/schedules/approve`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          academic_stage_id: Number(selectedStageId),
          rank,
          candidates,
        }),
      });
      if (!res.ok) {
        toast.error(data?.message || t("scheduling.toast.approveFailed"));
        return;
      }
      toast.success(t("scheduling.toast.approveSuccess"));
      setCandidates(null);
      setMetadata(null);
      await fetchStageStatus();
      await fetchReadiness();
    } catch {
      toast.error(t("scheduling.toast.approveFailed"));
    } finally {
      setApproving(false);
    }
  };

  const handleVoidSchedule = async () => {
    if (!stageStatus?.active_schedule_id) return;
    setVoiding(true);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/schedules/${stageStatus.active_schedule_id}/void`,
        { method: "POST", headers: authHeaders() },
      );
      if (!res.ok) {
        toast.error(data?.message || t("scheduling.toast.voidFailed"));
        return;
      }
      toast.success(t("scheduling.toast.voidSuccess"));
      setCandidates(null);
      await fetchStageStatus();
      await fetchReadiness();
    } catch {
      toast.error(t("scheduling.toast.voidFailed"));
    } finally {
      setVoiding(false);
    }
  };

  const getRankLabel = (rank) => {
    switch (rank) {
      case 1:
        return t("scheduling.generate.rankBest");
      case 2:
        return t("scheduling.generate.rankAverage");
      case 3:
        return t("scheduling.generate.rankAcceptable");
      default:
        return t("scheduling.generate.rankProposal", { rank });
    }
  };

  return (
    <Box sx={pageContainerSx}>
      <PageHeader
        title={t("scheduling.pageTitle")}
        subtitle={t("scheduling.pageSubtitle")}
        icon={<CalendarMonth />}
      />

      {bootLoading ? (
        <SchedulingPageSkeleton />
      ) : (
        <>
      <DefenseWorkflowGuide variant="scheduling" />

      <SchedulingWorkflowStepper activeStep={activeStep} onStepChange={setActiveStep} />

      <SchedulingContextBar
        stages={stages}
        selectedStageId={selectedStageId}
        onSelectStage={setSelectedStageId}
        readiness={readiness}
        stageStatus={stageStatus}
      />

      {stages.length === 0 && activeStep > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("scheduling.addDefenseTypeFirst")}
        </Alert>
      )}

      {activeStep === 0 && (
        <SchedulingStagesPanel
          stages={stages}
          selectedStageId={selectedStageId}
          onSelectStage={setSelectedStageId}
          stageForm={stageForm}
          setStageForm={setStageForm}
          stageFormErrors={stageFormErrors}
          onAddStage={handleAddStage}
          addingStage={addingStage}
          editingStageId={editingStageId}
          editForm={editForm}
          setEditForm={setEditForm}
          editFormErrors={editFormErrors}
          onStartEdit={startEditStage}
          onCancelEdit={() => {
            setEditingStageId(null);
            setEditFormErrors({});
          }}
          onSaveEdit={handleSaveEdit}
          savingEdit={savingEdit}
          onDeleteStage={handleDeleteStage}
          deletingStageId={deletingStageId}
          onOpenAvailability={handleOpenAvailability}
          openingAvailabilityStageId={openingAvailabilityStageId}
          onEnsureCatalog={handleEnsureCatalog}
          ensuringCatalog={ensuringCatalog}
          onNext={() => setActiveStep(1)}
        />
      )}

      {activeStep === 1 && (
        <SchedulingRoomsPanel
          rooms={rooms}
          roomForm={roomForm}
          setRoomForm={setRoomForm}
          onAdd={handleAddRoom}
          addingRoom={addingRoom}
          onDelete={handleDeleteRoom}
          deletingRoomId={deletingRoomId}
          onNext={() => setActiveStep(2)}
        />
      )}

      {activeStep === 2 && (
        <SchedulingGeneratePanel
          selectedStage={selectedStage}
          selectedStageReady={selectedStageReady}
          readiness={readiness}
          stageStatus={stageStatus}
          loading={loading}
          elapsedSeconds={elapsedSeconds}
          error={error}
          warnings={warnings}
          metadata={metadata}
          candidates={candidates}
          onGenerate={handleGenerate}
          onVoid={handleVoidSchedule}
          voiding={voiding}
          onApprove={handleApprove}
          approving={approving}
          getRankLabel={getRankLabel}
          useCommittees={useCommittees}
          onUseCommitteesChange={setUseCommittees}
          activeCommitteeCount={activeCommitteeCount}
          onOpenAvailability={handleOpenAvailability}
          openingAvailabilityStageId={openingAvailabilityStageId}
        />
      )}
        </>
      )}
    </Box>
  );
}
