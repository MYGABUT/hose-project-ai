
import React, { useState, useEffect } from 'react';
import { getReadyToShipItems, createDeliveryOrder, getDeliveryOrders, downloadSuratJalan } from '../../services/deliveryApi';
import { FaTruck, FaFileWord, FaPlus, FaBoxOpen } from 'react-icons/fa';

import React, { useState, useEffect } from 'react';
import { getReadyToShipItems, createDeliveryOrder, getDeliveryOrders, downloadSuratJalan } from '../../services/deliveryApi';
import { useNotification } from '../../contexts/NotificationContext';
import { FaTruck, FaFileWord, FaPlus, FaBoxOpen } from 'react-icons/fa';

const DeliveryPage = () => {
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('create'); // create | history
    const [readyItems, setReadyItems] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]); // IDs
    const [loading, setLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        driver_name: '',
        vehicle_no: '',
        delivery_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        if (activeTab === 'create') fetchReadyItems();
        else fetchHistory();
    }, [activeTab]);

    const fetchReadyItems = async () => {
        setLoading(true);
        const res = await getReadyToShipItems();
        if (res.status === 'success') setReadyItems(res.data);
        setLoading(false);
    };

    const fetchHistory = async () => {
        setLoading(true);
        const res = await getDeliveryOrders();
        if (res.status === 'success') setHistory(res.data);
        setLoading(false);
    };

    const handleCreateDO = async (e) => {
        e.preventDefault();
        if (selectedItems.length === 0) {
            addNotification("Info", "Select at least one item", "info");
            return;
        }

        // Group by SO (Basic logic: allow creating DO for multiple items from SAME SO ONLY for now to keep it simple)
        // Check if multiple SOs selected
        const selectedObjects = readyItems.filter(item => selectedItems.includes(item.so_line_id));
        const uniqueSOs = [...new Set(selectedObjects.map(i => i.so_id))];

        if (uniqueSOs.length > 1) {
            addNotification("Validasi", "Please create DO for one Sales Order at a time.", "warning");
            return;
        }

        const payload = {
            so_id: uniqueSOs[0],
            lines: selectedObjects.map(item => ({
                so_line_id: item.so_line_id,
                qty: item.qty_ready // Defaulting to max ready qty
            })),
            ...formData
        };

        try {
            await createDeliveryOrder(payload);
            addNotification("Sukses", "Delivery Order Created!", "success");
            setActiveTab('history');
            setSelectedItems([]);
            setFormData({ ...formData, driver_name: '', vehicle_no: '' });
        } catch (error) {
            addNotification("Gagal", error.message, "error");
        }
    };

    const toggleSelect = (id) => {
        if (selectedItems.includes(id)) setSelectedItems(selectedItems.filter(i => i !== id));
        else setSelectedItems([...selectedItems, id]);
    };

    const handleDownload = async (doId) => {
        const courier = prompt("Masukkan Nama Jasa Pengiriman (Optional):", "Kurir Internal");
        if (courier === null) return; // Cancelled
        try {
            await downloadSuratJalan(doId, courier);
        } catch (err) {
            addNotification("Gagal", "Download failed", "error");
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FaTruck /> Delivery Management
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('create')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'create'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Ready for Delivery ({readyItems.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'history'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'}`}
                >
                    DO History
                </button>
            </div>

            {activeTab === 'create' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Item List */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
                        <h2 className="font-semibold mb-4 text-gray-700">Select Items to Ship</h2>
                        {loading ? <p>Loading...</p> : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                                    <tr>
                                        <th className="p-3">Select</th>
                                        <th className="p-3">SO#</th>
                                        <th className="p-3">Customer</th>
                                        <th className="p-3">Item</th>
                                        <th className="p-3 text-right">Qty Ready</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {readyItems.map(item => (
                                        <tr key={item.so_line_id} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 cursor-pointer"
                                                    checked={selectedItems.includes(item.so_line_id)}
                                                    onChange={() => toggleSelect(item.so_line_id)}
                                                />
                                            </td>
                                            <td className="p-3">{item.so_number}</td>
                                            <td className="p-3">{item.customer_name}</td>
                                            <td className="p-3 text-sm">{item.description}</td>
                                            <td className="p-3 text-right font-bold text-green-600">{item.qty_ready}</td>
                                        </tr>
                                    ))}
                                    {readyItems.length === 0 && (
                                        <tr><td colSpan="5" className="p-4 text-center text-gray-500">No items ready to ship.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* DO Form */}
                    <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-6">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <FaPlus className="text-blue-500" /> Create New DO
                        </h2>
                        <form onSubmit={handleCreateDO}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Jasa Pengiriman / Nama Driver</label>
                                    <input
                                        type="text" required
                                        className="w-full border rounded p-2 mt-1"
                                        placeholder="Contoh: JNE Trucking / Udin"
                                        value={formData.driver_name}
                                        onChange={e => setFormData({ ...formData, driver_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">No Polisi / No Resi / Keterangan</label>
                                    <input
                                        type="text" required
                                        className="w-full border rounded p-2 mt-1"
                                        placeholder="Contoh: B 1234 CD / JD0093848"
                                        value={formData.vehicle_no}
                                        onChange={e => setFormData({ ...formData, vehicle_no: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Delivery Date</label>
                                    <input
                                        type="date" required
                                        className="w-full border rounded p-2 mt-1"
                                        value={formData.delivery_date}
                                        onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                                    />
                                </div>
                                <div className="p-3 bg-blue-50 rounded text-sm text-blue-700">
                                    Selected Items: <strong>{selectedItems.length}</strong>
                                </div>
                                <button
                                    type="submit"
                                    disabled={selectedItems.length === 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-2 rounded shadow-md cursor-pointer"
                                >
                                    Create Delivery Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
                            <tr>
                                <th className="p-4">DO Number</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Recipient</th>
                                <th className="p-4">Driver</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {history.map(doItem => (
                                <tr key={doItem.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium">{doItem.do_number}</td>
                                    <td className="p-4 text-gray-600">{doItem.delivery_date}</td>
                                    <td className="p-4 font-medium text-gray-800">{doItem.recipient_name}</td>
                                    <td className="p-4">
                                        <div className="text-sm font-semibold">{doItem.driver_name}</div>
                                        <div className="text-xs text-gray-500">{doItem.vehicle_number}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${doItem.status === 'DRAFT' ? 'bg-gray-200 text-gray-700' :
                                                doItem.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'}`}>
                                            {doItem.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleDownload(doItem.id)}
                                            className="text-blue-600 hover:text-blue-800 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                                            title="Download Surat Jalan"
                                        >
                                            <FaFileWord className="text-xl" />
                                            <span className="text-sm underline">Surat Jalan</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DeliveryPage;
