import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  useTheme,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ProjectSectionShell from "../../components/ProjectSectionShell";

/** Kanban-style project tasks tab with drag-and-drop status updates. */
export default function TasksTab({
  projectId,
  projectDescription,
  showAiGenerate = false,
  tasks,
  setTasks,
  updateProgressLocally,
  setDialogConfig,
  setDialogLoading,
  closeDialog,
  compact = false,
}) {
  const { authHeaders, apiFetch, API_BASE_URL } = useAuth();
  const { t, lang, isRtl } = useLanguage();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const today = new Date().toISOString().split("T")[0];
  const maxYear = new Date().getFullYear() + 5;
  const maxDate = `${maxYear}-12-31`;

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskMsg, setTaskMsg] = useState({ type: "", text: "" });

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskData, setEditTaskData] = useState({
    title: "",
    description: "",
    deadline: "",
  });
  const [savingTask, setSavingTask] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isConfirmingRegenerate, setIsConfirmingRegenerate] = useState(false);

  const overdueCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.deadline &&
          task.deadline < today &&
          (task.status || "pending") !== "completed",
      ).length,
    [tasks, today],
  );

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    if (statusFilter === "overdue") {
      return tasks.filter(
        (task) =>
          task.deadline &&
          task.deadline < today &&
          (task.status || "pending") !== "completed",
      );
    }
    return tasks.filter((task) => (task.status || "pending") === statusFilter);
  }, [tasks, statusFilter, today]);

  const aiTasks = useMemo(
    () => tasks.filter((task) => task.ai_generated === true),
    [tasks],
  );

  const hasAiTasks = aiTasks.length > 0;

  const canRegenerateAiTasks = useMemo(
    () =>
      hasAiTasks &&
      aiTasks.every((task) => (task.status || "pending") === "pending"),
    [aiTasks, hasAiTasks],
  );

  const showAiGenerateButton = !hasAiTasks || canRegenerateAiTasks;

  const descriptionTooShort =
    !projectDescription || projectDescription.length < 20;

  const filterChips = [
    { key: "all", label: t("projectDetails.taskFilterAll") },
    { key: "overdue", label: t("projectDetails.taskFilterOverdue"), count: overdueCount, color: "error" },
    { key: "pending", label: t("projectDetails.columnPending") },
    { key: "in_progress", label: t("projectDetails.columnInProgress") },
    { key: "completed", label: t("projectDetails.columnCompleted") },
  ];

  /** Validates a task deadline is within allowed date range. */
  const validateDeadline = (dateStr) => {
    if (!dateStr) return true;
    if (dateStr < today) return t("projectDetails.datePastError");
    if (dateStr > maxDate) return t("projectDetails.dateFarError");
    return true;
  };

  /** Creates a new task and updates local progress. */
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskMsg({ type: "", text: "" });
    if (!newTask.title.trim())
      return setTaskMsg({ type: "error", text: t("projectDetails.taskTitleRequired") });

    const dateCheck = validateDeadline(newTask.deadline);
    if (dateCheck !== true)
      return setTaskMsg({ type: "error", text: dateCheck });

    try {
      setCreatingTask(true);
      const { res, data } = await apiFetch(`${API_BASE_URL}/task/create`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          project_id: projectId,
          title: newTask.title,
          description: newTask.description || null,
          deadline: newTask.deadline || null,
        }),
      });
      if (!res.ok)
        return setTaskMsg({
          type: "error",
          text: data?.message || t("projectDetails.taskCreateError"),
        });

      const newTaskList = [data?.task, ...tasks].filter(Boolean);
      setTasks(newTaskList);
      updateProgressLocally(newTaskList);

      setNewTask({ title: "", description: "", deadline: "" });
      toast.success(t("projectDetails.taskCreated"));
    } catch {
      setTaskMsg({ type: "error", text: t("common.serverError") });
    } finally {
      setCreatingTask(false);
    }
  };

  /** Opens inline edit form for a task. */
  const handleEditTaskClick = (task) => {
    setEditingTaskId(task.id);
    setEditTaskData({
      title: task.title || "",
      description: task.description || "",
      deadline: task.deadline || "",
    });
  };

  /** Saves title, description, and deadline edits for a task. */
  const handleSaveEditTask = async (taskId) => {
    if (!editTaskData.title.trim()) return toast.error(t("projectDetails.taskTitleRequiredShort"));

    const dateCheck = validateDeadline(editTaskData.deadline);
    if (dateCheck !== true) return toast.error(dateCheck);

    try {
      setSavingTask(true);
      const { res } = await apiFetch(`${API_BASE_URL}/task/update/${taskId}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          title: editTaskData.title,
          description: editTaskData.description || null,
          deadline: editTaskData.deadline || null,
        }),
      });

      if (!res.ok) return toast.error(t("projectDetails.taskUpdateError"));

      const updated = tasks.map((task) =>
        task.id === taskId ? { ...task, ...editTaskData } : task,
      );
      setTasks(updated);
      setEditingTaskId(null);
      toast.success(t("projectDetails.taskUpdated"));
    } catch {
      toast.error(t("common.serverError"));
    } finally {
      setSavingTask(false);
    }
  };

  /** Generates AI tasks for the project, with optional regeneration. */
  const handleGenerateAITasks = async (regenerate = false) => {
    if (descriptionTooShort) {
      toast.error(t("ideation.descriptionTooShort"));
      return;
    }

    if (hasAiTasks && !canRegenerateAiTasks) {
      return;
    }

    if (hasAiTasks && !regenerate) {
      setIsConfirmingRegenerate(true);
      try {
        const result = await Swal.fire({
          title: t("taskGeneration.confirmTitle"),
          text: t("taskGeneration.confirmRegenerate"),
          icon: "warning",
          showCancelButton: true,
          reverseButtons: isRtl,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: t("common.confirm"),
          cancelButtonText: t("common.cancel"),
          didOpen: (popup) => {
            if (isRtl) {
              popup.setAttribute("dir", "rtl");
              popup.style.textAlign = "right";
            }
          },
        });

        if (!result.isConfirmed) return;
        return handleGenerateAITasks(true);
      } finally {
        setIsConfirmingRegenerate(false);
      }
    }

    try {
      setIsGeneratingAI(true);

      const { res, data } = await apiFetch(
        `${API_BASE_URL}/projects/${projectId}/generate-tasks`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ regenerate }),
        },
      );

      if (!res.ok) {
        toast.error(data?.message || t("taskGeneration.error"));
        return;
      }

      const newAiTasks = data?.data?.tasks || [];

      if (regenerate) {
        const manualTasks = tasks.filter((task) => !task.ai_generated);
        const updatedTasks = [...newAiTasks, ...manualTasks];
        setTasks(updatedTasks);
        updateProgressLocally(updatedTasks);
      } else {
        const updatedTasks = [...newAiTasks, ...tasks];
        setTasks(updatedTasks);
        updateProgressLocally(updatedTasks);
      }

      toast.success(data?.message || t("taskGeneration.success"));
    } catch (err) {
      console.error("AI task generation error:", err);
      toast.error(t("taskGeneration.error"));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  /** Opens a confirm dialog and deletes a task on approval. */
  const handleDeleteTask = (taskId) => {
    setDialogConfig({
      isOpen: true,
      title: t("projectDetails.taskDeleteTitle"),
      content: t("projectDetails.taskDeleteContent"),
      confirmText: t("projectDetails.taskDeleteConfirm"),
      confirmColor: "error",
      onConfirm: async () => {
        try {
          setDialogLoading(true);
          const { res } = await apiFetch(`${API_BASE_URL}/task/delete/${taskId}`, {
            method: "DELETE",
            headers: authHeaders(),
          });

          if (!res.ok) {
            toast.error(t("projectDetails.taskDeleteError"));
            return;
          }

          const updated = tasks.filter((task) => task.id !== taskId);
          setTasks(updated);
          updateProgressLocally(updated);

          toast.success(t("projectDetails.taskDeleted"));
          closeDialog();
        } catch {
          toast.error(t("common.serverError"));
        } finally {
          setDialogLoading(false);
        }
      },
    });
  };

  /** Stores the dragged task id for drop handling. */
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  /** Allows dropping a task onto a column. */
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  /** Updates task status after drag-and-drop and syncs to API. */
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData("taskId"));
    const task = tasks.find((t) => t.id === taskId);

    if (!task || task.status === newStatus) return;

    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t,
    );
    setTasks(updated);
    updateProgressLocally(updated);

    try {
      const { res } = await apiFetch(`${API_BASE_URL}/task/update/${taskId}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error(t("projectDetails.statusUpdateError"));
    }
  };

  /** Renders a droppable kanban column for a task status. */
  const renderTaskColumn = (statusValue, title, colorCode) => {
    const columnTasks = filteredTasks.filter(
      (task) => (task.status || "pending") === statusValue,
    );

    return (
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Paper
          elevation={0}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, statusValue)}
          sx={{
            p: compact ? 1.5 : 2,
            bgcolor: isDark ? "background.default" : "#fdfdfd",
            borderRadius: compact ? "20px" : "30px",
            minHeight: compact ? "380px" : "450px",
            height: "100%",
            border: "1px solid",
            borderColor: "divider",
            borderTop: `6px solid ${colorCode}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: compact ? 1.75 : 3, px: 1 }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: "1.05rem",
                color: "text.primary",
              }}
            >
              {title}
            </Typography>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                fontSize: 13,
                bgcolor: colorCode,
                fontWeight: 800,
              }}
            >
              {columnTasks.length}
            </Avatar>
          </Stack>

          <Stack spacing={2} sx={{ flex: 1 }}>
            {columnTasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const isOverdue = task.deadline && task.deadline < today;

              return (
                <Paper
                  key={task.id}
                  elevation={0}
                  draggable={!isEditing}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  sx={{
                    p: 2,
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    cursor: isEditing ? "default" : "grab",
                    "&:active": { cursor: isEditing ? "default" : "grabbing" },
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: isEditing ? "none" : "translateY(-2px)",
                      boxShadow: isEditing
                        ? "none"
                        : isDark
                          ? "0px 4px 12px rgba(0,0,0,0.3)"
                          : "0px 4px 12px rgba(0,0,0,0.03)",
                    },
                  }}
                >
                  {isEditing ? (
                    <Stack spacing={1.5}>
                      <TextField
                        size="small"
                        label={t("projectDetails.taskTitle")}
                        value={editTaskData.title}
                        onChange={(e) =>
                          setEditTaskData({
                            ...editTaskData,
                            title: e.target.value,
                          })
                        }
                      />
                      <TextField
                        size="small"
                        label={t("projectDetails.descriptionOptional")}
                        value={editTaskData.description}
                        onChange={(e) =>
                          setEditTaskData({
                            ...editTaskData,
                            description: e.target.value,
                          })
                        }
                        multiline
                        minRows={2}
                      />
                      <TextField
                        size="small"
                        type="date"
                        label={t("projectDetails.deadline")}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: today, max: maxDate }}
                        value={editTaskData.deadline}
                        onChange={(e) =>
                          setEditTaskData({
                            ...editTaskData,
                            deadline: e.target.value,
                          })
                        }
                      />
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={() => setEditingTaskId(null)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={savingTask}
                          onClick={() => handleSaveEditTask(task.id)}
                        >
                          {savingTask ? t("projectDetails.saving") : t("common.save")}
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "1rem",
                              mb: 0.5,
                              color: "text.primary",
                            }}
                          >
                            {task.title}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5, mb: 1 }}>
                            {task.ai_generated && (
                              <Chip
                                label={t("taskGeneration.aiGenerated")}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={{ fontSize: "0.7rem", height: 20 }}
                              />
                            )}
                          </Stack>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                          >
                            {task.description || t("common.noDescription")}
                          </Typography>
                        </Box>
                        <DragIndicatorRoundedIcon
                          sx={{ color: "text.disabled", cursor: "grab" }}
                          fontSize="small"
                        />
                      </Stack>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: isOverdue ? "error.main" : "text.secondary",
                            fontWeight: 700,
                          }}
                        >
                          {task.deadline
                            ? new Date(task.deadline).toLocaleDateString(dateLocale)
                            : t("common.noDeadline")}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={t("common.edit")}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditTaskClick(task)}
                              sx={{ color: "text.secondary" }}
                            >
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("common.delete")}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </Box>
                  )}
                </Paper>
              );
            })}

            {columnTasks.length === 0 && (
              <Box
                sx={{
                  border: "1.5px dashed",
                  borderColor: "divider",
                  borderRadius: "50px",
                  py: 3,
                  mt: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontWeight: 600 }}
                >
                  {t("projectDetails.dragHere")}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  };

  return (
    <ProjectSectionShell
      icon={TaskAltRoundedIcon}
      title={t("projectDetails.tabTasks")}
      subtitle={t("projectDetails.tasksSubtitle")}
      accent="#3B82F6"
      sx={{ mt: 0 }}
      compact={compact}
      actions={
        overdueCount > 0 ? (
          <Chip
            size="small"
            color="error"
            label={t("projectDetails.overdueCount", { count: overdueCount })}
            sx={{ fontWeight: 800 }}
          />
        ) : (
          <Chip
            size="small"
            label={t("projectDetails.tasksTotal", { count: tasks.length })}
            sx={{ fontWeight: 800 }}
          />
        )
      }
    >
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: compact ? 1.5 : 2.5, gap: 0.75 }}>
        {filterChips.map(({ key, label, count, color }) => (
          <Chip
            key={key}
            label={count != null && count > 0 ? `${label} (${count})` : label}
            size="small"
            color={statusFilter === key ? color || "primary" : "default"}
            variant={statusFilter === key ? "filled" : "outlined"}
            onClick={() => setStatusFilter(key)}
            sx={{ fontWeight: 800, cursor: "pointer" }}
          />
        ))}
      </Stack>

      {showAiGenerate && showAiGenerateButton && (
        <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
          <Tooltip
            title={
              descriptionTooShort ? t("ideation.descriptionTooShort") : ""
            }
            arrow
          >
            <span>
              <LoadingButton
                variant="contained"
                color="secondary"
                startIcon={<AutoAwesomeRoundedIcon />}
                loading={isGeneratingAI}
                loadingPosition="start"
                disabled={
                  descriptionTooShort || isGeneratingAI || isConfirmingRegenerate
                }
                onClick={() => handleGenerateAITasks(false)}
                sx={{ fontWeight: 600 }}
              >
                {isGeneratingAI
                  ? t("taskGeneration.generating")
                  : hasAiTasks
                    ? t("taskGeneration.regenerate")
                    : t("taskGeneration.generate")}
              </LoadingButton>
            </span>
          </Tooltip>
        </Box>
      )}

      <Box component="form" onSubmit={handleCreateTask} sx={{ mb: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label={t("projectDetails.taskTitle")}
            value={newTask.title}
            onChange={(e) =>
              setNewTask((p) => ({ ...p, title: e.target.value }))
            }
            sx={{ borderRadius: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label={t("projectDetails.descriptionOptional")}
            value={newTask.description}
            onChange={(e) =>
              setNewTask((p) => ({ ...p, description: e.target.value }))
            }
          />
          <TextField
            size="small"
            type="date"
            label={t("projectDetails.deadline")}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: today, max: maxDate }}
            value={newTask.deadline}
            onChange={(e) =>
              setNewTask((p) => ({ ...p, deadline: e.target.value }))
            }
            sx={{ minWidth: 200 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={creatingTask}
            sx={{ minWidth: 100, borderRadius: 2, fontWeight: 800 }}
          >
            {creatingTask ? "..." : t("common.add")}
          </Button>
        </Stack>
        {taskMsg.text && (
          <Alert
            severity={taskMsg.type === "error" ? "error" : "success"}
            sx={{ mt: 2 }}
          >
            {taskMsg.text}
          </Alert>
        )}
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={3}
        alignItems="stretch"
        sx={{ width: "100%" }}
      >
        {renderTaskColumn("pending", t("projectDetails.columnPending"), "#f39c12")}
        {renderTaskColumn("in_progress", t("projectDetails.columnInProgress"), "#3498db")}
        {renderTaskColumn("completed", t("projectDetails.columnCompleted"), "#2ecc71")}
      </Stack>
    </ProjectSectionShell>
  );
}
