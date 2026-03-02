import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import api from '../../services/api';

const GeneralLedger = () => {
    const { authState } = useAuth();
    const { addNotification } = useNotification();

    // State
    const [journals, setJournals] = useState([]);
    const [balanceSheet, setBalanceSheet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'journals'

    // Pagination & Filters (Simplified)
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const rowsPerPage = 20;

    useEffect(() => {
        fetchData();
    }, [page, search]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Balance Sheet
            const bsRes = await api.get('/api/v1/journals/balance-sheet');
            setBalanceSheet(bsRes.data.data);

            // Fetch Journals
            const journalRes = await api.get(`/api/v1/journals?skip=${page * rowsPerPage}&limit=${rowsPerPage}&search=${search}`);
            setJournals(journalRes.data.data);

        } catch (error) {
            console.error('Error fetching Core Financials:', error);
            addNotification('error', 'Gagal memuat data finansial. ' + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    if (loading && !balanceSheet) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-gray-400">
                <div className="flex items-center gap-3">
                    <svg className="h-6 w-6 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memproses Buku Besar...</span>
                </div>
            </div>
        );
    }

    // Render Balances Summary Component
    const renderBalanceSheet = () => {
        if (!balanceSheet) return null;

        const { summary, assets, liabilities, equity, revenue, expenses } = balanceSheet;

        return (
            <div className="space-y-6 animate-fade-in pb-8">
                {/* Top Metrik */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Total Kas & Aset</p>
                            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.total_assets)}</h3>
                            <p className="text-xs text-slate-400 mt-1">Normal Balance: Debit</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Total Hutang</p>
                            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(summary.total_liabilities_and_equity - summary.net_income - equity.total)}</h3>
                            <p className="text-xs text-slate-400 mt-1">Normal Balance: Credit</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Laba Bersih (Net Income)</p>
                            <h3 className={`text-2xl font-bold ${summary.net_income >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(summary.net_income)}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Pendapatan - Beban Operasional</p>
                        </div>
                    </div>
                </div>

                {/* Status Keseimbangan */}
                <div className={`p-4 rounded-xl flex items-center gap-3 border ${summary.is_balanced ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        {summary.is_balanced
                            ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            : <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        }
                    </svg>
                    <div>
                        <strong className="block text-sm">Status Persamaan Akuntansi</strong>
                        <span className="text-xs">Assets ({formatCurrency(summary.total_assets)}) = Liabilities & Equity ({formatCurrency(summary.total_liabilities_and_equity)})</span>
                    </div>
                </div>

                {/* Breakdown COA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Kiri: Positif Balance */}
                    <div className="space-y-6">
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Aset (Harta)</h3>
                                <span className="font-bold text-slate-800">{formatCurrency(assets.total)}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {assets.items.map(acc => (
                                    <div key={acc.code} className="flex justify-between p-4 hover:bg-slate-50">
                                        <div className="flex gap-3">
                                            <span className="text-slate-400 font-mono text-sm">{acc.code}</span>
                                            <span className="text-slate-700 text-sm">{acc.name}</span>
                                        </div>
                                        <span className="text-slate-900 font-medium text-sm">{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {assets.items.length === 0 && <div className="p-4 text-center text-sm text-slate-500">Belum ada transaksi aset</div>}
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Beban Operasional</h3>
                                <div className="text-right">
                                    <span className="font-bold text-slate-800 block leading-tight">{formatCurrency(expenses.total)}</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-semibold">(Mengurangi Laba)</span>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {expenses.items.map(acc => (
                                    <div key={acc.code} className="flex justify-between p-4 hover:bg-slate-50">
                                        <div className="flex gap-3">
                                            <span className="text-slate-400 font-mono text-sm">{acc.code}</span>
                                            <span className="text-slate-700 text-sm">{acc.name}</span>
                                        </div>
                                        <span className="text-slate-900 text-sm">{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {expenses.items.length === 0 && <div className="p-4 text-center text-sm text-slate-500">Belum ada beban tercatat</div>}
                            </div>
                        </section>
                    </div>

                    {/* Kanan: Kredit Balance */}
                    <div className="space-y-6">
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Kewajiban & Modal</h3>
                                <span className="font-bold text-slate-800">{formatCurrency(liabilities.total + equity.total)}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {liabilities.items.map(acc => (
                                    <div key={acc.code} className="flex justify-between p-4 hover:bg-slate-50">
                                        <div className="flex gap-3">
                                            <span className="text-slate-400 font-mono text-sm">{acc.code}</span>
                                            <span className="text-slate-700 text-sm">{acc.name}</span>
                                        </div>
                                        <span className="text-slate-900 font-medium text-sm">{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {equity.items.map(acc => (
                                    <div key={acc.code} className="flex justify-between p-4 hover:bg-slate-50">
                                        <div className="flex gap-3">
                                            <span className="text-slate-400 font-mono text-sm">{acc.code}</span>
                                            <span className="text-slate-700 text-sm">{acc.name}</span>
                                        </div>
                                        <span className="text-slate-900 font-medium text-sm">{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {/* Laba Ditahan Dinamis */}
                                <div className="flex justify-between p-4 bg-emerald-50/50">
                                    <div className="flex gap-3">
                                        <span className="text-emerald-500 font-mono text-sm">3199</span>
                                        <span className="text-emerald-700 font-semibold text-sm italic">Laba Tahun Berjalan</span>
                                    </div>
                                    <span className="text-emerald-700 font-bold text-sm">{formatCurrency(equity.net_income)}</span>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800">Pendapatan (Revenue)</h3>
                                <span className="font-bold text-emerald-600">{formatCurrency(revenue.total)}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {revenue.items.map(acc => (
                                    <div key={acc.code} className="flex justify-between p-4 hover:bg-slate-50">
                                        <div className="flex gap-3">
                                            <span className="text-slate-400 font-mono text-sm">{acc.code}</span>
                                            <span className="text-slate-700 text-sm">{acc.name}</span>
                                        </div>
                                        <span className="text-slate-900 font-medium text-sm">{formatCurrency(acc.balance)}</span>
                                    </div>
                                ))}
                                {revenue.items.length === 0 && <div className="p-4 text-center text-sm text-slate-500">Belum ada pendapatan</div>}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        );
    };

    // Render Journal Table Component
    const renderJournalTable = () => {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-220px)] animate-fade-in text-sm">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="relative w-72">
                        <input
                            type="text"
                            placeholder="Cari Entri / Referensi..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                            <tr>
                                <th className="p-3 font-semibold text-slate-600 w-10"></th>
                                <th className="p-3 font-semibold text-slate-600">Tanggal</th>
                                <th className="p-3 font-semibold text-slate-600">No. Jurnal</th>
                                <th className="p-3 font-semibold text-slate-600">Referensi</th>
                                <th className="p-3 font-semibold text-slate-600">Keterangan</th>
                                <th className="p-3 font-semibold text-slate-600 text-right">Total Debit</th>
                                <th className="p-3 font-semibold text-slate-600 text-right">Total Kredit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {journals.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-slate-500">Data jurnal kosong atau tidak ditemukan</td></tr>
                            ) : null}

                            {journals.map((entry) => (
                                <React.Fragment key={entry.id}>
                                    <tr
                                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedRows.has(entry.id) ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => toggleRow(entry.id)}
                                    >
                                        <td className="p-3 text-center text-slate-400">
                                            <svg
                                                className={`w-4 h-4 transition-transform duration-200 ${expandedRows.has(entry.id) ? 'rotate-90 text-blue-500' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </td>
                                        <td className="p-3 text-slate-600">{formatDate(entry.entry_date)}</td>
                                        <td className="p-3 font-medium text-slate-800">{entry.entry_number}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                                                {entry.source_type} : {entry.source_number || '-'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-600 truncate max-w-[200px]" title={entry.description}>{entry.description}</td>
                                        <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(entry.total_debit)}</td>
                                        <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(entry.total_credit)}</td>
                                    </tr>

                                    {expandedRows.has(entry.id) && (
                                        <tr className="bg-slate-50 shadow-inner">
                                            <td colSpan="7" className="p-0">
                                                <div className="px-12 py-4 bg-slate-50 border-b border-slate-200">
                                                    <table className="w-full border border-slate-200 rounded-lg overflow-hidden bg-white">
                                                        <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                                            <tr>
                                                                <th className="py-2.5 px-4 font-semibold w-24">Akun</th>
                                                                <th className="py-2.5 px-4 font-semibold">Nama Akun</th>
                                                                <th className="py-2.5 px-4 font-semibold text-right">Debit</th>
                                                                <th className="py-2.5 px-4 font-semibold text-right">Kredit</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {entry.lines.map((line, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50">
                                                                    <td className="py-2.5 px-4 font-mono text-slate-500">{line.account_code || '-'}</td>
                                                                    <td className={`py-2.5 px-4 text-slate-800 ${line.credit > 0 ? 'pl-8 text-slate-600' : 'font-medium'}`}>{line.account_name || '-'}</td>
                                                                    <td className="py-2.5 px-4 text-right">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                                                                    <td className="py-2.5 px-4 text-right">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Simplified) */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-slate-600">
                    <div>
                        Menampilkan {journals.length} entri (Halaman {page + 1})
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Sebelumnya
                        </button>
                        <button
                            disabled={journals.length < rowsPerPage}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 w-full max-w-[1400px] mx-auto bg-slate-50/50 min-h-full">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Buku Besar & Keuangan</h1>
                    <p className="text-slate-500 mt-2">Core Financials: Neraca & Mutasi Jurnal Akuntansi</p>
                </div>

                {/* Toggle View */}
                <div className="flex p-1 bg-slate-200 rounded-lg shadow-inner">
                    <button
                        className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'summary' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        ⚖️ Balance Sheet
                    </button>
                    <button
                        className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'journals' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
                        onClick={() => setActiveTab('journals')}
                    >
                        📜 Catatan Jurnal
                    </button>
                </div>
            </div>

            {loading && !!balanceSheet && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
            )}

            {activeTab === 'summary' ? renderBalanceSheet() : renderJournalTable()}
        </div>
    );
};

export default GeneralLedger;
