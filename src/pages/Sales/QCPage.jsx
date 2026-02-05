
import React, { useState, useEffect } from 'react';
import { getPendingQC, submitQCInspection } from '../../services/qcApi';
import { FaCheck, FaTimes, FaSearch } from 'react-icons/fa';

import React, { useState, useEffect } from 'react';
import { getPendingQC, submitQCInspection } from '../../services/qcApi';
import { useNotification } from '../../contexts/NotificationContext';
import { FaCheck, FaTimes, FaSearch } from 'react-icons/fa';

const QCPage = () => {
    const { addNotification } = useNotification();
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [inspectionData, setInspectionData] = useState({ passed: 0, failed: 0, notes: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const result = await getPendingQC();
        if (result.status === 'success') {
            setPendingItems(result.data);
        }
        setLoading(false);
    };

    const handleInspect = (item) => {
        setSelectedItem(item);
        setInspectionData({
            passed: item.qty_pending,
            failed: 0,
            notes: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await submitQCInspection({
                jo_line_id: selectedItem.id,
                qty_passed: parseFloat(inspectionData.passed),
                qty_failed: parseFloat(inspectionData.failed),
                notes: inspectionData.notes
            });
            addNotification("Sukses", "Inspection submitted successfully!", "success");
            setSelectedItem(null);
            fetchData(); // Refresh
        } catch (error) {
            addNotification("Gagal", error.message, "error");
        }
    };

    const filteredItems = pendingItems.filter(item =>
        item.jo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">🔍 Outbound Quality Control</h1>

            {/* Search */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm flex items-center">
                <FaSearch className="text-gray-400 mr-3" />
                <input
                    type="text"
                    placeholder="Search JO Number or Product..."
                    className="w-full outline-none text-gray-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-sm font-semibold">
                        <tr>
                            <th className="p-4">JO Number</th>
                            <th className="p-4">Product</th>
                            <th className="p-4 text-center">Ordered</th>
                            <th className="p-4 text-center">Completed</th>
                            <th className="p-4 text-center">Pending</th>
                            <th className="p-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="6" className="p-4 text-center">Loading...</td></tr>
                        ) : filteredItems.length === 0 ? (
                            <tr><td colSpan="6" className="p-4 text-center text-gray-500">No pending items for QC</td></tr>
                        ) : filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium text-blue-600">{item.jo_number}</td>
                                <td className="p-4">{item.product_name}</td>
                                <td className="p-4 text-center font-semibold">{item.qty_ordered}</td>
                                <td className="p-4 text-center text-green-600">{item.qty_completed}</td>
                                <td className="p-4 text-center text-orange-600 font-bold">{item.qty_pending}</td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => handleInspect(item)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer"
                                    >
                                        Inspect
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Inspection Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">QC Inspection: {selectedItem.jo_number}</h2>
                        <p className="text-sm text-gray-600 mb-4">{selectedItem.product_name}</p>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-semibold text-green-700 mb-1">Passed Qty</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-green-500 outline-none"
                                        value={inspectionData.passed}
                                        onChange={(e) => setInspectionData({ ...inspectionData, passed: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-red-700 mb-1">Failed Qty</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full border rounded p-2 focus:ring-2 focus:ring-red-500 outline-none"
                                        value={inspectionData.failed}
                                        onChange={(e) => setInspectionData({ ...inspectionData, failed: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                                <textarea
                                    className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows="3"
                                    value={inspectionData.notes}
                                    onChange={(e) => setInspectionData({ ...inspectionData, notes: e.target.value })}
                                    placeholder="Quality notes..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedItem(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium cursor-pointer flex items-center gap-2"
                                >
                                    <FaCheck /> Confirm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QCPage;
