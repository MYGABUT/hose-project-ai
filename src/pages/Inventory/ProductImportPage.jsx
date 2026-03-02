import React from 'react';
import { Box, Typography, Button, Paper, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ImportWizard from '../../components/features/ImportWizard/ImportWizard';
import { importApi } from '../../services/importApi';

export default function ProductImportPage() {
    const navigate = useNavigate();

    const handleDownloadExport = async () => {
        try {
            await importApi.exportProducts('xlsx');
        } catch (error) {
            console.error(error);
            alert("Failed to export products");
        }
    };

    return (
        <Box p={3}>
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
                <div>
                    <Typography variant="h4" gutterBottom>
                        Import Products
                    </Typography>
                    <Breadcrumbs aria-label="breadcrumb">
                        <Link color="inherit" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                            Dashboard
                        </Link>
                        <Link color="inherit" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
                            Products
                        </Link>
                        <Typography color="textPrimary">Import</Typography>
                    </Breadcrumbs>
                </div>

                <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleDownloadExport}
                >
                    Export Current Data
                </Button>
            </Box>

            <Paper style={{ padding: 24 }}>
                <Typography variant="body1" paragraph>
                    Use this wizard to bulk upload products into the system.
                    Duplicates (by SKU) will be updated. New SKUs will be created.
                </Typography>

                <ImportWizard
                    title="Product Master Import"
                    templateUrl="/api/v1/import/template/products"
                    // onDownloadTemplate={() => importApi.downloadTemplate('products')} 
                    // Template API not implemented for products yet, skipped

                    onPreview={(file) => importApi.previewProducts(file)}
                    onCommit={(file) => importApi.commitProducts(file)}
                />
            </Paper>
        </Box>
    );
}
