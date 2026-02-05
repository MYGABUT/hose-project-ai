import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './TutorialOverlay.css';

const DEFAULT_STEPS = [
    {
        target: '.sidebar-nav-item[href="/inbound"]',
        title: 'Barang Masuk',
        content: 'Klik di sini untuk mendaftarkan stok selang baru dengan AI Scanner',
        placement: 'right'
    },
    {
        target: '.sidebar-nav-item[href="/production"]',
        title: 'Produksi',
        content: 'Kelola Job Order dan proses crimping di sini',
        placement: 'right'
    },
    {
        target: '.sidebar-nav-item[href="/qc"]',
        title: 'Quality Control',
        content: 'Lakukan inspeksi dan sertifikasi selang jadi',
        placement: 'right'
    },
    {
        target: '.header-search-btn',
        title: 'Scan Cepat',
        content: 'Klik ikon barcode untuk scan QR dan langsung melihat detail barang',
        placement: 'bottom'
    }
];

export default function TutorialOverlay({
    isOpen,
    onClose,
    steps = DEFAULT_STEPS
}) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);

    useEffect(() => {
        if (!isOpen) return;

        const updateTargetRect = () => {
            const step = steps[currentStep];
            if (!step) return;

            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
            } else {
                // Fallback position
                setTargetRect({ top: 200, left: 200, width: 100, height: 50 });
            }
        };

        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);

        return () => window.removeEventListener('resize', updateTargetRect);
    }, [isOpen, currentStep, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        setCurrentStep(0);
        onClose();
        // Save completion to localStorage
        localStorage.setItem('tutorial_completed', 'true');
    };

    const handleSkip = () => {
        handleComplete();
    };

    if (!isOpen || !targetRect) return null;

    const step = steps[currentStep];
    const spotlightStyle = {
        top: targetRect.top - 8,
        left: targetRect.left - 8,
        width: targetRect.width + 16,
        height: targetRect.height + 16
    };

    // Calculate tooltip position
    let tooltipStyle = {};
    switch (step.placement) {
        case 'right':
            tooltipStyle = {
                top: targetRect.top,
                left: targetRect.right + 20
            };
            break;
        case 'bottom':
            tooltipStyle = {
                top: targetRect.bottom + 20,
                left: targetRect.left
            };
            break;
        case 'left':
            tooltipStyle = {
                top: targetRect.top,
                right: window.innerWidth - targetRect.left + 20
            };
            break;
        default:
            tooltipStyle = {
                bottom: window.innerHeight - targetRect.top + 20,
                left: targetRect.left
            };
    }

    return createPortal(
        <div className="tutorial-overlay">
            {/* Dark overlay with spotlight */}
            <div className="tutorial-backdrop">
                <div className="spotlight" style={spotlightStyle} />
            </div>

            {/* Tooltip */}
            <div className="tutorial-tooltip" style={tooltipStyle}>
                <div className="tooltip-header">
                    <span className="tooltip-step">
                        Langkah {currentStep + 1} dari {steps.length}
                    </span>
                    <button className="tooltip-skip" onClick={handleSkip}>
                        Lewati
                    </button>
                </div>
                <h3 className="tooltip-title">{step.title}</h3>
                <p className="tooltip-content">{step.content}</p>
                <div className="tooltip-actions">
                    {currentStep > 0 && (
                        <button className="tooltip-btn secondary" onClick={handlePrev}>
                            Sebelumnya
                        </button>
                    )}
                    <button className="tooltip-btn primary" onClick={handleNext}>
                        {currentStep === steps.length - 1 ? 'Selesai' : 'Lanjut'}
                    </button>
                </div>
                {/* Progress dots */}
                <div className="tooltip-dots">
                    {steps.map((_, idx) => (
                        <span
                            key={idx}
                            className={`dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                        />
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
