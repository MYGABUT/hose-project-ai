import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import AlertBox from '../../components/common/Alert/AlertBox';
import MaterialVerification from '../../components/features/Crimping/MaterialVerification';
import CrimpDiameterDisplay from '../../components/features/Crimping/CrimpDiameterDisplay';
import DieSetIndicator from '../../components/features/Crimping/DieSetIndicator';
import CrimpValidation from '../../components/features/Crimping/CrimpValidation';
import { getJobOrder, updateJobLineProgress } from '../../services/productionApi';
import './CrimpingExecution.css';

export default function CrimpingExecution() {
    const navigate = useNavigate();
    const { jobId } = useParams();
    const [validationResult, setValidationResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadJobOrder();
    }, [jobId]);

    const loadJobOrder = async () => {
        setLoading(true);
        try {
            // Because our backend doesn't serve the exact "Crimping Spec" or "Hose Detail" in the way this component expects
            // We will map the standard JO response to this component's structure as best as we can.
            // In a real scenario, we might need a dedicated /crimping/ endpoint.
            const res = await getJobOrder(jobId);
            if (res.status === 'success' && res.data) {
                const data = res.data;
                const firstLine = data.lines?.[0]; // Assuming working on first line for now, or would need line selection

                // Construct Job Object
                const jobData = {
                    id: data.id,
                    lineId: firstLine?.id,
                    joNumber: data.jo_number,
                    client: data.customer_name,
                    totalAssemblies: data.lines?.length || 0,
                    currentAssembly: 1, // Logic for tracking progress would be more complex
                    hose: {
                        brand: firstLine?.product?.brand || 'Generic',
                        type: firstLine?.product?.name || 'Hydraulic Hose',
                        size: firstLine?.product?.size || '-',
                        verified: true, // Auto-verified for now
                        image: null
                    },
                    fitting: {
                        type: firstLine?.fitting_a?.name || '-',
                        size: firstLine?.fitting_a?.size || '-',
                        verified: true,
                        image: null
                    },
                    crimpSpec: {
                        // These would ideally come from a Product Specification DB
                        targetDiameter: '28.4',
                        tolerance: '0.1',
                        dieCode: 'D-28',
                        skiveRequired: false,
                        specialInstructions: [
                            'JANGAN KUPAS KULIT (NON-SKIVE)',
                            'PASTA SKIRT MENTOK SAMPAI COLLAR'
                        ]
                    }
                };
                setJob(jobData);
            } else {
                setError("Gagal memuat data Job Order");
            }
        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan koneksi");
        }
        setLoading(false);
    };

    const handleValidationChange = useCallback((result) => {
        setValidationResult(result);
    }, []);

    const handleComplete = async () => {
        if (!validationResult?.isPass) return;

        if (!confirm("Selesaikan proses crimping untuk item ini?")) return;

        setIsSubmitting(true);
        setIsSubmitting(true);

        try {
            const res = await updateJobLineProgress(job.id, job.lineId, 1, "Crimping Completed");
            if (res.status === 'success') {
                alert('Assembly selesai! Label ID akan dicetak.');
                navigate('/production');
            } else {
                alert('Gagal menyimpan progress: ' + res.message);
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat menyimpan data');
        }

        setIsSubmitting(false);
    };

    const handleBack = () => {
        navigate('/production');
    };

    if (loading) return <div className="p-8 text-center">Memuat data Job Order...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!job) return <div className="p-8 text-center">Data tidak ditemukan</div>;

    return (
        <div className="crimping-execution">
            {/* Page Header */}
            <div className="page-header">
                <button className="back-button" onClick={handleBack}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    KEMBALI
                </button>
                <div className="assembly-progress">
                    <span className="progress-label">STATUS:</span>
                    <span className="progress-status">
                        PROSES CRIMPING (Assembly {job.currentAssembly} dari {job.totalAssemblies})
                    </span>
                </div>
            </div>

            {/* Section A: Material Verification */}
            <section className="section">
                <MaterialVerification
                    hose={job.hose}
                    fitting={job.fitting}
                />
            </section>

            {/* Section B: Machine Settings */}
            <section className="section">
                <Card title="B. SETTING MESIN" subtitle="PENTING!" variant="info">
                    <div className="machine-settings">
                        {/* Crimp Diameter Display */}
                        <CrimpDiameterDisplay
                            targetDiameter={job.crimpSpec.targetDiameter}
                            tolerance={job.crimpSpec.tolerance}
                        />

                        {/* Die Set Indicator */}
                        <div className="setting-row">
                            <div className="setting-label">MATA PISAU (DIE SET) YANG DIPAKAI:</div>
                            <DieSetIndicator
                                dieCode={job.crimpSpec.dieCode}
                                size="lg"
                            />
                        </div>

                        {/* Special Instructions */}
                        {job.crimpSpec.specialInstructions?.length > 0 && (
                            <AlertBox variant="warning" title="INSTRUKSI KHUSUS:">
                                <ul className="instruction-list">
                                    {job.crimpSpec.specialInstructions.map((instruction, idx) => (
                                        <li key={idx}>{instruction}</li>
                                    ))}
                                </ul>
                            </AlertBox>
                        )}
                    </div>
                </Card>
            </section>

            {/* Section C: Validation */}
            <section className="section">
                <Card title="C. VALIDASI HASIL" subtitle="QC Mandiri">
                    <CrimpValidation
                        targetDiameter={job.crimpSpec.targetDiameter}
                        tolerance={job.crimpSpec.tolerance}
                        onValidationChange={handleValidationChange}
                    />
                </Card>
            </section>

            {/* Action Button */}
            <section className="section action-section">
                <Button
                    variant="primary"
                    size="xl"
                    fullWidth
                    disabled={!validationResult?.isPass}
                    loading={isSubmitting}
                    onClick={handleComplete}
                    icon={
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9V2h12v7" />
                            <path d="M18 14H6" />
                            <path d="M6 18h12" />
                            <rect x="6" y="14" width="12" height="8" rx="1" />
                        </svg>
                    }
                >
                    SELESAI & CETAK LABEL ID
                </Button>
                {!validationResult?.isPass && validationResult !== null && (
                    <p className="action-hint">
                        Tombol akan aktif setelah hasil validasi PASS
                    </p>
                )}
            </section>
        </div>
    );
}
