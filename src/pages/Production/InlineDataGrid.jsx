import React, { useState, useEffect, useRef } from 'react';
import './InlineDataGrid.css';

/**
 * Enterprise-grade inline data grid for high-speed Sales Order entry.
 * Supports keyboard navigation, inline editing, and Assembly vs Retail modes.
 */
export default function InlineDataGrid({
    items,
    setItems,
    hoseProducts,
    fittingProducts,
    onStockCheck
}) {
    // Structure of a row:
    // {
    //   id: string/number,
    //   type: 'ASSEMBLY' | 'RETAIL',
    //   product_id: number,
    //   product_name: string,
    //   cut_length: number,
    //   qty: number,
    //   fitting_a_id: number,
    //   fitting_a_name: string,
    //   fitting_b_id: number,
    //   fitting_b_name: string,
    //   unit_price: number,
    //   description: string,
    //   stock_available: boolean,
    //   stock_qty: number
    // }

    // Active cell coordinate, e.g., { rowIdx: 0, colId: 'product_id' }
    const [activeCell, setActiveCell] = useState(null);
    // Is the active cell currently being edited?
    const [isEditing, setIsEditing] = useState(false);

    // Autocomplete search state
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const gridRef = useRef(null);
    const editInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Columns definition
    const COLUMNS = [
        { id: 'type', label: 'Tipe', width: '100px' },
        { id: 'product_id', label: 'Produk / Hose (Ketik SKU/Nama)', width: '300px' },
        { id: 'qty', label: 'Qty', width: '80px', isNumber: true },
        { id: 'cut_length', label: 'Pjg(m)', width: '80px', isNumber: true, dependsOn: 'ASSEMBLY' },
        { id: 'fitting_a_id', label: 'Fitting A', width: '200px', dependsOn: 'ASSEMBLY' },
        { id: 'fitting_b_id', label: 'Fitting B', width: '200px', dependsOn: 'ASSEMBLY' },
        { id: 'unit_price', label: 'Harga@', width: '120px', isNumber: true },
        { id: 'subtotal', label: 'Subtotal', width: '140px', readOnly: true },
        { id: 'action', label: '', width: '50px', readOnly: true }
    ];

    // Ensure there is always one empty row at the bottom for quick addition
    useEffect(() => {
        if (items.length === 0 || items[items.length - 1].product_id !== null || items[items.length - 1].description !== '') {
            addNewEmptyRow();
        }
    }, [items]);

    const addNewEmptyRow = () => {
        setItems(prev => [...prev, {
            id: `new-${Date.now()}`,
            type: 'ASSEMBLY', // Default to assembly, can be toggled
            product_id: null,
            product_name: '',
            cut_length: '',
            qty: 1,
            fitting_a_id: null,
            fitting_a_name: '',
            fitting_b_id: null,
            fitting_b_name: '',
            unit_price: 0,
            description: '',
            stock_available: true,
            stock_qty: 0
        }]);
    };

    const updateRow = (rowIdx, field, value, additionalFields = {}) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[rowIdx] = { ...newItems[rowIdx], [field]: value, ...additionalFields };

            // Auto-generate description if needed
            const row = newItems[rowIdx];
            if (field === 'product_id' || field === 'qty' || field === 'cut_length') {
                if (row.product_name && row.product_id) {
                    row.description = `${row.product_name} ${row.cut_length ? row.cut_length + 'm' : ''} x ${row.qty}`;
                }
            }

            // If changing type to RETAIL, clear assembly-only fields
            if (field === 'type' && value === 'RETAIL') {
                row.cut_length = '';
                row.fitting_a_id = null;
                row.fitting_a_name = '';
                row.fitting_b_id = null;
                row.fitting_b_name = '';
            }

            return newItems;
        });
    };

    const removeRow = (rowIdx) => {
        // Don't remove if it's the only row and it's empty
        if (items.length === 1 && !items[0].product_id) return;

        setItems(prev => {
            const newItems = [...prev];
            newItems.splice(rowIdx, 1);
            return newItems;
        });

        // Reset focus
        setActiveCell(null);
        setIsEditing(false);
    };

    // Keyboard Navigation & Editing Logic
    const handleKeyDown = (e, rowIdx, colId) => {
        if (isEditing) {
            handleEditingKeyDown(e, rowIdx, colId);
            return;
        }

        // Navigation Mode
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (rowIdx < items.length - 1) setActiveCell({ rowIdx: rowIdx + 1, colId });
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (rowIdx > 0) setActiveCell({ rowIdx: rowIdx - 1, colId });
                break;
            case 'ArrowRight':
            case 'Tab':
                e.preventDefault();
                moveNextCell(rowIdx, colId, e.shiftKey);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moveNextCell(rowIdx, colId, true);
                break;
            case 'Enter':
                e.preventDefault();
                startEditing(rowIdx, colId);
                break;
            case 'Backspace':
            case 'Delete':
                if (colId === 'action') {
                    removeRow(rowIdx);
                } else if (!COLUMNS.find(c => c.id === colId)?.readOnly) {
                    updateRow(rowIdx, colId, '');
                }
                break;
            default:
                // Start typing immediately if it's a character (and not readonly)
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    const colDef = COLUMNS.find(c => c.id === colId);
                    if (!colDef?.readOnly && colId !== 'type' && colId !== 'action') {
                        startEditing(rowIdx, colId, e.key);
                    }
                }
                break;
        }
    };

    const handleEditingKeyDown = (e, rowIdx, colId) => {
        const isAutocomplete = ['product_id', 'fitting_a_id', 'fitting_b_id'].includes(colId);

        if (e.key === 'Escape') {
            setIsEditing(false);
            editInputRef.current?.blur();
            // Restore focus to grid cell
            gridRef.current?.querySelector(`[data-row="${rowIdx}"][data-col="${colId}"]`)?.focus();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (isAutocomplete && getFilteredOptions().length > 0) {
                // Select from dropdown
                handleSelectOption(getFilteredOptions()[highlightedIndex], rowIdx, colId);
            } else {
                saveAndMove(rowIdx, colId, 'down');
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (isAutocomplete && getFilteredOptions().length > 0) {
                handleSelectOption(getFilteredOptions()[highlightedIndex], rowIdx, colId);
            }
            saveAndMove(rowIdx, colId, e.shiftKey ? 'left' : 'right');
        } else if (isAutocomplete) {
            // Autocomplete navigation
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, getFilteredOptions().length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, 0));
            }
        }
    };

    const startEditing = (rowIdx, colId, initialChar = '') => {
        const row = items[rowIdx];

        // Don't edit readonly columns
        const colDef = COLUMNS.find(c => c.id === colId);
        if (colDef?.readOnly) return;

        // Don't edit assembly-only columns if row is RETAIL
        if (colDef?.dependsOn === 'ASSEMBLY' && row.type !== 'ASSEMBLY') return;

        // Toggle type directly without edit mode
        if (colId === 'type') {
            const newType = row.type === 'ASSEMBLY' ? 'RETAIL' : 'ASSEMBLY';
            updateRow(rowIdx, 'type', newType);
            return;
        }

        const isAutocomplete = ['product_id', 'fitting_a_id', 'fitting_b_id'].includes(colId);

        setActiveCell({ rowIdx, colId });
        setIsEditing(true);
        setHighlightedIndex(0);

        if (isAutocomplete) {
            // If starting with a char, use it as search. Else, empty search to show all.
            setSearchQuery(initialChar);
        } else {
            // Wait for render then select text
            setTimeout(() => {
                if (editInputRef.current) {
                    if (initialChar) {
                        editInputRef.current.value = initialChar;
                    } else {
                        // For numbers, we might want to clear 0 or select all
                        if (editInputRef.current.value === '0') {
                            editInputRef.current.value = '';
                        } else {
                            editInputRef.current.select();
                        }
                    }
                }
            }, 0);
        }
    };

    const saveAndMove = (rowIdx, colId, direction) => {
        if (editInputRef.current) {
            const val = editInputRef.current.value;
            const colDef = COLUMNS.find(c => c.id === colId);

            if (colDef?.isNumber) {
                updateRow(rowIdx, colId, parseFloat(val) || 0);
            } else if (!['product_id', 'fitting_a_id', 'fitting_b_id'].includes(colId)) {
                // Autocomplete fields are saved via handleSelectOption
                updateRow(rowIdx, colId, val);
            }
        }

        setIsEditing(false);

        if (direction === 'down') {
            if (rowIdx < items.length - 1) setActiveCell({ rowIdx: rowIdx + 1, colId });
            else setActiveCell({ rowIdx, colId }); // Stay on last row
        } else if (direction === 'right') {
            moveNextCell(rowIdx, colId, false);
        } else if (direction === 'left') {
            moveNextCell(rowIdx, colId, true);
        }

        // Refocus grid element
        setTimeout(() => {
            gridRef.current?.querySelector(`[data-row="${activeCell?.rowIdx || rowIdx}"][data-col="${activeCell?.colId || colId}"]`)?.focus();
        }, 50);
    };

    const moveNextCell = (rowIdx, colId, reverse = false) => {
        const editableColIds = COLUMNS.filter(c => !c.readOnly).map(c => c.id);
        const currColIndex = editableColIds.indexOf(colId);

        let nextRowIdx = rowIdx;
        let nextColIndex = currColIndex + (reverse ? -1 : 1);

        if (nextColIndex >= editableColIds.length) {
            nextColIndex = 0;
            if (nextRowIdx < items.length - 1) nextRowIdx++;
        } else if (nextColIndex < 0) {
            nextColIndex = editableColIds.length - 1;
            if (nextRowIdx > 0) nextRowIdx--;
        }

        const nextColId = editableColIds[nextColIndex];
        const row = items[nextRowIdx];
        const nextColDef = COLUMNS.find(c => c.id === nextColId);

        // Skip disabled cells (e.g., fitting in retail mode)
        if (nextColDef.dependsOn === 'ASSEMBLY' && row.type !== 'ASSEMBLY') {
            // Recursive call to find next valid cell
            setActiveCell({ rowIdx: nextRowIdx, colId: nextColId }); // Temporarily set so recursive call knows where to start
            setTimeout(() => moveNextCell(nextRowIdx, nextColId, reverse), 0);
            return;
        }

        setActiveCell({ rowIdx: nextRowIdx, colId: nextColId });

        // Focus the new cell element
        setTimeout(() => {
            gridRef.current?.querySelector(`[data-row="${nextRowIdx}"][data-col="${nextColId}"]`)?.focus();
        }, 0);
    };

    // Autocomplete helpers
    const getFilteredOptions = () => {
        if (!activeCell) return [];
        const { colId } = activeCell;
        const sourceData = (colId === 'product_id' || colId === 'hose_product_id') ? hoseProducts : fittingProducts;

        // If colId is product_id and mode is retail, we should allow all products, not just hose
        // TODO: Pass all products to support retail mode properly

        const query = searchQuery.toLowerCase();
        return sourceData.filter(p =>
            p.name?.toLowerCase().includes(query) ||
            p.sku?.toLowerCase().includes(query)
        ).slice(0, 15); // Limit to 15 for performance
    };

    const handleSelectOption = (product, rowIdx, colId) => {
        if (!product) {
            // Allow manual entry (Pending Item)
            if (searchQuery.trim() !== '') {
                updateRow(rowIdx, colId, null, {
                    [`${colId.replace('_id', '')}_name`]: 'Manual: ' + searchQuery,
                    description: searchQuery,
                    is_pending: true
                });
            }
        } else {
            // Product selected
            updateRow(rowIdx, colId, product.id, {
                [`${colId.replace('_id', '')}_name`]: product.name,
                [`${colId.replace('_id', '')}_sku`]: product.sku,
                unit_price: product.price || 0 // Auto fill price if it's the main product
            });

            // Check stock if it's main product
            if (colId === 'product_id' && onStockCheck) {
                const row = items[rowIdx];
                const qtyNeeded = (parseFloat(row.cut_length) || 1) * (parseInt(row.qty) || 1);
                onStockCheck(rowIdx, product.id, qtyNeeded);
            }
        }

        setIsEditing(false);
        moveNextCell(rowIdx, colId, false);
    };

    // Render Cell
    const renderCell = (row, rowIdx, col) => {
        const isCellActive = activeCell?.rowIdx === rowIdx && activeCell?.colId === col.id;
        const disabled = col.dependsOn === 'ASSEMBLY' && row.type !== 'ASSEMBLY';

        // Display value
        let displayValue = row[col.id];
        if (['product_id', 'fitting_a_id', 'fitting_b_id'].includes(col.id)) {
            displayValue = row[`${col.id.replace('_id', '')}_name`] || '';
        } else if (col.id === 'subtotal') {
            displayValue = (row.qty * row.unit_price).toLocaleString('id-ID');
        } else if (col.id === 'unit_price') {
            displayValue = row.unit_price?.toLocaleString('id-ID') || '0';
        }

        // Cell Class
        let cellClass = `grid-cell col-${col.id} ${col.isNumber ? 'numeric' : ''} ${disabled ? 'disabled' : ''}`;
        if (isCellActive) cellClass += ' active';
        if (isEditing && isCellActive) cellClass += ' editing';
        if (row.stock_available === false && col.id === 'product_id') cellClass += ' danger';

        return (
            <td
                key={`${row.id}-${col.id}`}
                className={cellClass}
                style={{ width: col.width }}
                tabIndex={disabled || col.readOnly ? -1 : 0}
                data-row={rowIdx}
                data-col={col.id}
                onClick={() => {
                    if (!disabled && !col.readOnly) {
                        setActiveCell({ rowIdx, colId: col.id });
                        // If it's the type col, toggle immediately, don't enter edit mode
                        if (col.id === 'type') {
                            updateRow(rowIdx, 'type', row.type === 'ASSEMBLY' ? 'RETAIL' : 'ASSEMBLY');
                        } else {
                            // Focus but don't edit immediately unless double clicked (or we can just edit on click)
                            startEditing(rowIdx, col.id);
                        }
                    }
                }}
                onKeyDown={(e) => handleKeyDown(e, rowIdx, col.id)}
            >
                {/* Editing Mode */}
                {isEditing && isCellActive && !disabled && !col.readOnly && col.id !== 'type' ? (
                    ['product_id', 'fitting_a_id', 'fitting_b_id'].includes(col.id) ? (
                        <div className="grid-autocomplete">
                            <input
                                ref={editInputRef}
                                type="text"
                                className="grid-edit-input"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setHighlightedIndex(0);
                                }}
                                onBlur={() => setTimeout(() => setIsEditing(false), 150)}
                                autoFocus
                            />
                            {/* Autocomplete Dropdown */}
                            <div className="grid-dropdown" ref={dropdownRef}>
                                {getFilteredOptions().map((opt, i) => (
                                    <div
                                        key={opt.id}
                                        className={`grid-dropdown-item ${i === highlightedIndex ? 'highlighted' : ''}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault(); // Prevent blur
                                            handleSelectOption(opt, rowIdx, col.id);
                                        }}
                                        onMouseEnter={() => setHighlightedIndex(i)}
                                    >
                                        <span className="name">{opt.name}</span>
                                        <span className="sku">{opt.sku}</span>
                                    </div>
                                ))}
                                {getFilteredOptions().length === 0 && (
                                    <div
                                        className={`grid-dropdown-item manual-entry highlighted`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectOption(null, rowIdx, col.id);
                                        }}
                                    >
                                        Tambahkan manual: "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <input
                            ref={editInputRef}
                            type="text"
                            className="grid-edit-input"
                            defaultValue={row[col.id]}
                            onBlur={() => saveAndMove(rowIdx, col.id, 'none')}
                            autoFocus
                        />
                    )
                ) : (
                    /* Display Mode */
                    <div className="cell-content">
                        {col.id === 'type' ? (
                            <span className={`type-badge ${row.type.toLowerCase()}`}>
                                {row.type === 'ASSEMBLY' ? '🔧 Assm' : '📦 Retail'}
                            </span>
                        ) : col.id === 'action' ? (
                            <button className="del-btn" onClick={(e) => { e.stopPropagation(); removeRow(rowIdx); }} tabindex="-1">✕</button>
                        ) : (
                            <span className="text-truncate">
                                {disabled ? '-' : displayValue}
                                {col.id === 'product_id' && row.is_pending && <span className="pending-badge">Manual</span>}
                            </span>
                        )}
                    </div>
                )}
            </td>
        );
    };

    return (
        <div className="inline-data-grid-container" ref={gridRef}>
            <table className="inline-data-grid">
                <thead>
                    <tr>
                        <th style={{ width: '30px' }}>#</th>
                        {COLUMNS.map(col => (
                            <th key={col.id} style={{ width: col.width }}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((row, rowIdx) => (
                        <tr key={row.id}>
                            <td className="row-number">{rowIdx + 1}</td>
                            {COLUMNS.map(col => renderCell(row, rowIdx, col))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={COLUMNS.length} className="add-row-cell">
                            <span className="shortcut-hint">💡 Tips: Gunakan tombol Panah, Enter, dan Tab untuk navigasi super cepat tanpa mouse.</span>
                        </td>
                        <td className="total-label">Total:</td>
                        <td className="total-value">
                            Rp {items.reduce((sum, item) => sum + ((item.qty || 0) * (item.unit_price || 0)), 0).toLocaleString('id-ID')}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
