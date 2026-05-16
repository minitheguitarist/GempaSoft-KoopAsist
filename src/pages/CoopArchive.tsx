import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { Building, ArrowRight, ArchiveRestore, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../pages/MemberList.css'; // Reusing list styles

interface Cooperative {
    id: number;
    name: string;
    start_date: string;
}

export default function CoopArchive() {
    const [coops, setCoops] = useState<Cooperative[]>([]);
    const navigate = useNavigate();

    const fetchArchivedCoops = async () => {
        try {
            const result = await invoke<Cooperative[]>('get_archived_coops');
            setCoops(result);
        } catch (error) {
            console.error('Arşivli kooperatif listesi alınamadı:', error);
        }
    };

    useEffect(() => {
        fetchArchivedCoops();
    }, []);

    const handleUnarchive = async (coop: Cooperative) => {
        const confirmed = await ask(`"${coop.name}" kooperatifini arşivden çıkarmak istediğinize emin misiniz?`, { title: 'Kooperatifi Arşivden Çıkar', kind: 'info' });
        if (!confirmed) return;
        try {
            await invoke('unarchive_coop', { id: coop.id });
            fetchArchivedCoops();
        } catch (error) {
            console.error('Arşivden çıkarma hatası:', error);
            alert(`Arşivden çıkarma başarısız: ${error}`);
        }
    };

    const handleDelete = async (coop: Cooperative) => {
        const confirmed = await ask(`"${coop.name}" kooperatifini SİLMEK istediğinize emin misiniz? Bu kooperatife ait tüm üyelikler ve aidatlar KESİNLİKLE silinecektir!`, { title: 'Kooperatifi Sil', kind: 'warning' });
        if (!confirmed) return;
        try {
            await invoke('delete_coop', { id: coop.id });
            fetchArchivedCoops();
        } catch (error) {
            console.error('Silme hatası:', error);
            alert(`Silme başarısız: ${error}`);
        }
    };

    return (
        <div className="member-list-container">
            <div className="page-header">
                <h2 className="page-title">Arşivlenmiş Kooperatifler</h2>
            </div>

            <div className="glass-panel table-container">
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>Kooperatif İsmi</th>
                            <th>Başlangıç Tarihi</th>
                            <th style={{ width: '150px' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coops.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="text-center p-4 text-muted">Arşivlenmiş kooperatif bulunumadı.</td>
                            </tr>
                        ) : (
                            coops.map(coop => (
                                <tr key={coop.id} className="hover:bg-white/5">
                                    <td className="font-medium">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Building size={16} className="text-muted" />
                                            <span className="text-muted line-through opacity-70">{coop.name}</span>
                                        </div>
                                    </td>
                                    <td className="text-muted opacity-70">{coop.start_date}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                onClick={() => handleUnarchive(coop)}
                                                title="Arşivden Çıkar"
                                            >
                                                <ArchiveRestore size={14} />
                                            </button>
                                            <button
                                                className="btn-danger"
                                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                onClick={() => handleDelete(coop)}
                                                title="Tamamen Sil"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <button
                                                className="icon-btn-small"
                                                style={{ opacity: 0.5 }}
                                                onClick={() => navigate(`/coops/${coop.id}`)}
                                                title="Görüntüle (Salt Okunur Değil, ama arşivde)"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
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
