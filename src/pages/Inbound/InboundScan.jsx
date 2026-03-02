import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanApi } from '../../services/scanApi';
import { receiveBatch } from '../../services/wmsApi';

import { FaCamera, FaUpload, FaSpinner, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const InboundScan = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // State
    const [step, setStep] = useState('capture'); // capture, analyzing, review, success
    const [imagePreview, setImagePreview] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    console.log("InboundScan Component Rendering");

    // Form State
    const [formData, setFormData] = useState({
        brand: '',
        standard: '',
        size: '',
        quantity: '',
        location: '',
        notes: ''
    });

    // Handle Image Selection
    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
            setStep('analyzing');
            performScan(file);
        };
        reader.readAsDataURL(file);
    };

    // Perform AI Scan
    const performScan = async (file) => {
        setLoading(true);
        setError(null);
        try {
            const result = await scanApi.scanHose(file);
            setScanResult(result);

            // Auto-fill form based on AI result
            setFormData(prev => ({
                ...prev,
                brand: result.brand !== 'UNKNOWN' ? result.brand : '',
                standard: result.STD || '',
                size: result.SIZE || result.SIZE_DN || '',
                quantity: '1', // Default
                notes: `AI Confidence: ${result.confidence}%`
            }));

            setStep('review');
        } catch (err) {
            console.error(err);
            setError('Gagal menganalisis gambar. Silakan coba lagi atau input manual.');
            setStep('review'); // Allow manual input even if scan fails
        } finally {
            setLoading(false);
        }
    };

    // Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                // Map form fields to wmsApi schema (camelCase)
                brand: formData.brand,
                standard: formData.standard,
                sizeInch: formData.size,
                quantity: parseFloat(formData.quantity),
                location: formData.location,
                notes: formData.notes,

                // AI Data
                productSku: scanResult?.sku || null,
                confidence: scanResult?.confidence,
                aiRawText: scanResult?.raw_text_sample,
                source: 'AI_SCANNER'
            };

            await receiveBatch(payload);
            setStep('success');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Render Capture Step
    const renderCapture = () => (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg min-h-[400px]">
            <div className="text-center mb-8">
                <div className="bg-indigo-100 p-4 rounded-full inline-block mb-4">
                    <FaCamera className="text-4xl text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">AI Inbound Scanner</h2>
                <p className="text-gray-500 mt-2">Masuk Barang Otomatis dengan AI</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                <button
                    onClick={() => fileInputRef.current.click()}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors group"
                >
                    <FaUpload className="text-3xl text-indigo-400 group-hover:text-indigo-600 mb-2" />
                    <span className="font-semibold text-gray-600 group-hover:text-indigo-700">Upload Foto</span>
                    <span className="text-xs text-gray-400 mt-1">JPEG, PNG</span>
                </button>

                <button
                    onClick={() => {
                        // Camera logic would go here (using separate library or file input with capture)
                        fileInputRef.current.click();
                    }}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-300 rounded-xl hover:bg-purple-50 transition-colors group"
                >
                    <FaCamera className="text-3xl text-purple-400 group-hover:text-purple-600 mb-2" />
                    <span className="font-semibold text-gray-600 group-hover:text-purple-700">Ambil Foto</span>
                    <span className="text-xs text-gray-400 mt-1">Kamera HP</span>
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
                accept="image/*"
                capture="environment" // Hints mobile to use rear camera
            />
        </div>
    );

    // Render Analysis Step
    const renderAnalyzing = () => (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-lg min-h-[400px]">
            <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mb-6 shadow-md" />
            <FaSpinner className="text-4xl text-indigo-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-gray-800">Menganalisis Selang...</h3>
            <p className="text-gray-500 text-center max-w-xs mt-2">
                AI sedang membaca Brand, Ukuran, dan Spesifikasi dari foto Anda.
            </p>
        </div>
    );

    // Render Review Step
    const renderReview = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Image & AI Result */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Foto Barang</h3>
                    <img src={imagePreview} alt="Scan" className="w-full rounded-lg shadow-sm" />
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md">
                    <h3 className="font-bold text-gray-700 mb-3 border-b pb-2 flex items-center justify-between">
                        Hasil AI
                        {scanResult?.confidence ? (
                            <span className={`text-xs px-2 py-1 rounded-full ${scanResult.confidence > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {scanResult.confidence}% Conf
                            </span>
                        ) : null}
                    </h3>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Brand:</span>
                            <span className="font-medium">{scanResult?.brand || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Standard:</span>
                            <span className="font-medium">{scanResult?.STD || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Pressure:</span>
                            <span className="font-medium">{scanResult?.pressure_bar ? `${scanResult.pressure_bar} BAR` : '-'}</span>
                        </div>
                        <div className="mt-3 pt-2 border-t text-xs text-gray-400">
                            Raw: "{scanResult?.raw_text_sample}"
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Verification Form */}
            <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-indigo-500">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Verifikasi & Simpan</h2>

                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                            <FaExclamationTriangle className="text-red-500 mt-1 mr-3" />
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Brand */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                <input
                                    type="text"
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            {/* Standard */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Standard / Tipe</label>
                                <input
                                    type="text"
                                    value={formData.standard}
                                    onChange={e => setFormData({ ...formData, standard: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. R2, 4SP"
                                />
                            </div>

                            {/* Size */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran (Inch/DN)</label>
                                <input
                                    type="text"
                                    value={formData.size}
                                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. 1/2"
                                    required
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Meter/Pcs)</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    min="0.1" step="0.1"
                                    required
                                />
                            </div>

                            {/* Location */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Rak / Gudang</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Scan barcode rak atau ketik kode..."
                                    required
                                />
                            </div>

                            {/* Notes */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    rows="2"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('capture');
                                    setImagePreview(null);
                                    setScanResult(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Scan Ulang
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                            >
                                {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                Simpan Stok
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );

    // Render Success
    const renderSuccess = () => (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-lg min-h-[400px] text-center">
            <div className="bg-green-100 p-4 rounded-full mb-6">
                <FaCheck className="text-5xl text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Stok Masuk Berhasil!</h2>
            <p className="text-gray-500 mb-8 max-w-md">
                Data berhasil disimpan ke sistem inventori. Stok produk telah diperbarui.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => navigate('/inventory')}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                    Lihat Inventori
                </button>
                <button
                    onClick={() => {
                        setStep('capture');
                        setImagePreview(null);
                        setScanResult(null);
                        setFormData({ brand: '', standard: '', size: '', quantity: '', location: '', notes: '' });
                    }}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Scan Lagi
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Penerimaan Barang (AI Scan)</h1>
            <p className="text-gray-500 mb-8">Gunakan AI untuk mendeteksi detail selang secara otomatis.</p>

            {step === 'capture' && renderCapture()}
            {step === 'analyzing' && renderAnalyzing()}
            {step === 'review' && renderReview()}
            {step === 'success' && renderSuccess()}
        </div>
    );
};

export default InboundScan;
