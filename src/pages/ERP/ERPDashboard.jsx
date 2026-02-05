/**
 * ERP Dashboard - Central hub for all ERP features
 * Quick access to Finance, Purchasing, and Reports
 */
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card/Card';
import './ERP.css';

export default function ERPDashboard() {
    const navigate = useNavigate();

    const erpModules = [
        {
            title: 'Keuangan',
            icon: '💰',
            color: '#3b82f6',
            items: [
                { name: 'Hutang (AP)', path: '/finance/hutang', icon: '💳', desc: 'Pembayaran ke supplier' },
                { name: 'Piutang (AR)', path: '/production/sales-orders', icon: '📋', desc: 'Tagihan ke customer' },
                { name: 'Aging Schedule', path: '/finance/aging', icon: '📊', desc: 'Umur piutang per bucket' },
            ]
        },
        {
            title: 'Purchasing',
            icon: '🛒',
            color: '#10b981',
            items: [
                { name: 'Purchase Request', path: '/purchasing/pr', icon: '📝', desc: 'Buat permintaan barang' },
                { name: 'Approval Inbox', path: '/purchasing/approval', icon: '📥', desc: 'Approve/Reject PR' },
            ]
        },
        {
            title: 'Laporan',
            icon: '📈',
            color: '#f59e0b',
            items: [
                { name: 'Laba/Rugi JO', path: '/production/profitability', icon: '📈', desc: 'HPP vs Revenue per JO' },
                { name: 'Kartu Stok', path: '/inventory/stock-card', icon: '📦', desc: 'Riwayat mutasi barang' },
            ]
        },
        {
            title: 'Inventory',
            icon: '📦',
            color: '#8b5cf6',
            items: [
                { name: 'Stock Opname', path: '/inventory/opname', icon: '📋', desc: 'Audit stok fisik' },
                { name: 'Masters Produk', path: '/products', icon: '🏷️', desc: 'Data produk & harga' },
            ]
        },
        {
            title: 'Projects',
            icon: '🏗️',
            color: '#ef4444',
            items: [
                { name: 'Project Dashboard', path: '/projects', icon: '📊', desc: 'Monitor progress proyek' },
                { name: 'Work Orders', path: '/projects', icon: '🛠️', desc: 'Penugasan teknisi' },
            ]
        }
    ];

    return (
        <div className="erp-dashboard">
            <div className="erp-header">
                <h1 className="erp-title">🏢 ERP Dashboard</h1>
                <p className="erp-subtitle">Akses cepat ke semua fitur ERP</p>
            </div>

            <div className="erp-modules">
                {erpModules.map((module, idx) => (
                    <Card key={idx} className="erp-module" style={{ borderTopColor: module.color }}>
                        <div className="module-header">
                            <span className="module-icon">{module.icon}</span>
                            <h2 className="module-title">{module.title}</h2>
                        </div>
                        <div className="module-items">
                            {module.items.map((item, itemIdx) => (
                                <div
                                    key={itemIdx}
                                    className="module-item"
                                    onClick={() => navigate(item.path)}
                                >
                                    <span className="item-icon">{item.icon}</span>
                                    <div className="item-info">
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-desc">{item.desc}</span>
                                    </div>
                                    <span className="item-arrow">→</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
