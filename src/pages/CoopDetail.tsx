import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { UserPlus, ArrowLeft } from 'lucide-react';
import './CoopDetail.css';
import '../pages/MemberList.css'; // Reuse table styles

interface Cooperative {
    id: number;
    name: string;
    start_date: string;
}

interface CoopMember {
    id: number;
    member_id: number;
    full_name: string;
    tc_number: string;
    phone_1: string;
    entry_date: string;
}

interface AvailableMember {
    id: number;
    full_name: string;
    tc_number: string;
}

export default function CoopDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [coop, setCoop] = useState<Cooperative | null>(null);
    const [members, setMembers] = useState<CoopMember[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    // Add Member State
    const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMemberForAdd, setSelectedMemberForAdd] = useState<AvailableMember | null>(null);
    const [entryDate, setEntryDate] = useState('');

    useEffect(() => {
        if (id) {
            fetchCoopDetails();
            fetchCoopMembers();
        }
    }, [id]);

    const fetchCoopDetails = async () => {
        try {
            const result = await invoke<Cooperative>('get_coop_details', { id: Number(id) });
            setCoop(result);
            setEntryDate(result.start_date); // Default entry date = coop start date
        } catch (error) {
            console.error('Kooperatif detayı alınamadı:', error);
            navigate('/coops');
        }
    };

    const fetchCoopMembers = async () => {
        try {
            const result = await invoke<CoopMember[]>('get_coop_members', { coopId: Number(id) });
            setMembers(result);
        } catch (error) {
            console.error('Üyeler alınamadı:', error);
        }
    };

    const openAddModal = async () => {
        try {
            const result = await invoke<AvailableMember[]>('get_available_members', { coopId: Number(id) });
            setAvailableMembers(result);
            setSearchQuery('');
            setSelectedMemberForAdd(null);
            setShowAddModal(true);
        } catch (error) {
            console.error('Uygun üyeler alınamadı:', error);
        }
    };

    const handleMemberClick = (member: AvailableMember) => {
        setSelectedMemberForAdd(member);
        // Default entry date stays as is (coop start date or previously set)
    };

    const confirmAddMember = async () => {
        if (!selectedMemberForAdd || !entryDate) return;

        try {
            await invoke('add_members_to_coop', {
                args: {
                    coop_id: Number(id),
                    member_ids: [selectedMemberForAdd.id],
                    entry_date: entryDate
                }
            });
            alert(`${selectedMemberForAdd.full_name} kooperatife eklendi!`);

            // Remove from available list immediately to prevent duplicate add attempts without re-fetch
            setAvailableMembers(prev => prev.filter(m => m.id !== selectedMemberForAdd.id));
            setSelectedMemberForAdd(null);
            fetchCoopMembers();
        } catch (error) {
            console.error('Üye ekleme hatası:', error);
            alert(`Hata: ${error}`);
        }
    };

    const filteredAvailableMembers = availableMembers.filter(m =>
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tc_number.includes(searchQuery)
    );

    if (!coop) return <div className="p-4">Yükleniyor...</div>;

    return (
        <div className="coop-detail-container">
            <div className="coop-header">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/coops')} className="icon-btn" title="Geri">
                        <ArrowLeft />
                    </button>
                    <div className="coop-title">
                        <h2>{coop.name}</h2>
                        <span className="coop-info">Başlangıç: {coop.start_date}</span>
                    </div>
                </div>
                <button className="btn-primary flex items-center gap-2" onClick={openAddModal}>
                    <UserPlus size={18} />
                    Üye Ekle
                </button>
            </div>

            <div className="members-section">
                <div className="section-header">
                    <h3 className="section-title">Kayıtlı Üyeler ({members.length})</h3>
                </div>

                <div className="glass-panel table-container">
                    <table className="members-table">
                        <thead>
                            <tr>
                                <th>İsim Soyisim</th>
                                <th>TC No</th>
                                <th>Telefon</th>
                                <th>Giriş Tarihi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center p-4 text-muted">Bu kooperatife henüz üye eklenmemiş.</td>
                                </tr>
                            ) : (
                                members.map(m => (
                                    <tr key={m.id}
                                        className="hover:bg-white/5 cursor-pointer"
                                        onClick={() => navigate(`/coops/${id}/members/${m.id}`)}
                                        title="Aidat detaylarını gör"
                                    >
                                        <td className="font-medium">{m.full_name}</td>
                                        <td>{m.tc_number}</td>
                                        <td>{m.phone_1}</td>
                                        <td>{m.entry_date}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Kooperatife Üye Ekle</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            {/* Search Bar */}
                            <div className="form-group mb-4">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Üye ara (İsim veya TC)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Date Selection - Global but applies to next click */}
                            <div className="form-group mb-2">
                                <label className="form-label text-sm">Seçilen üye için İlk Aidat Tarihi:</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={entryDate}
                                    onChange={(e) => setEntryDate(e.target.value)}
                                />
                            </div>

                            <div className="member-select-list" style={{ marginTop: '1rem' }}>
                                {filteredAvailableMembers.length === 0 ? (
                                    <div className="p-4 text-center text-muted">Üye bulunamadı.</div>
                                ) : (
                                    filteredAvailableMembers.map(member => (
                                        <div
                                            key={member.id}
                                            className="member-select-item"
                                            onClick={() => handleMemberClick(member)}
                                            style={{ justifyContent: 'space-between' }}
                                        >
                                            <div>
                                                <div className="font-medium">{member.full_name}</div>
                                                <div className="text-sm text-muted">{member.tc_number}</div>
                                            </div>
                                            <button className="btn-small text-accent">Seç & Ekle</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {selectedMemberForAdd && (
                            <div className="modal-overlay" style={{ zIndex: 110 }} onClick={() => setSelectedMemberForAdd(null)}>
                                <div className="glass-panel p-6" style={{ width: '300px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                    <h4 className="mb-4">Eklemek istiyor musunuz?</h4>
                                    <p className="mb-2 font-bold">{selectedMemberForAdd.full_name}</p>
                                    <p className="mb-4 text-sm text-muted">Başlangıç Tarihi: {entryDate}</p>
                                    <div className="flex gap-2 justify-center">
                                        <button className="btn-secondary" onClick={() => setSelectedMemberForAdd(null)}>İptal</button>
                                        <button className="btn-primary" onClick={confirmAddMember}>Onayla</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="modal-footer" style={{ marginTop: '1rem' }}>
                            <small className="text-muted">Listeden bir üyeye tıklayarak ekleyebilirsiniz.</small>
                            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Kapat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
