import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import '../pages/MemberRegister.css'; // Reusing styles

export default function CoopRegister() {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');

    const handleSetToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await invoke('create_coop', {
                coop: {
                    name,
                    start_date: startDate
                }
            });

            alert('Kooperatif başarıyla oluşturuldu!');
            setName('');
            setStartDate('');
        } catch (error) {
            console.error('Kayıt hatası:', error);
            alert(`Kayıt başarısız: ${error}`);
        }
    };

    return (
        <div className="member-register-container">
            <div className="page-header">
                <h2 className="page-title">Yeni Kooperatif Kaydı</h2>
            </div>

            <form className="glass-panel p-6" onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                <div className="form-grid">
                    {/* Coop Name */}
                    <div className="form-group full-width">
                        <label className="form-label" htmlFor="name">Kooperatif İsmi</label>
                        <input
                            type="text"
                            id="name"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Kooperatif adını giriniz"
                            required
                        />
                    </div>

                    {/* Start Date */}
                    <div className="form-group full-width">
                        <label className="form-label" htmlFor="startDate">Başlangıç Tarihi</label>
                        <div className="date-input-group">
                            <input
                                type="date"
                                id="startDate"
                                className="form-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn-today"
                                onClick={handleSetToday}
                            >
                                <Calendar size={18} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                Bugün
                            </button>
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-secondary">İptal</button>
                    <button type="submit" className="btn-primary">Kaydet</button>
                </div>
            </form>
        </div>
    );
}
