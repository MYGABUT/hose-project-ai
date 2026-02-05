import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import { getJobOrders } from '../../services/productionApi';
import './Production.css';

export default function Production() {
    const [jobOrders, setJobOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadJobs();
    }, []);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const res = await getJobOrders({ limit: 50 });
            if (res.status === 'success') {
                setJobOrders(res.data);
            }
        } catch (err) {
            console.error('Error loading jobs:', err);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center">Memuat Data Produksi...</div>;

    return (
        <div className="production-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Produksi</h1>
                    <p className="page-subtitle">Job Order aktif dan proses perakitan</p>
                </div>
                <Link to="/production/new">
                    <Button variant="primary" icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    }>
                        Job Order Baru
                    </Button>
                </Link>
            </div>

            <div className="job-cards">
                {jobOrders.length === 0 ? (
                    <div className="empty-state">
                        <p>Belum ada Job Order aktif</p>
                    </div>
                ) : (
                    jobOrders.map((job) => {
                        // Calculate progress based on steps or items
                        const total = job.total_steps || 1;
                        const current = job.current_step || 0;
                        const progress = Math.round((current / total) * 100);

                        return (
                            <Card key={job.id} className="job-card">
                                <div className="job-card-header">
                                    <div className="job-card-title">
                                        <span className="job-order-id">{job.jo_number}</span>
                                        <StatusBadge status={job.status} />
                                    </div>
                                    <span className={`priority-badge priority-${job.priority}`}>
                                        {job.priority === 1 ? 'HIGH' : job.priority === 2 ? 'MEDIUM' : 'LOW'}
                                    </span>
                                </div>

                                <div className="job-card-body">
                                    <h3 className="client-name">{job.customer_name || 'Internal / Stock'}</h3>
                                    <p className="job-description">{job.notes || 'No description'}</p>

                                    <div className="progress-section">
                                        <div className="progress-header">
                                            <span className="progress-label">Progress</span>
                                            <span className="progress-value">{current}/{total} Steps</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="job-meta">
                                        <span className="due-date">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            Due: {job.due_date ? new Date(job.due_date).toLocaleDateString() : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="job-card-footer">
                                    <Link to={`/production/crimping/${job.id}`}>
                                        <Button variant="primary" fullWidth>
                                            Mulai / Lanjutkan Crimping
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
