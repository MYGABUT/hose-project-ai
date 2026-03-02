/**
 * AddItemModal - Modal for adding items to a Sales Order
 */
import Button from '../../components/common/Button/Button';
import ComboInput from './ComboInput';

export default function AddItemModal({
    showAddItem,
    setShowAddItem,
    newItem,
    setNewItem,
    isPendingItem,
    setIsPendingItem,
    handleAddItem,
    hoseProducts,
    fittingProducts
}) {
    if (!showAddItem) return null;

    return (
        <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
            <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Tambah Item Pesanan</h3>
                    <button onClick={() => setShowAddItem(false)}>✕</button>
                </div>
                <div className="modal-body">
                    {/* Toggle Pending */}
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label className="checkbox-frame">
                            <input
                                type="checkbox"
                                checked={isPendingItem}
                                onChange={(e) => setIsPendingItem(e.target.checked)}
                            />
                            <span style={{ fontWeight: 600, color: isPendingItem ? '#f59e0b' : '#64748b' }}>
                                📦 Barang Kosong / Pending Inventory
                            </span>
                        </label>
                        {isPendingItem && (
                            <p className="input-hint" style={{ color: '#f59e0b', marginTop: '4px' }}>
                                Item ini akan ditambahkan sebagai "Pending" dan tidak mengurangi stok saat ini.
                            </p>
                        )}
                    </div>

                    {/* Hose Selection with ComboInput */}
                    {!isPendingItem && (
                        <div className="form-group">
                            <label>Produk Hose * <span className="label-hint">({hoseProducts.length} produk)</span></label>
                            <ComboInput
                                items={hoseProducts}
                                value={newItem.hoseProductId}
                                onChange={(id) => setNewItem(prev => ({ ...prev, hoseProductId: id }))}
                                placeholder="Ketik untuk cari hose..."
                                displayField="name"
                                idField="id"
                            />
                        </div>
                    )}

                    {isPendingItem && (
                        <div className="form-group">
                            <label>Nama Barang / Deskripsi Manual *</label>
                            <input
                                type="text"
                                value={newItem.description}
                                onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Contoh: Hose R2 3/4 (Stok Kosong / Pesan ke Vendor)"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Jumlah (pcs) *</label>
                            <input
                                type="number"
                                min="1"
                                value={newItem.qty}
                                onChange={e => setNewItem(prev => ({ ...prev, qty: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Panjang Potong (meter)</label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="contoh: 2.5"
                                value={newItem.cutLength}
                                onChange={e => setNewItem(prev => ({ ...prev, cutLength: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Fitting Selection - Only Show if NOT pending */}
                    {!isPendingItem && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Fitting Ujung 1 <span className="label-hint">(opsional)</span></label>
                                <ComboInput
                                    items={fittingProducts}
                                    value={newItem.fittingAId}
                                    onChange={(id) => setNewItem(prev => ({ ...prev, fittingAId: id }))}
                                    placeholder="Cari fitting..."
                                    displayField="name"
                                    idField="id"
                                />
                            </div>
                            <div className="form-group">
                                <label>Fitting Ujung 2 <span className="label-hint">(opsional)</span></label>
                                <ComboInput
                                    items={fittingProducts}
                                    value={newItem.fittingBId}
                                    onChange={(id) => setNewItem(prev => ({ ...prev, fittingBId: id }))}
                                    placeholder="Cari fitting..."
                                    displayField="name"
                                    idField="id"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Harga Satuan (Rp)</label>
                            <input
                                type="number"
                                min="0"
                                value={newItem.unitPrice}
                                onChange={e => setNewItem(prev => ({ ...prev, unitPrice: e.target.value }))}
                                placeholder="0"
                            />
                        </div>
                        {!isPendingItem && (
                            <div className="form-group">
                                <label>Deskripsi</label>
                                <input
                                    type="text"
                                    value={newItem.description}
                                    onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Deskripsi item (opsional)"
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowAddItem(false)}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleAddItem}
                        disabled={(!isPendingItem && !newItem.hoseProductId) || (isPendingItem && !newItem.description)}
                    >
                        + Tambahkan
                    </Button>
                </div>
            </div>
        </div>
    );
}
