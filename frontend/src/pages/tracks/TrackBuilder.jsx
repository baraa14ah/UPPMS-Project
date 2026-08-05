import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TimelineIcon from "@mui/icons-material/Timeline";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import ButtonSpinner from "../../components/shared/ButtonSpinner";
import PageHeader from "../../components/shared/PageHeader";
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import DefenseWorkflowGuide from "../../components/defense/DefenseWorkflowGuide";
import TrackListCard from "../../components/tracks/TrackListCard";
import SubTrackPanel from "../../components/tracks/SubTrackPanel";
import AdminCardGridSkeleton from "../../components/loading/AdminCardGridSkeleton";
import {
  emptyPhase,
  defaultDecisiveForType,
} from "../../utils/trackStepUtils";
import {
  btnPrimarySx,
  pageContainerSx,
} from "../../styles/dashboardUi";

export default function TrackBuilder() {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t } = useLanguage();

  const jsonHeaders = useMemo(
    () => authHeaders({ "Content-Type": "application/json" }),
    [authHeaders],
  );

  const [tracks, setTracks] = useState([]);
  const [trackDetails, setTrackDetails] = useState({});
  const [defenseTypes, setDefenseTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [subTracks, setSubTracks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [confirmReassign, setConfirmReassign] = useState(false);
  const [overrideStudentId, setOverrideStudentId] = useState("");
  const [overridePhaseKey, setOverridePhaseKey] = useState("");
  const [overrideStageId, setOverrideStageId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideStages, setOverrideStages] = useState([]);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [deleteConfirmTyped, setDeleteConfirmTyped] = useState("");

  const buildEditSnapshot = (detail) => {
    const phases = detail?.phases?.length
      ? detail.phases
      : [{ id: null, steps: detail?.stages || [] }];

    return {
      phaseIds: phases.map((p) => p.id).filter(Boolean),
      stepIds: phases.flatMap((p) => (p.steps || []).map((s) => s.id)).filter(Boolean),
    };
  };

  const fetchTrackDetail = useCallback(
    async (trackId) => {
      const { res, data } = await apiFetch(`${API_BASE_URL}/tracks/${trackId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return null;
      return data?.data || null;
    },
    [API_BASE_URL, apiFetch, authHeaders],
  );

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/tracks?per_page=50`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        setFetchError(data?.message || t("common.error"));
        return;
      }
      const list = data?.data?.data || [];
      setTracks(list);

      const details = await Promise.all(
        list.map(async (track) => {
          const detail = await fetchTrackDetail(track.id);
          return detail ? [track.id, detail] : null;
        }),
      );
      setTrackDetails(Object.fromEntries(details.filter(Boolean)));
    } catch {
      setFetchError(t("common.serverError"));
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, apiFetch, authHeaders, fetchTrackDetail, t]);

  const fetchDefenseTypes = useCallback(async () => {
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/academic-stages`, {
        headers: authHeaders(),
      });
      if (res.ok) setDefenseTypes(data?.data || data || []);
    } catch {
      // optional
    }
  }, [API_BASE_URL, apiFetch, authHeaders]);

  const fetchStudents = useCallback(async () => {
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/students`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const list = data?.students ?? data?.data ?? (Array.isArray(data) ? data : []);
        setStudents(Array.isArray(list) ? list : []);
      }
    } catch {
      // optional
    }
  }, [API_BASE_URL, apiFetch, authHeaders]);

  useEffect(() => {
    fetchTracks();
    fetchDefenseTypes();
    fetchStudents();
  }, [fetchTracks, fetchDefenseTypes, fetchStudents]);

  const mapDetailToSubTracks = (detail) =>
    (detail.phases?.length ? detail.phases : [{ name: detail.name, steps: detail.stages || [] }]).map(
      (phase) => ({
        id: phase.id,
        name: phase.name || "",
        description: phase.description || "",
        presetKey: "custom",
        progress_count: phase.progress_count ?? 0,
        students_count: phase.students_count ?? phase.progress_count ?? 0,
        steps: (phase.steps || []).map((s) => {
          const dt = s.academic_stage;
          return {
            id: s.id,
            name: dt?.name || s.name,
            academic_stage_id: s.academic_stage_id || dt?.id || "",
            is_decisive:
              dt?.stage_key === "final_defense" ? true : s.is_decisive === true,
            progress_count: s.progress_count ?? 0,
          };
        }),
      }),
    );

  const addEmptyPhase = () => {
    setSubTracks([...subTracks, emptyPhase()]);
  };

  const openCreate = () => {
    setSelectedTrack(null);
    setFormName("");
    setFormDescription("");
    setSubTracks([]);
    setEditSnapshot(null);
    setDeleteConfirmTyped("");
    setDialogOpen(true);
  };

  const openEdit = async (track) => {
    try {
      const detail = await fetchTrackDetail(track.id);
      if (!detail) throw new Error();
      setSelectedTrack({ ...detail, students_count: track.students_count ?? detail.students_count });
      setFormName(detail.name || "");
      setFormDescription(detail.description || "");
      setSubTracks(mapDetailToSubTracks(detail));
      setEditSnapshot(buildEditSnapshot(detail));
      setDeleteConfirmTyped("");
      setDialogOpen(true);
    } catch {
      toast.error(t("common.error"));
    }
  };

  /** Only incomplete steps from the student's current phase onward (for override pickers). */
  const loadOverrideStagesForStudent = useCallback(
    async (studentId) => {
      setOverrideLoading(true);
      setOverridePhaseKey("");
      setOverrideStageId("");
      setOverrideStages([]);
      if (!studentId) {
        setOverrideLoading(false);
        return;
      }
      try {
        const { res, data } = await apiFetch(
          `${API_BASE_URL}/student-progress/${studentId}`,
          { headers: authHeaders() },
        );
        if (!res.ok) {
          toast.error(data?.message || t("common.error"));
          return;
        }

        const payload = data?.data || data || {};
        const trackId = payload.track?.id;
        if (!trackId) {
          setOverrideStages([]);
          return;
        }

        const detail =
          trackDetails[trackId] || (await fetchTrackDetail(trackId));
        if (!detail) {
          setOverrideStages([]);
          return;
        }

        const progressPhases = Array.isArray(payload.phases) ? payload.phases : [];
        const timeline = Array.isArray(payload.timeline) ? payload.timeline : [];
        const timelineByStage = new Map(
          timeline
            .filter((entry) => entry?.stage_id != null)
            .map((entry) => [Number(entry.stage_id), entry]),
        );

        // Prefer the furthest incomplete step's phase as "current".
        let currentPhaseIdx = progressPhases.findIndex(
          (phase) => phase?.status === "in_progress",
        );
        if (currentPhaseIdx < 0) {
          currentPhaseIdx = progressPhases.findIndex((phase) =>
            (phase?.steps || []).some((step) =>
              ["in_progress", "available", "failed", "incomplete", "locked"].includes(
                step?.status,
              ),
            ),
          );
        }
        if (currentPhaseIdx < 0) {
          currentPhaseIdx = progressPhases.findIndex((phase) => phase?.status !== "passed");
        }

        const phaseIsAllowed = (index) => {
          if (progressPhases.length === 0) return true;
          if (currentPhaseIdx >= 0) return index >= currentPhaseIdx;
          return progressPhases[index]?.status !== "passed";
        };

        const allowedPhaseIds = new Set(
          progressPhases
            .filter((_, index) => phaseIsAllowed(index))
            .map((phase) => phase?.phase_id)
            .filter((id) => id != null),
        );
        const allowedPhaseNames = new Set(
          progressPhases
            .filter((_, index) => phaseIsAllowed(index))
            .map((phase) => phase?.phase_name)
            .filter(Boolean),
        );

        const phases = detail.phases?.length
          ? detail.phases
          : [{ id: null, name: null, steps: detail.stages || [] }];

        const stageOptions = [];
        phases.forEach((phase, phaseIndex) => {
          const phaseId = phase.id ?? null;
          const phaseName = phase.name || null;
          const phaseAllowed =
            progressPhases.length === 0
              ? true
              : phaseId != null
                ? allowedPhaseIds.has(phaseId)
                : allowedPhaseNames.has(phaseName);

          if (!phaseAllowed) return;

          (phase.steps || []).forEach((step, stepIndex) => {
            const progressStatus =
              timelineByStage.get(Number(step.id))?.status || "locked";
            // Hide completed steps entirely — only overrideable (incomplete) ones.
            if (progressStatus === "passed") return;

            stageOptions.push({
              ...step,
              track_id: detail.id,
              track_name: detail.name,
              sub_track_name: phaseName,
              phase_id: phaseId,
              phase_key: String(phaseId ?? `name:${phaseName || phaseIndex}`),
              phase_order: phase.sequence_order ?? phaseIndex,
              step_order: step.sequence_order ?? stepIndex,
              progress_status: progressStatus,
              completed: false,
            });
          });
        });

        stageOptions.sort(
          (a, b) =>
            (a.phase_order ?? 0) - (b.phase_order ?? 0) ||
            (a.step_order ?? 0) - (b.step_order ?? 0),
        );
        setOverrideStages(stageOptions);
        if (stageOptions.length > 0) {
          setOverridePhaseKey(stageOptions[0].phase_key);
        }
      } catch {
        toast.error(t("common.error"));
      } finally {
        setOverrideLoading(false);
      }
    },
    [API_BASE_URL, apiFetch, authHeaders, fetchTrackDetail, t, trackDetails],
  );

  const overridePhaseGroups = useMemo(() => {
    const map = new Map();
    for (const stage of overrideStages) {
      const key = stage.phase_key || String(stage.phase_id ?? (stage.sub_track_name || "default"));
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: stage.sub_track_name || stage.track_name || t("tracks.targetPhase"),
          steps: [],
          hasSelectable: false,
        });
      }
      const group = map.get(key);
      group.steps.push(stage);
      if (!stage.completed) group.hasSelectable = true;
    }
    return Array.from(map.values());
  }, [overrideStages, t]);

  const overrideStepsForPhase = useMemo(() => {
    const group = overridePhaseGroups.find((g) => g.key === overridePhaseKey);
    return group?.steps || [];
  }, [overridePhaseGroups, overridePhaseKey]);

  const hasSelectableOverrideSteps = useMemo(
    () => overrideStages.some((stage) => !stage.completed),
    [overrideStages],
  );

  const selectedOverrideStudent = useMemo(
    () => students.find((s) => String(s.id) === String(overrideStudentId)) || null,
    [students, overrideStudentId],
  );

  const openOverride = async () => {
    setOverrideOpen(true);
    setOverrideStudentId("");
    setOverridePhaseKey("");
    setOverrideStageId("");
    setOverrideReason("");
    setOverrideStages([]);
    fetchStudents();
  };

  const updateSubTrack = (index, next) => {
    const copy = [...subTracks];
    copy[index] = next;
    setSubTracks(copy);
  };

  const moveSubTrack = (index, direction) => {
    const next = [...subTracks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSubTracks(next);
  };

  const moveStepInSubTrack = (subTrackIndex, stepIndex, direction) => {
    const st = subTracks[subTrackIndex];
    const target = stepIndex + direction;
    if (target < 0 || target >= st.steps.length) return;
    const steps = [...st.steps];
    [steps[stepIndex], steps[target]] = [steps[target], steps[stepIndex]];
    updateSubTrack(subTrackIndex, { ...st, steps });
  };

  const stepDisplayName = (step) =>
    step?.name || step?.academic_stage?.name || t("tracks.unnamedStage");

  const removeStepLocally = (subTrackIndex, stepIndex) => {
    const st = subTracks[subTrackIndex];
    updateSubTrack(subTrackIndex, {
      ...st,
      steps: st.steps.filter((_, i) => i !== stepIndex),
    });
  };

  const performDeleteStep = async (subTrackIndex, stepIndex) => {
    removeStepLocally(subTrackIndex, stepIndex);
  };

  const handleDeleteStep = (subTrackIndex, stepIndex) => {
    const step = subTracks[subTrackIndex]?.steps[stepIndex];
    if (!step) return;

    if ((step.progress_count || 0) > 0) {
      toast.error(t("tracks.stepDeleteBlocked"));
      return;
    }

    setConfirmState({
      title: t("tracks.deleteStep"),
      message: t("tracks.stepDeleteConfirm", { name: stepDisplayName(step) }),
      onConfirm: async () => {
        setConfirmState(null);
        await performDeleteStep(subTrackIndex, stepIndex);
      },
    });
  };

  const phaseDisplayName = (phase) =>
    phase?.name?.trim() || t("tracks.academicPhase");

  const removePhaseLocally = (subTrackIndex) => {
    setSubTracks(subTracks.filter((_, i) => i !== subTrackIndex));
  };

  const performDeletePhase = async (subTrackIndex) => {
    removePhaseLocally(subTrackIndex);
  };

  const handleDeletePhase = (subTrackIndex) => {
    const phase = subTracks[subTrackIndex];
    if (!phase) return;

    if (subTracks.length <= 1) {
      toast.error(t("tracks.atLeastOnePhase"));
      return;
    }

    if ((phase.progress_count || 0) > 0) {
      toast.error(t("tracks.phaseDeleteBlocked"));
      return;
    }

    setConfirmState({
      title: t("tracks.deletePhase"),
      message: t("tracks.phaseDeleteConfirm", { name: phaseDisplayName(phase) }),
      onConfirm: async () => {
        setConfirmState(null);
        await performDeletePhase(subTrackIndex);
      },
    });
  };

  const validateForm = () => {
    if (!formName.trim()) {
      toast.error(t("tracks.nameRequired"));
      return false;
    }
    if (subTracks.some((st) => !st.name.trim())) {
      toast.error(t("tracks.subTrackNameRequired"));
      return false;
    }
    if (subTracks.length === 0) {
      toast.error(t("tracks.atLeastOnePhase"));
      return false;
    }
    const totalSteps = subTracks.reduce((n, st) => n + st.steps.length, 0);
    if (totalSteps === 0) {
      toast.error(t("tracks.atLeastOneStep"));
      return false;
    }
    if (subTracks.some((st) => st.steps.some((s) => !s.academic_stage_id))) {
      toast.error(t("tracks.defenseTypeLinkRequired"));
      return false;
    }
    const duplicateInPhase = subTracks.some((st) => {
      const ids = st.steps.map((s) => String(s.academic_stage_id));
      return new Set(ids).size !== ids.length;
    });
    if (duplicateInPhase) {
      toast.error(t("tracks.duplicateDefenseTypeInPhase"));
      return false;
    }

    return true;
  };

  const stepPayload = (step) => ({
    academic_stage_id: step.academic_stage_id || null,
    is_decisive:
      defaultDecisiveForType(
        defenseTypes.find((d) => String(d.id) === String(step.academic_stage_id)),
      ) || step.is_decisive === true,
  });

  const syncRemovedStagesOnSave = async (trackId, snapshot) => {
    if (!snapshot) return;

    const currentPhaseIds = new Set(subTracks.map((st) => st.id).filter(Boolean));
    const currentStepIds = new Set(
      subTracks.flatMap((st) => st.steps.map((s) => s.id).filter(Boolean)),
    );

    const phasesToDelete = snapshot.phaseIds.filter((id) => !currentPhaseIds.has(id));
    const stepsToDelete = snapshot.stepIds.filter((id) => !currentStepIds.has(id));

    for (const phaseId of phasesToDelete) {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/tracks/${trackId}/stages/${phaseId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok && res.status !== 404) {
        if (res.status === 409) {
          throw new Error(t("tracks.phaseDeleteBlocked"));
        }
        throw new Error(data?.message || t("common.error"));
      }
    }

    for (const stepId of stepsToDelete) {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/tracks/${trackId}/stages/${stepId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok && res.status !== 404) {
        if (res.status === 409) {
          throw new Error(t("tracks.stepDeleteBlocked"));
        }
        throw new Error(data?.message || t("common.error"));
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (selectedTrack?.id) {
        const { res, data } = await apiFetch(`${API_BASE_URL}/tracks/${selectedTrack.id}`, {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
          }),
        });
        if (!res.ok) throw new Error(data?.message || t("common.error"));

        await syncRemovedStagesOnSave(selectedTrack.id, editSnapshot);

        const phaseIds = [];

        for (let phaseIndex = 0; phaseIndex < subTracks.length; phaseIndex++) {
          const phase = subTracks[phaseIndex];
          let phaseId = phase.id;

          if (phaseId) {
            const { res: phaseRes, data: phaseData } = await apiFetch(
              `${API_BASE_URL}/tracks/${selectedTrack.id}/stages/${phaseId}`,
              {
                method: "PUT",
                headers: jsonHeaders,
                body: JSON.stringify({
                  name: phase.name.trim(),
                  description: phase.description?.trim() || null,
                }),
              },
            );
            if (!phaseRes.ok) {
              throw new Error(phaseData?.message || t("common.error"));
            }
          } else if (subTracks.length > 1 || phase.steps.some((s) => !s.id)) {
            const { res: phaseRes, data: phaseData } = await apiFetch(
              `${API_BASE_URL}/tracks/${selectedTrack.id}/phases`,
              {
                method: "POST",
                headers: jsonHeaders,
                body: JSON.stringify({
                  name: phase.name.trim(),
                  description: phase.description?.trim() || null,
                  position: phaseIndex + 1,
                }),
              },
            );
            if (!phaseRes.ok) {
              throw new Error(phaseData?.message || t("common.error"));
            }
            phaseId = phaseData?.data?.id;
            if (!phaseId) throw new Error(t("common.error"));
          }

          if (phaseId) {
            phaseIds.push(phaseId);
          }

          const stepIds = [];
          for (let stepIndex = 0; stepIndex < phase.steps.length; stepIndex++) {
            const step = phase.steps[stepIndex];
            if (step.id) {
              const { res: stepRes, data: stepData } = await apiFetch(
                `${API_BASE_URL}/tracks/${selectedTrack.id}/stages/${step.id}`,
                {
                  method: "PUT",
                  headers: jsonHeaders,
                  body: JSON.stringify(stepPayload(step)),
                },
              );
              if (!stepRes.ok) {
                throw new Error(stepData?.message || t("common.error"));
              }
              stepIds.push(step.id);
            } else {
              const createBody = {
                ...stepPayload(step),
                position: stepIndex + 1,
              };
              if (phaseId) {
                createBody.parent_id = phaseId;
              }

              const { res: stepRes, data: stepData } = await apiFetch(
                `${API_BASE_URL}/tracks/${selectedTrack.id}/stages`,
                {
                  method: "POST",
                  headers: jsonHeaders,
                  body: JSON.stringify(createBody),
                },
              );
              if (!stepRes.ok) {
                throw new Error(stepData?.message || t("common.error"));
              }
              const newStepId = stepData?.data?.id;
              if (!newStepId) throw new Error(t("common.error"));
              stepIds.push(newStepId);
            }
          }

          if (phaseId && stepIds.length > 1) {
            await apiFetch(
              `${API_BASE_URL}/tracks/${selectedTrack.id}/phases/${phaseId}/steps/reorder`,
              {
                method: "PUT",
                headers: jsonHeaders,
                body: JSON.stringify({ step_ids: stepIds }),
              },
            );
          }
        }

        if (phaseIds.length > 1) {
          await apiFetch(`${API_BASE_URL}/tracks/${selectedTrack.id}/phases/reorder`, {
            method: "PUT",
            headers: jsonHeaders,
            body: JSON.stringify({ phase_ids: phaseIds }),
          });
        }

        toast.success(t("tracks.updated"));
      } else {
        const { res, data } = await apiFetch(`${API_BASE_URL}/tracks`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            stages: subTracks.map((st) => ({
              name: st.name.trim(),
              description: st.description?.trim() || null,
              stage_kind: "phase",
              steps: st.steps.map((s) => ({
                academic_stage_id: s.academic_stage_id || null,
                is_decisive:
                  defaultDecisiveForType(
                    defenseTypes.find((d) => String(d.id) === String(s.academic_stage_id)),
                  ) || s.is_decisive === true,
              })),
            })),
          }),
        });
        if (!res.ok) throw new Error(data?.errors?.name?.[0] || data?.message || t("common.error"));
        toast.success(t("tracks.created"));
      }
      setDialogOpen(false);
      setEditSnapshot(null);
      fetchTracks();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTrack = () => {
    if (!selectedTrack?.id) return;
    const expected = (selectedTrack.name || formName || "").trim();
    if (!expected || deleteConfirmTyped.trim() !== expected) {
      toast.error(t("tracks.deleteTypeNameMismatch"));
      return;
    }
    setConfirmState({
      title: t("tracks.delete"),
      message: t("tracks.deletePermanentConfirm", { name: expected }),
      onConfirm: async () => {
        const { res, data } = await apiFetch(`${API_BASE_URL}/tracks/${selectedTrack.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (res.ok) {
          toast.success(t("tracks.deleted"));
          setDialogOpen(false);
          setSelectedTrack(null);
          setDeleteConfirmTyped("");
          fetchTracks();
        } else {
          toast.error(data?.message || t("common.error"));
        }
        setConfirmState(null);
      },
    });
  };

  const handleAssign = async () => {
    if (!selectedTrack || selectedStudentIds.length === 0) return;
    setSaving(true);
    try {
      const { res, data } = await apiFetch(`${API_BASE_URL}/tracks/${selectedTrack.id}/students`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          student_ids: selectedStudentIds,
          confirm_reassign: confirmReassign,
        }),
      });
      if (res.status === 409) {
        setConfirmReassign(true);
        toast.error(t("tracks.reassignWarning"));
        return;
      }
      if (!res.ok) throw new Error(data?.message || t("common.error"));
      toast.success(t("tracks.assignSuccess"));
      setAssignOpen(false);
      setSelectedStudentIds([]);
      setConfirmReassign(false);
      fetchTracks();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = async () => {
    const selectedStage = overrideStages.find(
      (s) => String(s.id) === String(overrideStageId),
    );
    if (
      !overrideStudentId ||
      !overrideStageId ||
      selectedStage?.completed ||
      overrideReason.trim().length < 10
    ) {
      toast.error(
        selectedStage?.completed
          ? t("tracks.overrideStepHint")
          : t("tracks.overrideReasonMin"),
      );
      return;
    }
    setSaving(true);
    try {
      const { res, data } = await apiFetch(
        `${API_BASE_URL}/student-progress/${overrideStudentId}/override`,
        {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({
            track_stage_id: Number(overrideStageId),
            reason: overrideReason.trim(),
          }),
        },
      );
      if (!res.ok) throw new Error(data?.message || t("common.error"));
      toast.success(t("tracks.overrideSuccess"));
      setOverrideOpen(false);
      setOverrideReason("");
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={pageContainerSx}>
      <PageHeader
        title={t("tracks.title")}
        subtitle={t("tracks.subtitle")}
        icon={<TimelineIcon sx={{ fontSize: 28 }} />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={openOverride} sx={{ fontWeight: 700, borderRadius: 2 }}>
              {t("tracks.override")}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ ...btnPrimarySx, fontWeight: 800, borderRadius: 2 }}
            >
              {t("tracks.create")}
            </Button>
          </Stack>
        }
      />

      <DefenseWorkflowGuide variant="tracks" />

      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={fetchTracks}>{t("common.retry")}</Button>}>
          {fetchError}
        </Alert>
      )}

      {loading ? (
        <AdminCardGridSkeleton count={2} layout="track" />
      ) : tracks.length === 0 ? (
        <Alert severity="info">{t("tracks.noTracks")}</Alert>
      ) : (
        <Grid container spacing={2.5}>
          {tracks.map((track) => {
            const detail = trackDetails[track.id];
            return (
              <Grid key={track.id} size={{ xs: 12 }}>
                <TrackListCard
                  track={track}
                  detail={detail}
                  onEdit={() => openEdit(track)}
                  onAssign={() => {
                    setSelectedTrack(track);
                    setSelectedStudentIds([]);
                    setConfirmReassign(false);
                    setAssignOpen(true);
                    fetchStudents();
                  }}
                />
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedTrack ? t("tracks.edit") : t("tracks.create")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography variant="overline" sx={{ fontWeight: 900, color: "primary.main" }}>
                {t("tracks.mainTrack")}
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <TextField
                  label={t("tracks.name")}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label={t("tracks.description")}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Stack>
            </Paper>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                {t("tracks.subTracks")}
              </Typography>
              {defenseTypes.length === 0 ? (
                <Alert
                  severity="warning"
                  sx={{ mt: 1.5 }}
                  action={
                    <Button component={RouterLink} to="/dashboard/scheduling" size="small" color="inherit">
                      {t("tracks.goToScheduling")}
                    </Button>
                  }
                >
                  {t("tracks.noDefenseTypes")}
                </Alert>
              ) : null}
            </Box>

            <Stack spacing={2}>
              {subTracks.map((st, subTrackIndex) => (
                <SubTrackPanel
                  key={st.id || `sub-${subTrackIndex}`}
                  subTrack={st}
                  subTrackIndex={subTrackIndex}
                  totalSubTracks={subTracks.length}
                  defenseTypes={defenseTypes}
                  allPhases={subTracks}
                  onSubTrackChange={(next) => updateSubTrack(subTrackIndex, next)}
                  onMoveSubTrack={(dir) => moveSubTrack(subTrackIndex, dir)}
                  onMoveStep={(stepIndex, dir) => moveStepInSubTrack(subTrackIndex, stepIndex, dir)}
                  onExcludeStep={(stepIndex) => handleDeleteStep(subTrackIndex, stepIndex)}
                  onDeletePhase={() => handleDeletePhase(subTrackIndex)}
                  canDeletePhase={subTracks.length > 1 && (st.progress_count || 0) === 0}
                />
              ))}
            </Stack>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addEmptyPhase}
              sx={{ fontWeight: 700 }}
            >
              {t("tracks.addAcademicPhase")}
            </Button>
          </Stack>

          {selectedTrack?.id ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderColor: "error.light",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "transparent" : "rgba(239,68,68,0.04)",
              }}
            >
              <Typography variant="subtitle2" color="error" sx={{ fontWeight: 900, mb: 0.75 }}>
                {t("tracks.dangerZone")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t("tracks.deleteFromEditHint")}
              </Typography>
              <TextField
                size="small"
                fullWidth
                label={t("tracks.deleteTypeNameLabel", { name: selectedTrack.name })}
                value={deleteConfirmTyped}
                onChange={(e) => setDeleteConfirmTyped(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Button
                color="error"
                variant="outlined"
                disabled={deleteConfirmTyped.trim() !== (selectedTrack.name || "").trim()}
                onClick={handleDeleteTrack}
                sx={{ fontWeight: 800 }}
              >
                {t("tracks.delete")}
              </Button>
            </Paper>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <ButtonSpinner size={22} /> : t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("tracks.assignStudents")}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{t("tracks.selectStudents")}</InputLabel>
            <Select
              multiple
              label={t("tracks.selectStudents")}
              value={selectedStudentIds}
              onChange={(e) => setSelectedStudentIds(e.target.value)}
              renderValue={(selected) =>
                students
                  .filter((s) => selected.includes(s.id))
                  .map((s) => s.name)
                  .join(", ")
              }
            >
              {students.length === 0 ? (
                <MenuItem disabled value="">
                  {t("tracks.noStudents")}
                </MenuItem>
              ) : (
                students.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          {confirmReassign && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {t("tracks.reassignWarning")}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleAssign} disabled={saving}>
            {t("tracks.assign")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={overrideOpen} onClose={() => setOverrideOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("tracks.override")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={students}
              value={selectedOverrideStudent}
              onChange={(_, student) => {
                const nextId = student?.id != null ? String(student.id) : "";
                setOverrideStudentId(nextId);
                setOverridePhaseKey("");
                setOverrideStageId("");
                loadOverrideStagesForStudent(nextId);
              }}
              getOptionLabel={(s) => {
                if (!s) return "";
                const num = s.student_number ? ` · ${s.student_number}` : "";
                return `${s.name || ""}${num}`;
              }}
              isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
              filterOptions={(options, { inputValue }) => {
                const q = String(inputValue || "").trim().toLowerCase();
                if (!q) return options;
                return options.filter((s) => {
                  const name = String(s.name || "").toLowerCase();
                  const email = String(s.email || "").toLowerCase();
                  const num = String(s.student_number || "").toLowerCase();
                  return name.includes(q) || email.includes(q) || num.includes(q);
                });
              }}
              renderOption={(props, s) => (
                <Box component="li" {...props} key={s.id}>
                  <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {s.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {[s.student_number, s.email].filter(Boolean).join(" · ") || "—"}
                    </Typography>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("tracks.selectStudent")}
                  placeholder={t("tracks.searchStudentOverride")}
                />
              )}
            />

            {!overrideStudentId ? (
              <Typography variant="body2" color="text.secondary">
                {t("tracks.selectStudentFirst")}
              </Typography>
            ) : overrideLoading ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} />
                <Typography variant="body2">{t("common.loading")}</Typography>
              </Stack>
            ) : !hasSelectableOverrideSteps ? (
              <Alert severity="info">{t("tracks.noRemainingStages")}</Alert>
            ) : (
              <>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                    {t("tracks.targetPhase")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {t("tracks.overridePhaseHint")}
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={overridePhaseKey}
                    onChange={(_, value) => {
                      if (!value) return;
                      setOverridePhaseKey(value);
                      setOverrideStageId("");
                    }}
                    sx={{ flexWrap: "wrap", gap: 0.75 }}
                  >
                    {overridePhaseGroups.map((phase) => (
                      <ToggleButton
                        key={phase.key}
                        value={phase.key}
                        disabled={!phase.hasSelectable}
                        sx={{ fontWeight: 800, textTransform: "none" }}
                      >
                        {phase.name}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                {overridePhaseKey ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                      {t("tracks.targetStep")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {t("tracks.overrideStepHint")}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
                      {overrideStepsForPhase.map((stage) => {
                        const selected = String(overrideStageId) === String(stage.id);
                        const label =
                          stage.name || stage.academic_stage?.name || `#${stage.id}`;
                        return (
                          <Chip
                            key={stage.id}
                            clickable
                            color={selected ? "warning" : "default"}
                            variant={selected ? "filled" : "outlined"}
                            label={label}
                            onClick={() => setOverrideStageId(String(stage.id))}
                            sx={{ fontWeight: 800 }}
                          />
                        );
                      })}
                    </Stack>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t("tracks.selectPhaseFirst")}
                  </Typography>
                )}
              </>
            )}

            <TextField
              label={t("tracks.overrideReason")}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleOverride}
            disabled={
              saving ||
              !overrideStudentId ||
              !overrideStageId ||
              overrideStages.some(
                (s) => String(s.id) === String(overrideStageId) && s.completed,
              )
            }
          >
            {t("tracks.overrideConfirm")}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        content={confirmState?.message}
        onConfirm={confirmState?.onConfirm}
        onClose={() => setConfirmState(null)}
      />
    </Box>
  );
}
