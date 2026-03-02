import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Button,
    Table, TableBody, TableCell, TableHead, TableRow,
    Chip, IconButton, CircularProgress, Alert, Tooltip,
    Dialog, DialogTitle, DialogContent, Grid
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    CloudUpload as UploadIcon,
    Psychology as BrainIcon,
    CompareArrows as MatchIcon,
    Visibility as ViewIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import { invoiceIngestApi } from '../../services/invoiceIngestApi';
import { formatCurrency, formatDate } from '../../utils/formatters';

const InvoiceInboxPage = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    useEffect(() => {
        fetchInbox();
    }, []);

    const fetchInbox = async () => {
        setLoading(true);
        try {
            const res = await invoiceIngestApi.getInbox({ limit: 50 });
            setInvoices(res.data || []);
        } catch (err) {
            setError("Gagal memuat inbox.");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncEmail = async () => {
        setSyncing(true);
        try {
            const res = await invoiceIngestApi.syncEmail();
            alert(res.message);
            fetchInbox();
        } catch (err) {
            alert("Gagal sync email: " + err.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleProcess = async (id) => {
        try {
            await invoiceIngestApi.processInvoice(id);
            fetchInbox(); // Refresh to see new data
        } catch (err) {
            alert("AI Processing Failed: " + err.message);
        }
    };

    const handleMatch = async (id) => {
        try {
            await invoiceIngestApi.matchInvoice(id);
            fetchInbox();
        } catch (err) {
            alert("Matching Failed: " + err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'NEW': return 'info';
            case 'PROCESSING': return 'warning';
            case 'OCR_DONE': return 'primary';
            case 'MATCHED': return 'success';
            case 'FAILED': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box p={3}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    📧 Smart Invoice Inbox
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                        onClick={handleSyncEmail}
                        disabled={syncing}
                        sx={{ mr: 2 }}
                    >
                        {syncing ? 'Syncing...' : 'Sync Email'}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchInbox}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Stats Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Pending Parse</Typography>
                            <Typography variant="h4">{invoices.filter(i => i.status === 'NEW').length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Ready to Match</Typography>
                            <Typography variant="h4">{invoices.filter(i => i.status === 'OCR_DONE').length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Matched (Today)</Typography>
                            <Typography variant="h4" color="success.main">
                                {invoices.filter(i => i.status === 'MATCHED').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Inbox Table */}
            <Card>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Time Received</TableCell>
                                <TableCell>Source</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Detected Info</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invoices.map((inv) => (
                                <TableRow key={inv.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                            {new Date(inv.received_at).toLocaleTimeString()}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {new Date(inv.received_at).toLocaleDateString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small" label={inv.source} variant="outlined" />
                                        <Typography variant="body2" mt={0.5}>{inv.sender}</Typography>
                                        <Typography variant="caption" display="block">{inv.filename}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={inv.status}
                                            color={getStatusColor(inv.status)}
                                            size="small"
                                        />
                                        {inv.confidence_score > 0 && (
                                            <Typography variant="caption" display="block" mt={0.5}>
                                                Confidence: {inv.confidence_score}%
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {inv.vendor_name_detected ? (
                                            <Box>
                                                <Typography variant="body2">🏢 {inv.vendor_name_detected}</Typography>
                                                <Typography variant="body2">PO: <b>{inv.po_number_detected || "???"}</b></Typography>
                                                <Typography variant="body2" color="primary">
                                                    {inv.total_amount_detected ? formatCurrency(inv.total_amount_detected) : "-"}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="textSecondary">No data extracted</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" justifyContent="center" gap={1}>
                                            {/* PROCESS BUTTON */}
                                            {(inv.status === 'NEW' || inv.status === 'FAILED') && (
                                                <Tooltip title="Run AI Extraction">
                                                    <IconButton color="primary" onClick={() => handleProcess(inv.id)}>
                                                        <BrainIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {/* MATCH BUTTON */}
                                            {inv.status === 'OCR_DONE' && (
                                                <Tooltip title="Run 3-Way Match">
                                                    <IconButton color="success" onClick={() => handleMatch(inv.id)}>
                                                        <MatchIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {/* VIEW BUTTON */}
                                            <Tooltip title="View Details">
                                                <IconButton onClick={() => setSelectedInvoice(inv)}>
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {invoices.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="textSecondary" py={3}>No invoices in inbox</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Details Modal */}
            <Dialog
                open={Boolean(selectedInvoice)}
                onClose={() => setSelectedInvoice(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Invoice Details: {selectedInvoice?.filename}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="h6" gutterBottom>Extracted Data 🧠</Typography>
                            <pre style={{
                                background: '#f5f5f5',
                                padding: '10px',
                                borderRadius: '5px',
                                overflow: 'auto',
                                maxHeight: '400px'
                            }}>
                                {JSON.stringify(selectedInvoice?.extracted_data, null, 2)}
                            </pre>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="h6" gutterBottom>Raw Info</Typography>
                            <Typography><b>Status:</b> {selectedInvoice?.status}</Typography>
                            <Typography><b>Sender:</b> {selectedInvoice?.sender}</Typography>
                            <Typography><b>Received:</b> {selectedInvoice?.received_at}</Typography>
                            <Typography mt={2} color="error">{selectedInvoice?.error_message}</Typography>
                        </Grid>
                    </Grid>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default InvoiceInboxPage;
