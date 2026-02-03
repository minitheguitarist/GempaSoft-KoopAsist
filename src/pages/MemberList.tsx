import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Edit, Trash2, User } from 'lucide-react';
import './MemberList.css';

interface Member {
    id: number;
    tc_number: string;
    full_name: string;
    phone_1: string;
    phone_2?: string;
    registration_date: string;
}

export default function MemberList() {
    const [members, setMembers] = useState<Member[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Member>>({});

    const fetchMembers = async () => {
        try {
            const result = await invoke<Member[]>('get_members');
            setMembers(result);
        } catch (error) {
            console.error('Üye listesi alınamadı:', error);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length > 0) {
            try {
                const result = await invoke<Member[]>('search_members', { query });
                setMembers(result);
            } catch (error) {
                console.error('Arama hatası:', error);
            }
        } else {
            fetchMembers();
        }
    };

    const handleEditClick = () => {
        setEditForm(selectedMember!);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!selectedMember || !editForm) return;
        try {
            await invoke('update_member', {
                id: selectedMember.id,
                member: {
                    tc_number: editForm.tc_number || '',
                    full_name: editForm.full_name || '',
                    phone_1: editForm.phone_1 || '',
                    phone_2: editForm.phone_2 || null,
                    registration_date: editForm.registration_date || ''
                }
            });
            alert('Üye güncellendi!');
            setIsEditing(false);
            setSelectedMember(null);
            fetchMembers(); // Refresh list
        } catch (error) {
            console.error('Güncelleme hatası:', error);
            alert(`Güncelleme başarısız: ${error}`);
        }
    };

    const handleInputChange = (field: keyof Member, value: string) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    return (
        <div className="member-list-container">
            <div className="page-header flex justify-between items-center">
                <h2 className="page-title">Üye Listesi</h2>
                <div className="search-box glass-panel">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="İsim veya TC No ile ara..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="glass-panel table-container">
                <table className="members-table">
                    <thead>
                        <tr>
                            <th>İsim Soyisim</th>
                            <th>TC No</th>
                            <th>Telefon</th>
                            <th>Kayıt Tarihi</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center p-4 text-muted">Arama kriterlerine uygun üye bulunamadı.</td>
                            </tr>
                        ) : (
                            members.map(member => (
                                <tr key={member.id} onClick={() => setSelectedMember(member)} className="cursor-pointer hover:bg-white/5">
                                    <td className="font-medium">{member.full_name}</td>
                                    <td>{member.tc_number}</td>
                                    <td>{member.phone_1}</td>
                                    <td>{member.registration_date}</td>
                                    <td>
                                        <button className="icon-btn" title="Düzenle">
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedMember && (
                <div className="modal-overlay" onClick={() => { setSelectedMember(null); setIsEditing(false); }}>
                    <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                {isEditing ? 'Üye Düzenle' : (
                                    <>
                                        <User size={20} className="inline mr-2" />
                                        {selectedMember.full_name}
                                    </>
                                )}
                            </h3>
                            <button className="close-btn" onClick={() => { setSelectedMember(null); setIsEditing(false); }}>×</button>
                        </div>
                        <div className="modal-body">
                            {isEditing ? (
                                <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <input
                                        className="form-input"
                                        value={editForm.full_name || ''}
                                        onChange={e => handleInputChange('full_name', e.target.value)}
                                        placeholder="İsim Soyisim"
                                    />
                                    <input
                                        className="form-input"
                                        value={editForm.tc_number || ''}
                                        onChange={e => handleInputChange('tc_number', e.target.value)}
                                        placeholder="TC Kimlik"
                                    />
                                    <input
                                        className="form-input"
                                        value={editForm.phone_1 || ''}
                                        onChange={e => handleInputChange('phone_1', e.target.value)}
                                        placeholder="Telefon 1"
                                    />
                                    <input
                                        className="form-input"
                                        value={editForm.phone_2 || ''}
                                        onChange={e => handleInputChange('phone_2', e.target.value)}
                                        placeholder="Telefon 2"
                                    />
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editForm.registration_date || ''}
                                        onChange={e => handleInputChange('registration_date', e.target.value)}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="detail-row">
                                        <span className="label">TC Kimlik:</span>
                                        <span className="value">{selectedMember.tc_number}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Telefon 1:</span>
                                        <span className="value">{selectedMember.phone_1}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Telefon 2:</span>
                                        <span className="value">{selectedMember.phone_2 || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Kayıt Tarihi:</span>
                                        <span className="value">{selectedMember.registration_date}</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            {isEditing ? (
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button className="btn-secondary" onClick={() => setIsEditing(false)}>İptal</button>
                                    <button className="btn-primary" onClick={handleSave}>Kaydet</button>
                                </div>
                            ) : (
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <small className="text-muted">Son Düzenleme: -</small>
                                    <div className="flex gap-2">
                                        <button className="icon-btn" onClick={handleEditClick} title="Düzenle">
                                            <Edit size={18} /> Düzenle
                                        </button>
                                        <button className="btn-danger"><Trash2 size={16} /> Sil</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
