/**
 * ComboInput - Reusable combo box with search, keyboard navigation, and add-new
 */
import { useState, useEffect, useRef } from 'react';

export default function ComboInput({ items, value, onChange, onAddNew, placeholder, displayField = 'name', idField = 'id' }) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    const filtered = items.filter(item =>
        item[displayField]?.toLowerCase().includes(search.toLowerCase())
    );

    const displayValue = value
        ? items.find(i => i[idField] === value)?.[displayField] || ''
        : '';

    const handleSelect = (item) => {
        onChange(item[idField]);
        setSearch('');
        setIsOpen(false);
        setHighlighted(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
                setHighlighted(0);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                setHighlighted(h => Math.min(h + 1, filtered.length - 1));
                e.preventDefault();
                break;
            case 'ArrowUp':
                setHighlighted(h => Math.max(h - 1, 0));
                e.preventDefault();
                break;
            case 'Enter':
                if (highlighted >= 0 && filtered[highlighted]) {
                    handleSelect(filtered[highlighted]);
                } else if (search.trim() && onAddNew) {
                    onAddNew(search.trim());
                    setSearch('');
                    setIsOpen(false);
                }
                e.preventDefault();
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlighted(-1);
                break;
        }
    };

    useEffect(() => {
        if (highlighted >= 0 && dropdownRef.current) {
            const items = dropdownRef.current.querySelectorAll('.combo-item');
            items[highlighted]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

    return (
        <div className="combo-input-container">
            <input
                ref={inputRef}
                type="text"
                className="combo-input"
                placeholder={value ? displayValue : placeholder}
                value={isOpen ? search : displayValue}
                onFocus={() => { setIsOpen(true); setSearch(''); }}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            />
            {value && (
                <button
                    type="button"
                    className="combo-clear"
                    onClick={() => { onChange(null); setSearch(''); }}
                >
                    ✕
                </button>
            )}
            {isOpen && (
                <div className="combo-dropdown" ref={dropdownRef}>
                    {filtered.length === 0 ? (
                        <div className="combo-empty">
                            {onAddNew ? (
                                <button
                                    type="button"
                                    className="combo-add-new"
                                    onClick={() => { onAddNew(search.trim()); setSearch(''); setIsOpen(false); }}
                                >
                                    ➕ Tambah "{search}"
                                </button>
                            ) : (
                                <span>Tidak ditemukan</span>
                            )}
                        </div>
                    ) : (
                        filtered.slice(0, 15).map((item, idx) => (
                            <div
                                key={item[idField]}
                                className={`combo-item ${highlighted === idx ? 'highlighted' : ''}`}
                                onMouseDown={() => handleSelect(item)}
                                onMouseEnter={() => setHighlighted(idx)}
                            >
                                <span className="combo-item-name">{item[displayField]}</span>
                                {item.sku && <span className="combo-item-sku">{item.sku}</span>}
                            </div>
                        ))
                    )}
                    {filtered.length > 15 && (
                        <div className="combo-more">+{filtered.length - 15} lainnya...</div>
                    )}
                </div>
            )}
        </div>
    );
}
