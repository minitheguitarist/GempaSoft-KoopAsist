import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { Building, ArrowRight, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../pages/MemberList.css'; // Reusing list styles

interface Cooperative {
    id: number;
    name: string;
    start_date: string;
}

export default function CoopList() {
    const [coops, setCoops] = useState<Cooperative[]>([]);
    const navigate = useNavigate();

    const fetchCoops = async () => {
        try {
            const result = await invoke<Cooperative[]>('get_coops');
            setCoops(result);
        } catch (error) {
            console.error('Kooperatif listesi alınamadı:', error);
        }
    };

    useEffect(() => {
        fetchCoops();
    }, []);

    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

    const handleArchive = async (coop: Cooperative) => {
        setActiveMenuId(null);
        const confirmed = await ask(`"${coop.name}" kooperatifini arşivlemek istediğinize emin misiniz?`, { title: 'Kooperatifi Arşivle', kind: 'warning' });
        if (!confirmed) return;
        try {
            await invoke('archive_coop', { id: coop.id });
            fetchCoops();
        } catch (error) {
            console.error('Arşivleme hatası:', error);
            alert(`Arşivleme başarısız: ${error}`);
        }
    };

    const handleDelete = async (coop: Cooperative) => {
        setActiveMenuId(null);
        const confirmed = await ask(`"${coop.name}" kooperatifini SİLMEK istediğinize emin misiniz? Bu kooperatife ait tüm üyelikler ve aidatlar KESİNLİKLE silinecektir!`, { title: 'Kooperatifi Sil', kind: 'warning' });
        if (!confirmed) return;
        try {
            await invoke('delete_coop', { id: coop.id });
            fetchCoops();
        } catch (error) {
            console.error('Silme hatası:', error);
            alert(`Silme başarısız: ${error}`);
        }
    };

    return (
        <div className="member-list-container">
            <div className="page-header">
                <h2 className="page-title">Kooperatifler</h2>
            </div>

            <div className="glass-panel table-container">
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>Kooperatif İsmi</th>
                            <th>Başlangıç Tarihi</th>
                            <th style={{ width: '100px' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coops.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center p-4 text-muted">Kayıtlı kooperatif bulunumadı.</td>
                            </tr>
                        ) : (
                            coops.map(coop => (
                                <tr key={coop.id} className="hover:bg-white/5">
                                    <td className="font-medium">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <button 
                                                    className="icon-btn" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(activeMenuId === coop.id ? null : coop.id);
                                                    }}
                                                >
                                                    <MoreVertical size={16} className="text-muted hover:text-accent transition-colors" />
                                                </button>
                                                
                                                {activeMenuId === coop.id && (
                                                    <div className="glass-panel" style={{ 
                                                        position: 'absolute', 
                                                        left: '100%', 
                                                        top: '0', 
                                                        zIndex: 50, 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        gap: '4px',
                                                        padding: '6px',
                                                        minWidth: '130px',
                                                        marginLeft: '8px',
                                                        backgroundColor: 'var(--color-navy-light)',
                                                        border: '1px solid var(--color-andesite)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                                    }}>
                                                        <button 
                                                            className="btn-secondary" 
                                                            style={{ justifyContent: 'flex-start', border: 'none', width: '100%' }}
                                                            onClick={(e) => { e.stopPropagation(); handleArchive(coop); }}
                                                        >
                                                            <Archive size={14} className="mr-2" /> Arşivle
                                                        </button>
                                                        <button 
                                                            className="btn-danger" 
                                                            style={{ justifyContent: 'flex-start', border: 'none', width: '100%' }}
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(coop); }}
                                                        >
                                                            <Trash2 size={14} className="mr-2" /> Sil
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <Building size={16} className="text-accent" />
                                            {coop.name}
                                        </div>
                                    </td>
                                    <td>{coop.start_date}</td>
                                    <td>
                                        <button
                                            className="btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                            onClick={() => navigate(`/coops/${coop.id}`)}
                                        >
                                            Seç <ArrowRight size={14} style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
