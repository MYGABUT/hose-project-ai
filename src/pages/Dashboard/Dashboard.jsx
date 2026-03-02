import { useState } from 'react';
import ExecutiveView from './ExecutiveView';
import OperationalView from './OperationalView';
import InventoryControlView from './InventoryControlView';
import './Dashboard.css';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('eksekutif');

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 className="page-title">Dashboard Utama</h1>
                    <p className="page-subtitle">Pusat kendali operasional dan inventori</p>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'eksekutif'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        onClick={() => setActiveTab('eksekutif')}
                    >
                        📈 Eksekutif
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'operasional'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        onClick={() => setActiveTab('operasional')}
                    >
                        📊 Operasional
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeTab === 'inventory'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        onClick={() => setActiveTab('inventory')}
                    >
                        📦 Inventory
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="dashboard-content mt-6">
                {activeTab === 'eksekutif' && <ExecutiveView />}
                {activeTab === 'operasional' && <OperationalView />}
                {activeTab === 'inventory' && <InventoryControlView />}
            </div>
        </div>
    );
}
