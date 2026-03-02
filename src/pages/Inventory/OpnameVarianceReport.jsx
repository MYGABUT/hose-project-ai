import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import StatusBadge from '../../components/common/Badge/StatusBadge';
import { getOpnameVariance } from '../../services/opnameApi';

export default function OpnameVarianceReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadReport();
    }, [id]);

    const loadReport = async () => {
        setLoading(true);
        const res = await getOpnameVariance(id);
        if (res.status === 'success') {
            setReport(res.data);
        } else {
            setError(res.message);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8 text-center">Loading Variance Report...</div>;
    if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
    if (!report) return <div className="p-8 text-center">No Data Found</div>;

    const { summary, items } = report;

    // Helper to format currency
    const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Laporan Selisih Opname</h1>
                    <p className="text-gray-600">Opname ID: #{id} • Total Items: {summary.total_items}</p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/inventory/stock-opname')}>
                    Kembali
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <div className="text-center p-4">
                        <div className="text-sm text-gray-500 mb-1">Total Variance Value</div>
                        <div className={`text-2xl font-bold ${summary.total_variance_value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(summary.total_variance_value)}
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-4">
                        <div className="text-sm text-gray-500 mb-1">Items Mismatch</div>
                        <div className="text-2xl font-bold text-orange-600">
                            {summary.mismatch_count} Items
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="text-center p-4">
                        <div className="text-sm text-gray-500 mb-1">Accuracy Score</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {((1 - (summary.mismatch_count / (summary.total_items || 1))) * 100).toFixed(1)}%
                        </div>
                    </div>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card title="Detail Selisih Barang">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-700 border-b">
                                <th className="p-3">Barcode</th>
                                <th className="p-3">Product Name</th>
                                <th className="p-3">Location</th>
                                <th className="p-3 text-right">System Qty</th>
                                <th className="p-3 text-right">Actual Qty</th>
                                <th className="p-3 text-right">Diff</th>
                                <th className="p-3 text-right">Value Diff</th>
                                <th className="p-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-mono text-sm">{item.barcode}</td>
                                    <td className="p-3">{item.name}</td>
                                    <td className="p-3 text-sm text-gray-600">{item.location}</td>
                                    <td className="p-3 text-right text-gray-600">{item.system_qty}</td>
                                    <td className="p-3 text-right font-medium">{item.actual_qty}</td>
                                    <td className={`p-3 text-right font-bold ${item.diff < 0 ? 'text-red-600' : item.diff > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {item.diff > 0 ? '+' : ''}{item.diff}
                                    </td>
                                    <td className="p-3 text-right text-sm">
                                        {formatCurrency(item.value_diff)}
                                    </td>
                                    <td className="p-3 text-center">
                                        {item.status === 'found' && <StatusBadge status="pass" size="sm" />}
                                        {item.status === 'mismatch' && <StatusBadge status="warning" text="Mismatch" size="sm" />}
                                        {item.status === 'missing' && <StatusBadge status="fail" size="sm" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
