import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Paper, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useLanguage } from "../context/LanguageContext";

/** Drag-and-drop zone for selecting a single XML file. */
export default function XmlUploadDropzone({
  onFileSelect,
  disabled = false,
  maxSize = 10 * 1024 * 1024,
  selectedFile = null,
}) {
  const { t, isRtl } = useLanguage();

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect?.(acceptedFiles[0]);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "text/xml": [".xml"],
        "application/xml": [".xml"],
      },
      maxFiles: 1,
      maxSize,
      disabled,
    });

  const rejectionMessage = fileRejections[0]?.errors[0]?.code;

  return (
    <Box>
      <Paper
        {...getRootProps()}
        elevation={0}
        sx={{
          p: 4,
          border: "2px dashed",
          borderColor: isDragReject
            ? "error.main"
            : isDragActive
              ? "primary.main"
              : "divider",
          borderRadius: 2,
          bgcolor: isDragActive ? "action.hover" : "background.paper",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          textAlign: "center",
          direction: isRtl ? "rtl" : "ltr",
        }}
      >
        <input {...getInputProps()} />
        <UploadFileIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {t("xmlImport.dropzoneTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t("xmlImport.dropzoneHint")}
        </Typography>
        {selectedFile && (
          <Typography variant="body2" sx={{ mt: 2, fontWeight: 700 }}>
            {selectedFile.name}
          </Typography>
        )}
      </Paper>
      {rejectionMessage === "file-too-large" && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
          {t("xmlImport.fileTooLarge")}
        </Typography>
      )}
      {rejectionMessage === "file-invalid-type" && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
          {t("xmlImport.invalidFormat")}
        </Typography>
      )}
    </Box>
  );
}
