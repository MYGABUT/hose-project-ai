import React, { useState } from 'react';
import {
    Box, Stepper, Step, StepLabel, Typography,
    Paper, Button as MuiButton, Alert, CircularProgress,
    Table, TableBody, TableCell, TableHead, TableRow,
    TableContainer
} from '@mui/material';
import {
    CloudUpload as UploadIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    FileDownload as DownloadIcon
} from '@mui/icons-material';
import './ImportWizard.css';

const STEPS = ['Upload File', 'Preview & Validate', 'Finishing'];

export default function ImportWizard({
    title = "Data Import",
    templateUrl,
    onDownloadTemplate,
    onPreview,
    onCommit
}) {
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [result, setResult] = useState(null);

    // --- Step 1: Upload ---
    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            // Validate extension
            if (!selected.name.match(/\.(xlsx|xls|csv)$/)) {
                setError("Please upload Excel (.xlsx) or CSV files only.");
                return;
            }
            setFile(selected);
            setError(null);
            handlePreview(selected);
        }
    };

    const handlePreview = async (selectedFile) => {
        setLoading(true);
        setError(null);
        try {
            const data = await onPreview(selectedFile);
            setPreviewData(data);
            setActiveStep(1);
        } catch (err) {
            setError(err.message || "Failed to preview file");
            setFile(null); // Reset file on error
        } finally {
            setLoading(false);
        }
    };

    // --- Step 2: Commit ---
    const handleCommit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await onCommit(file);
            setResult(res);
            setActiveStep(2);
        } catch (err) {
            setError(err.message || "Failed to commit import");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setActiveStep(0);
        setFile(null);
        setPreviewData(null);
        setResult(null);
        setError(null);
    };

    // --- Renders ---

    const renderUploadParam = () => (
        <div className="upload-container">
            <Box
                className="upload-zone"
                component="label"
            >
                <input
                    type="file"
                    hidden
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                />
                <UploadIcon className="upload-icon" />
                <Typography variant="h6">
                    Click to Upload Excel / CSV
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    or drag and drop file here
                </Typography>
            </Box>

            {onDownloadTemplate && (
                <Box mt={2} textAlign="center">
                    <MuiButton
                        startIcon={<DownloadIcon />}
                        onClick={onDownloadTemplate}
                    >
                        Download Template
                    </MuiButton>
                </Box>
            )}
        </div>
    );

    const renderPreview = () => {
        if (!previewData) return null;

        const { columns, preview_data, missing_columns, status } = previewData;
        const hasMissing = missing_columns && missing_columns.length > 0;

        return (
            <div className="preview-container">
                <Box mb={2}>
                    <Alert severity={hasMissing ? "error" : "info"}>
                        {hasMissing
                            ? `Missing Columns: ${missing_columns.join(", ")}`
                            : `Ready to import. Shows first ${preview_data.length} rows.`}
                    </Alert>
                </Box>

                <TableContainer component={Paper} className="preview-table-container">
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {columns.map(col => (
                                    <TableCell key={col} style={{ fontWeight: 'bold' }}>{col}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {preview_data.map((row, i) => (
                                <TableRow key={i}>
                                    {columns.map(col => (
                                        <TableCell key={col}>
                                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box mt={3} display="flex" justifyContent="space-between">
                    <MuiButton onClick={handleReset} disabled={loading}>
                        Cancel
                    </MuiButton>
                    <MuiButton
                        variant="contained"
                        color="primary"
                        disabled={loading || hasMissing}
                        onClick={handleCommit}
                    >
                        {loading ? 'Importing...' : 'Start Import'}
                    </MuiButton>
                </Box>
            </div>
        );
    };

    const renderResult = () => {
        if (!result) return null;
        const { success_count, error_count, errors } = result;
        const isSuccess = error_count === 0;

        return (
            <div className="result-container">
                {isSuccess ?
                    <SuccessIcon className="result-icon result-success" /> :
                    <ErrorIcon className="result-icon result-error" />
                }

                <Typography variant="h5" gutterBottom>
                    {isSuccess ? "Import Successful!" : "Import Completed with Errors"}
                </Typography>

                <Box className="preview-stats" justifyContent="center">
                    <Paper className="stat-card">
                        <div className="stat-value" style={{ color: '#4caf50' }}>{success_count}</div>
                        <div className="stat-label">Success</div>
                    </Paper>
                    <Paper className="stat-card">
                        <div className="stat-value" style={{ color: '#f44336' }}>{error_count}</div>
                        <div className="stat-label">Failed</div>
                    </Paper>
                </Box>

                {errors && errors.length > 0 && (
                    <Box className="error-list">
                        <Typography variant="subtitle2" color="error">Error Details:</Typography>
                        <ul>
                            {errors.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                    </Box>
                )}

                <Box mt={3}>
                    <MuiButton variant="contained" onClick={handleReset}>
                        Import More
                    </MuiButton>
                </Box>
            </div>
        );
    };

    return (
        <div className="import-wizard">
            <Typography variant="h5" gutterBottom>{title}</Typography>

            <Stepper activeStep={activeStep}>
                {STEPS.map(label => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Box className="wizard-step-content">
                {error && (
                    <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {loading && activeStep === 0 && (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                )}

                {!loading && activeStep === 0 && renderUploadParam()}
                {activeStep === 1 && renderPreview()}
                {activeStep === 2 && renderResult()}
            </Box>
        </div>
    );
}
