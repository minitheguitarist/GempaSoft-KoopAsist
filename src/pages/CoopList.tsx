import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Building, ArrowRight } from 'lucide-react';
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
