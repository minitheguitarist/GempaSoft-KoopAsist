import { Link, useLocation } from 'react-router-dom';
import { Users, Building, PlusCircle, Search, Home } from 'lucide-react';
import './Sidebar.css';

export function Sidebar() {
    const location = useLocation();
    
    // Helper to check if active
    const isActive = (path: string) => location.pathname === path;

    return (
        <aside className="sidebar glass-panel">
            <div className="sidebar-header">
                <h1 className="sidebar-title">Emlak Takip</h1>
            </div>
            
            <nav>
                <div className="nav-section">
                    <div className="nav-label">Üye İşlemleri</div>
                    <Link to="/members/new" className={`nav-item ${isActive('/members/new') ? 'active' : ''}`}>
                        <PlusCircle className="nav-icon" />
                        <span>Üye Kaydı</span>
                    </Link>
                    <Link to="/members" className={`nav-item ${isActive('/members') ? 'active' : ''}`}>
                        <Users className="nav-icon" />
                        <span>Üye Listele</span>
                    </Link>
                </div>

                <div className="nav-section">
                    <div className="nav-label">Kooperatif</div>
                    <Link to="/coops/new" className={`nav-item ${isActive('/coops/new') ? 'active' : ''}`}>
                        <PlusCircle className="nav-icon" />
                        <span>Kooperatif Kayıt</span>
                    </Link>
                    <Link to="/coops" className={`nav-item ${isActive('/coops') ? 'active' : ''}`}>
                        <Building className="nav-icon" />
                        <span>Kooperatifler</span>
                    </Link>
                </div>
            </nav>
        </aside>
    );
}
