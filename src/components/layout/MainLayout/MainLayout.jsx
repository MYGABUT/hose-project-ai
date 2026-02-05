import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import './MainLayout.css';

export default function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Demo data - in real app, this comes from context
    // Demo data - in real app, this comes from context
    const jobContext = null;

    const user = {
        name: 'Operator 1',
        role: 'Teknisi'
    };

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className="main-layout">
            <Sidebar
                isCollapsed={sidebarCollapsed}
                onClose={() => setSidebarCollapsed(true)}
            />

            <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
                <Header
                    jobContext={jobContext}
                    user={user}
                    onMenuToggle={toggleSidebar}
                />

                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
