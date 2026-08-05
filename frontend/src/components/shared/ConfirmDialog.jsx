import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { useLanguage } from "../../context/LanguageContext";

/** Modal dialog that confirms a destructive or important action. */
export default function ConfirmDialog({
  open,
  title,
  content,
  onConfirm,
  onClose,
  confirmText,
  cancelText,
  confirmColor = "error",
  loading = false,
}) {
  const { t } = useLanguage();

  return (
    <Dialog
      open={open}
      onClose={!loading ? onClose : undefined}
      PaperProps={{
        sx: { borderRadius: 3, p: 1, minWidth: { xs: 280, sm: 400 } },
      }}
    >
      <DialogTitle sx={{ fontWeight: 900 }}>{title}</DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ fontWeight: 500 }}>
          {content}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          color="inherit"
          disabled={loading}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {cancelText || t("common.cancel")}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={loading}
          sx={{ fontWeight: 700, borderRadius: 2 }}
          disableElevation
        >
          {loading ? t("common.executing") : confirmText || t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
