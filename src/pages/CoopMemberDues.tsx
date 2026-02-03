import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, CreditCard, RotateCw, Wallet, Edit2, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, FileText } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { numberToTurkishWords } from '../utils/numberToText';
import './CoopMemberDues.css';

interface Due {
    id: number;
    coop_member_id: number;
    period: string; // YYYY-MM-DD
    amount: number;
    paid_amount: number;
    status: string; // paid, unpaid, partial
    payment_date: string | null;
}

interface ReceiptInfo {
    coop_name: string;
    member_full_name: string;
    member_tc: string;
    member_phone: string;
}

export default function CoopMemberDues() {
    const { coopId, memberId } = useParams(); // coopId = cooperative ID, memberId = cooperative_members.id
    const navigate = useNavigate();
    const [dues, setDues] = useState<Due[]>([]);
    const [loading, setLoading] = useState(true);

    // New State for Year & Automation
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [yearlyTotalAmount, setYearlyTotalAmount] = useState<string>('');
    const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));

    // Payment Modal
    // Payment Modal
    const [showPayModal, setShowPayModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedDue, setSelectedDue] = useState<Due | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [editAmount, setEditAmount] = useState('');

    useEffect(() => {
        if (memberId) {
            fetchDues();
        }
    }, [memberId]);

    const fetchDues = async () => {
        try {
            setLoading(true);
            const result = await invoke<Due[]>('get_member_dues', { coopMemberId: Number(memberId) });
            setDues(result);
        } catch (error) {
            console.error('Aidatlar alınamadı:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateYearlyDues = async () => {
        if (!yearlyTotalAmount || isNaN(Number(yearlyTotalAmount))) {
            alert('Lütfen geçerli bir yıllık tutar giriniz.');
            return;
        }

        try {
            await invoke('generate_yearly_dues', {
                coopMemberId: Number(memberId),
                year: selectedYear,
                totalAmount: Number(yearlyTotalAmount)
            });
            fetchDues();

            // Auto expand the selected year if not expanded
            if (!expandedYears.has(selectedYear)) {
                toggleYear(selectedYear);
            }

            alert(`${selectedYear} yılı için aidatlar oluşturuldu/güncellendi.`);
        } catch (error) {
            console.error('Aidat oluşturma hatası:', error);
            alert(`Hata: ${error}`);
        }
    };

    /* Old method preserved if needed, but UI replaced
    const handleAddNextDue = async () => { ... }
    */

    const handleAddExtraDue = async (year: number, monthIndex: number) => {
        const amount = prompt(`${year} - ${monthIndex}. ay için ek aidat tutarını giriniz:`);
        if (!amount || isNaN(Number(amount))) return;

        try {
            await invoke('add_extra_due', {
                coopMemberId: Number(memberId),
                year: year,
                month: monthIndex,
                amount: Number(amount)
            });
            fetchDues();
        } catch (error) {
            console.error('Ekleme hatası:', error);
            alert(`Hata: ${error}`);
        }
    }

    const openPayModal = (due: Due) => {
        setSelectedDue(due);
        // Default to remaining amount
        setPayAmount((due.amount - due.paid_amount).toString());
        setShowPayModal(true);
    };

    const openDetailModal = (due: Due) => {
        setSelectedDue(due);
        setEditAmount(due.amount.toString());
        setShowDetailModal(true);
    }

    const handleSaveDueAmount = async () => {
        if (!selectedDue || !editAmount) return;
        try {
            await invoke('update_due_amount', { id: selectedDue.id, amount: Number(editAmount) });
            setShowDetailModal(false);
            fetchDues();
        } catch (error) {
            console.error('Güncelleme hatası:', error);
            alert(`Hata: ${error}`);
        }
    };

    const handleDeleteDue = async () => {
        if (!selectedDue) return;
        if (!confirm('Bu aidatı silmek istediğinize emin misiniz?')) return;

        try {
            await invoke('delete_due', { id: selectedDue.id });
            setShowDetailModal(false);
            fetchDues();
        } catch (error) {
            console.error('Silme hatası:', error);
            alert(`Hata: ${error}`);
        }
    };

    const handlePayment = async () => {
        if (!selectedDue || !payAmount) return;

        try {
            await invoke('pay_due', {
                args: {
                    due_id: selectedDue.id,
                    amount: Number(payAmount),
                    payment_date: new Date().toISOString().split('T')[0]
                }
            });
            setShowPayModal(false);
            fetchDues();
        } catch (error) {
            console.error('Ödeme hatası:', error);
            alert(`Hata: ${error}`);
        }
    };

    const handleExportReceipt = async (due: Due) => {
        try {
            // 1. Get Receipt Info
            const info = await invoke<ReceiptInfo>('get_payment_receipt_info', { coopMemberId: due.coop_member_id });

            // Format Dates and Money
            const paymentDate = due.payment_date ? new Date(due.payment_date).toLocaleDateString('tr-TR') : '...';
            const amountText = numberToTurkishWords(due.paid_amount); // Convert to text
            const amountStr = due.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';
            // Partial Payment Info
            const isPartial = due.status === 'partial';
            const totalAmountStr = due.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';
            const remainingAmountStr = (due.amount - due.paid_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';
            const paymentType = isPartial ? "Kısmi Ödeme" : "Tam Ödeme";

            // Create Document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: isPartial ? "TAHSİLAT MAKBUZU (KISMİ ÖDEME)" : "TAHSİLAT MAKBUZU",
                            heading: "Heading1",
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),

                        // Kooperatif / Emlakçı Bilgileri
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Kooperatif Adı: ", bold: true }),
                                new TextRun(info.coop_name),
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Emlak Ofisi: ", bold: true }),
                                new TextRun("Gempa Emlak"),
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Adres: ", bold: true }),
                                new TextRun("Osmançavuş Mahallesi Eymir Yolu Caddesi Sorgun/YOZGAT"),
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Telefon: ", bold: true }),
                                new TextRun("552 809 6997"),
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Yetkili: ", bold: true }),
                                new TextRun("Tevfik ARSLAN"),
                            ],
                            spacing: { after: 400 }
                        }),

                        // Müşteri Bilgileri
                        new Paragraph({
                            text: "MÜŞTERİ (ÜYE) BİLGİLERİ",
                            heading: "Heading2",
                            border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                            spacing: { after: 200 }
                        }),
                        new Paragraph({ text: `Adı Soyadı: ${info.member_full_name}`, spacing: { after: 100 } }),
                        new Paragraph({ text: `T.C. Kimlik No: ${info.member_tc}`, spacing: { after: 100 } }),
                        new Paragraph({ text: `Telefon: ${info.member_phone}`, spacing: { after: 400 } }),

                        // Ödeme Detayları
                        new Paragraph({
                            text: "ÖDEME DETAYLARI",
                            heading: "Heading2",
                            border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } },
                            spacing: { after: 200 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Ödenen Tutar: ", bold: true }),
                                new TextRun(amountStr),
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Yazıyla: ", bold: true }),
                                new TextRun(amountText),
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Ödeme Türü: ", bold: true }),
                                new TextRun(paymentType),
                            ],
                            spacing: { after: 100 }
                        }),

                        // Add Total/Remaining if partial
                        ...(isPartial ? [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Toplam Borç: ", bold: true }),
                                    new TextRun(totalAmountStr),
                                ],
                                spacing: { after: 100 }
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: "Kalan Borç: ", bold: true }),
                                    new TextRun(remainingAmountStr),
                                ],
                                spacing: { after: 100 }
                            })
                        ] : []),

                        new Paragraph({
                            children: [
                                new TextRun({ text: "Ödeme Tarihi: ", bold: true }),
                                new TextRun(paymentDate),
                            ],
                            spacing: { after: 100 }
                        }),
                        new Paragraph({ text: "Ödeme Şekli: .......................................", spacing: { after: 800 } }),

                        // İmza Alanı
                        new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({ text: "Tarih / İmza", alignment: AlignmentType.CENTER })],
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph({ text: "Kaşe / Yetkili İmza", alignment: AlignmentType.CENTER })],
                                            width: { size: 50, type: WidthType.PERCENTAGE },
                                            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }],
            });

            // Save File
            const blob = await Packer.toBlob(doc);
            const fileName = `Tahsilat_Makbuzu_${info.member_full_name.replace(/\s+/g, '_')}_${paymentDate}.docx`;

            const filePath = await save({
                defaultPath: fileName,
                filters: [{
                    name: 'Word Belgesi',
                    extensions: ['docx']
                }]
            });

            if (filePath) {
                const arrayBuffer = await blob.arrayBuffer();
                await writeFile(filePath, new Uint8Array(arrayBuffer));
                alert('Belge başarıyla kaydedildi!');
            }

        } catch (error) {
            console.error('Belge oluşturma hatası:', error);
            alert(`Hata: ${error}`);
        }
    };

    const changeYear = (delta: number) => {
        const newYear = selectedYear + delta;
        setSelectedYear(newYear);
        if (!expandedYears.has(newYear)) {
            // Optional: Auto expand when switching to a year? Maybe purely user choice.
            // Let's keep manual expand for now to keep UI clean, or maybe auto expand logic here.
            // setExpandedYears(new Set(expandedYears).add(newYear));
        }
    };

    const toggleYear = (year: number) => {
        const newExpanded = new Set(expandedYears);
        if (newExpanded.has(year)) {
            newExpanded.delete(year);
        } else {
            newExpanded.add(year);
        }
        setExpandedYears(newExpanded);
    };

    // Group dues by year
    const groupedDues = dues.reduce((acc, due) => {
        const year = new Date(due.period).getFullYear();
        if (!acc[year]) acc[year] = [];
        acc[year].push(due);
        return acc;
    }, {} as Record<number, Due[]>);

    // Get all unique years from dues + selected year (so it shows up even if empty initially? maybe not needed if we rely on automation)
    // Actually, we want to show years that exist in DB. The top section is for "Generation".
    // Let's just iterate over Object.keys(groupedDues)
    const sortedYears = Object.keys(groupedDues).map(Number).sort((a, b) => a - b);

    // Calculations
    const totalReceivable = dues.reduce((acc, due) => acc + due.amount, 0);
    const totalDebt = dues.reduce((acc, due) => acc + (due.amount - due.paid_amount), 0);
    const totalPaid = dues.reduce((acc, due) => acc + due.paid_amount, 0);

    return (
        <div className="dues-container p-4">
            {/* Header */}
            <div className="dues-header">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/coops/${coopId}`)} className="icon-btn" title="Geri">
                        <ArrowLeft />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold">Üye Aidat Detayı</h2>
                        <p className="text-sm text-muted">Ödemeleri ve borçları buradan yönetebilirsiniz.</p>
                    </div>
                </div>

                {/* Year Automation Controls */}
                <div className="year-automation-controls flex bg-glass-panel border border-glass-border rounded-lg p-1 items-center">
                    <div className="flex items-center border-r border-glass-border pr-2 mr-2">
                        <button className="icon-btn-small" onClick={() => changeYear(-1)}>
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-accent font-bold px-3 min-w-[60px] text-center select-none">{selectedYear}</span>
                        <button className="icon-btn-small" onClick={() => changeYear(1)}>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-xs text-muted">Yıllık Tutar:</span>
                        <input
                            type="number"
                            placeholder="0"
                            value={yearlyTotalAmount}
                            onChange={(e) => setYearlyTotalAmount(e.target.value)}
                            className="bg-transparent border-b border-glass-border w-24 text-center outline-none text-accent text-sm py-1"
                        />
                    </div>

                    <button className="btn-secondary-xs flex items-center gap-1" onClick={handleGenerateYearlyDues}>
                        <RotateCw size={14} />
                        Hesapla / Dağıt
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="summary-stats">
                <div className="stat-card">
                    <div className="stat-value text-white">{totalReceivable.toLocaleString('tr-TR')} ₺</div>
                    <div className="stat-label">Toplam Tutar</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value text-danger">{totalDebt.toLocaleString('tr-TR')} ₺</div>
                    <div className="stat-label">Toplam Borç</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value text-success">{totalPaid.toLocaleString('tr-TR')} ₺</div>
                    <div className="stat-label">Toplam Ödenen</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{dues.length}</div>
                    <div className="stat-label">Toplam Aidat Sayısı</div>
                </div>
            </div>

            {/* Dues List - Accordion */}
            <div className="flex-1 overflow-y-auto pr-2">
                {loading ? (
                    <div className="text-center p-8">Yükleniyor...</div>
                ) : dues.length === 0 ? (
                    <div className="text-center p-8 text-muted glass-panel">
                        <p>Henüz hesaplanmış aidat yok.</p>
                        <p className="text-sm mt-2">Yukarıdan yıl seçip tutar girerek aidatları oluşturabilirsiniz.</p>
                    </div>
                ) : (
                    sortedYears.map(year => {
                        const yearDues = groupedDues[year];
                        const isExpanded = expandedYears.has(year);
                        const yearTotal = yearDues.reduce((sum, d) => sum + d.amount, 0);
                        const yearPaid = yearDues.reduce((sum, d) => sum + d.paid_amount, 0);

                        return (
                            <div key={year} className="year-group mb-4">
                                <button
                                    className={`year-header w-full flex justify-between items-center p-4 glass-panel border border-glass-border rounded-lg ${isExpanded ? 'rounded-b-none border-b-0' : ''}`}
                                    onClick={() => toggleYear(year)}
                                >
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
                                        <span className="text-lg font-bold text-accent">{year}</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-muted">{yearDues.length} Taksit</span>
                                    </div>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-muted">Toplam: <span className="text-foreground">{yearTotal.toLocaleString('tr-TR')} ₺</span></span>
                                        <span className="text-muted">Ödenen: <span className="text-success">{yearPaid.toLocaleString('tr-TR')} ₺</span></span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="year-content glass-panel border border-t-0 border-glass-border rounded-b-lg p-2 bg-black/20">
                                        {yearDues.map(due => {
                                            const percent = Math.min((due.paid_amount / due.amount) * 100, 100);
                                            const periodDate = new Date(due.period);
                                            // Intl formatter for month name
                                            const monthName = periodDate.toLocaleDateString('tr-TR', { month: 'long' });
                                            const monthIndex = periodDate.getMonth() + 1;

                                            return (
                                                <div key={due.id} className="due-card mb-2 mx-2">
                                                    <div className="due-info">
                                                        <div className="due-main-row">
                                                            {/* Clickable Month Name with Edit Icon */}
                                                            <div
                                                                className="flex items-center gap-2 cursor-pointer group/title"
                                                                onClick={() => openDetailModal(due)}
                                                            >
                                                                <div className="p-1 rounded-full bg-white/5 opacity-0 group-hover/title:opacity-100 transition-opacity text-accent">
                                                                    <Edit2 size={12} />
                                                                </div>
                                                                <span className="font-semibold text-foreground text-base w-32 group-hover/title:text-accent transition-colors underline decoration-dotted underline-offset-4 decoration-white/20">
                                                                    {monthName}
                                                                </span>
                                                            </div>

                                                            <span className={`due-status-badge status-${due.status} text-[10px] py-0.5 px-2 rounded-sm`}>
                                                                {due.status === 'paid' ? 'ÖDENDİ' : due.status === 'partial' ? 'KISMI' : 'ÖDENMEDİ'}
                                                            </span>
                                                        </div>

                                                        <div className="due-card-details">
                                                            <div className="flex items-center gap-1">
                                                                <span>Tutar:</span>
                                                                <span className="text-foreground font-medium">{due.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</span>
                                                            </div>

                                                            {due.status !== 'unpaid' && (
                                                                <div className="flex items-center gap-4">
                                                                    <span>
                                                                        Ödenen:
                                                                        <span className={`font-bold ml-1 ${due.status === 'partial' ? 'text-warning' : 'text-success'}`}>
                                                                            {due.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                                                                        </span>
                                                                    </span>

                                                                    <div className="payment-progress-bar">
                                                                        <div
                                                                            className={`payment-progress-fill ${due.status === 'partial' ? 'partial' : ''}`}
                                                                            style={{ width: `${percent}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* PAYMENT DATE DISPLAY */}
                                                            {due.status === 'paid' && due.payment_date && (
                                                                <div className="text-xs text-muted flex items-center gap-1 ml-4 border-l border-glass-border pl-2">
                                                                    <span>Tarih:</span>
                                                                    <span className="text-foreground">{new Date(due.payment_date).toLocaleDateString('tr-TR')}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="action-area pl-3 ml-3 border-l border-glass-border flex items-center gap-1">
                                                        <button className="icon-btn-xs text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity" title="Ek Ödeme Ekle" onClick={() => handleAddExtraDue(year, monthIndex)}>
                                                            <Plus size={16} />
                                                        </button>

                                                        {due.status !== 'paid' && (
                                                            <button className="icon-btn text-accent p-1.5 hover:bg-accent/10 rounded-lg transition-colors" title="Ödeme Yap" onClick={() => openPayModal(due)}>
                                                                <CreditCard size={18} />
                                                            </button>
                                                        )}
                                                        {/* EXPORT RECEIPT BUTTON */}
                                                        {(due.status === 'paid' || due.status === 'partial') && (
                                                            <>
                                                                <button className="icon-btn text-blue-400 p-1.5 hover:bg-blue-400/10 rounded-lg transition-colors ml-1" title="Belgeye Aktar (Tahsilat Makbuzu)" onClick={() => handleExportReceipt(due)}>
                                                                    <FileText size={18} />
                                                                </button>
                                                                <Wallet size={18} className="text-success opacity-50 mx-2" />
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pay Modal */}
            {showPayModal && selectedDue && (
                <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
                    <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Ödeme Yap</h3>
                            <button className="close-btn" onClick={() => setShowPayModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="mb-4">
                                <strong>Dönem:</strong> {new Date(selectedDue.period).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}<br />
                                <strong>Kalan Borç:</strong> {selectedDue.amount - selectedDue.paid_amount} ₺
                            </p>
                            <div className="form-group">
                                <label className="form-label">Ödenecek Tutar</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowPayModal(false)}>İptal</button>
                            <button className="btn-primary" onClick={handlePayment}>Ödemeyi Al</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Edit Modal */}
            {showDetailModal && selectedDue && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header border-b border-glass-border pb-2 mb-4">
                            <h3 className="text-lg font-bold text-accent">Aidat Düzenle</h3>
                            <button className="close-btn hover:text-white" onClick={() => setShowDetailModal(false)}>×</button>
                        </div>
                        <div className="modal-body space-y-4">
                            <div>
                                <label className="text-sm text-muted block mb-1">Dönem</label>
                                <div className="text-lg font-semibold">{new Date(selectedDue.period).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</div>
                            </div>

                            <div className="form-group">
                                <label className="text-sm text-muted block mb-1">Tutar (TL)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/20 border border-glass-border rounded p-2 text-white outline-none focus:border-accent font-mono text-lg"
                                    value={editAmount}
                                    onChange={e => setEditAmount(e.target.value)}
                                />
                            </div>

                            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mt-4">
                                <h4 className="text-danger text-sm font-bold mb-2 flex items-center gap-2"><Trash2 size={14} /> Tehlikeli Bölge</h4>
                                <p className="text-xs text-muted mb-2">Bu aidatı kalıcı olarak silmek istiyorsanız aşağıdaki butonu kullanın.</p>
                                <button className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-danger rounded border border-red-500/30 transition-colors text-sm font-semibold" onClick={handleDeleteDue}>
                                    Aidatı Sil
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer pt-4 border-t border-glass-border mt-4">
                            <button className="btn-secondary-xs px-4" onClick={() => setShowDetailModal(false)}>İptal</button>
                            <button className="btn-secondary-xs bg-accent/20 text-accent border-accent/20 px-4" onClick={handleSaveDueAmount}>Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
