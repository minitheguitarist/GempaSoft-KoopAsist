import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import './MemberRegister.css';

interface MemberForm {
    tcNumber: string;
    fullName: string;
    phone1: string;
    phone2: string;
    registrationDate: string;
}

export default function MemberRegister() {
    const [formData, setFormData] = useState<MemberForm>({
        tcNumber: '',
        fullName: '',
        phone1: '',
        phone2: '',
        registrationDate: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        // TC Number Validation: Only numbers, max 11 chars
        if (name === 'tcNumber') {
            const numbersOnly = value.replace(/[^0-9]/g, '');
            if (numbersOnly.length <= 11) {
                setFormData(prev => ({ ...prev, [name]: numbersOnly }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSetToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, registrationDate: today }));
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await invoke('create_member', {
                member: {
                    tc_number: formData.tcNumber,
                    full_name: formData.fullName,
                    phone_1: formData.phone1,
                    phone_2: formData.phone2 || null, // Handle optional field
                    registration_date: formData.registrationDate
                }
            });

            alert('Üye başarıyla kaydedildi!');
            // Reset form
            setFormData({
                tcNumber: '',
                fullName: '',
                phone1: '',
                phone2: '',
                registrationDate: ''
            });
        } catch (error) {
            console.error('Kayıt hatası:', error);
            alert(`Kayıt başarısız: ${error}`);
        }
    };

    return (
        <div className="member-register-container">
            <div className="page-header">
                <h2 className="page-title">Yeni Üye Kaydı</h2>
            </div>

            <form className="glass-panel p-6" onSubmit={handleSubmit} style={{ padding: '2rem' }}>
                <div className="form-grid">
                    {/* TC Number */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="tcNumber">TC Kimlik No</label>
                        <input
                            type="text"
                            id="tcNumber"
                            name="tcNumber"
                            className="form-input"
                            value={formData.tcNumber}
                            onChange={handleChange}
                            placeholder="11 haneli TC no giriniz"
                            required
                            pattern="\d{11}"
                            title="11 haneli sayı olmalıdır"
                        />
                    </div>

                    {/* Full Name */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="fullName">İsim Soyisim</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            className="form-input"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Ad Soyad"
                            required
                        />
                    </div>

                    {/* Phone 1 */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="phone1">Telefon 1</label>
                        <input
                            type="tel"
                            id="phone1"
                            name="phone1"
                            className="form-input"
                            value={formData.phone1}
                            onChange={handleChange}
                            placeholder="0555 555 55 55"
                            required
                        />
                    </div>

                    {/* Phone 2 */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="phone2">Telefon 2</label>
                        <input
                            type="tel"
                            id="phone2"
                            name="phone2"
                            className="form-input"
                            value={formData.phone2}
                            onChange={handleChange}
                            placeholder="0555 555 55 55"
                        />
                    </div>

                    {/* Registration Date */}
                    <div className="form-group full-width">
                        <label className="form-label" htmlFor="registrationDate">Kayıt Tarihi</label>
                        <div className="date-input-group">
                            <input
                                type="date"
                                id="registrationDate"
                                name="registrationDate"
                                className="form-input"
                                value={formData.registrationDate}
                                onChange={handleChange}
                                required
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn-today"
                                onClick={handleSetToday}
                                title="Bugünün tarihini seç"
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
