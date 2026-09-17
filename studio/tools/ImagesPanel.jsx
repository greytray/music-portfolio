import React, { useState, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  ArrowLeftRight, 
  Trash2, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Check, 
  Search, 
  ExternalLink,
  Sparkles,
  Layers,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export function ImagesPanel({
  siteImages = [],
  selectedImage,
  onSelectImage,
  onRemoveImage,
  onRestoreImage,
  onReplaceImage,
  onSwapImage,
  onResetImage,
  onResetAllImages,
  imageModeActive,
  onToggleImageMode,
  showToast,
  onFocusImageOnPage,
  onClose,
  onBackToDesign,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [imageToSwap, setImageToSwap] = useState(null);
  const fileInputRef = useRef(null);
  const quickFileInputRef = useRef(null);
  const [quickTargetId, setQuickTargetId] = useState(null);

  // Group images by section category
  const categories = [
    { id: 'all', title: 'All Images' },
    { id: 'hero', title: 'Hero & Main' },
    { id: 'services', title: 'Service Catalog (Cards 01-06)' },
    { id: 'backgrounds', title: 'Backgrounds & Accents' },
  ];
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  const filteredImages = siteImages.filter((img) => {
    if (activeCategoryFilter === 'hero' && img.category !== 'hero') return false;
    if (activeCategoryFilter === 'services' && img.category !== 'services') return false;
    if (activeCategoryFilter === 'backgrounds' && img.category !== 'backgrounds') return false;

    if (!searchQuery.trim()) return true;

    // Smart multi-token normalized search
    const queryTerms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

    // Extract readable filename without path or extensions
    const rawFilename = (img.src || '').split('/').pop()?.split('?')[0] || '';
    const cleanFilename = rawFilename.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_\-+.]/g, ' ');

    // Normalize and build search corpus
    const combinedSearchCorpus = [
      img.title,
      img.section,
      img.category,
      img.alt,
      img.id,
      img.selector,
      rawFilename,
      cleanFilename,
      img.customFileName,
      img.title?.replace(/(\d+)/g, (m) => ` ${m} ${parseInt(m, 10)} `),
      img.section?.replace(/(\d+)/g, (m) => ` ${m} ${parseInt(m, 10)} `),
      img.id?.replace(/(\d+)/g, (m) => ` ${m} ${parseInt(m, 10)} `),
    ].filter(Boolean).join(' ').toLowerCase();

    return queryTerms.every((term) => {
      if (combinedSearchCorpus.includes(term)) return true;
      if (/^\d+$/.test(term)) {
        const intVal = parseInt(term, 10);
        const paddedVal = intVal < 10 ? `0${intVal}` : `${intVal}`;
        if (combinedSearchCorpus.includes(paddedVal) || combinedSearchCorpus.includes(`${intVal}`)) return true;
      }
      return false;
    });
  });

  const modifiedCount = siteImages.filter(
    (img) => img.isReplaced || img.isSwapped || img.isRemoved || img.src !== img.originalSrc
  ).length;

  // Handle file selection for the currently inspected image
  const handleFileUpload = (e, targetImgId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast?.('Please upload a valid image file (PNG, JPG, WebP, SVG, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result;
      if (dataUrl && typeof dataUrl === 'string') {
        const targetId = targetImgId || selectedImage?.id;
        if (targetId) {
          onReplaceImage(targetId, dataUrl, file.name);
          showToast?.(`Uploaded & replaced with "${file.name}"`);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openSwapModal = (img) => {
    setImageToSwap(img);
    setSwapModalOpen(true);
  };

  const handleExecuteSwap = (targetImg) => {
    if (!imageToSwap || !targetImg || imageToSwap.id === targetImg.id) return;
    onSwapImage(imageToSwap.id, targetImg.id);
    showToast?.(`Swapped "${imageToSwap.title}" with "${targetImg.title}"`);
    setSwapModalOpen(false);
    setImageToSwap(null);
  };

  return (
    <div style={{
      flex: '1 1 auto',
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '14px 14px 90px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxSizing: 'border-box',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Top Header Back / Close Action */}
      {(onBackToDesign || onClose) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onBackToDesign || onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Back"
          >
            Back
          </button>

          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
            Images Management
          </span>
        </div>
      )}

      {/* Hidden File Inputs for PC Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileUpload(e, selectedImage?.id)}
      />
      <input
        type="file"
        ref={quickFileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileUpload(e, quickTargetId)}
      />

      {/* SWAP / INTERCHANGE MODAL */}
      {swapModalOpen && imageToSwap && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 540,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 48px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            border: '1.5px solid #e2e8f0',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: '#e0e7ff', color: '#4338ca', padding: 6, borderRadius: 8, display: 'flex' }}>
                  <ArrowLeftRight size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    Swap Image
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    Select another image on the website to interchange with <strong>{imageToSwap.title}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSwapModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Image List */}
            <div style={{
              padding: 14,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
              maxHeight: 460,
            }}>
              {siteImages
                .filter((img) => img.id !== imageToSwap.id)
                .map((targetImg) => (
                  <div
                    key={targetImg.id}
                    onClick={() => handleExecuteSwap(targetImg)}
                    style={{
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 10,
                      cursor: 'pointer',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0019ff';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 25, 255, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: 100,
                      borderRadius: 6,
                      overflow: 'hidden',
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <img
                        src={targetImg.src}
                        alt={targetImg.alt || targetImg.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {targetImg.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {targetImg.section}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setSwapModalOpen(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. INSPECTED / SELECTED IMAGE CARD */}
      {selectedImage ? (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #0019ff',
          borderRadius: 10,
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 4px 16px rgba(0, 25, 255, 0.08)',
        }}>
          {/* Card Title & Status Badges */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0019ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Selected Image
                </span>
                {selectedImage.isRemoved && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 4 }}>
                    Removed
                  </span>
                )}
                {selectedImage.isReplaced && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4 }}>
                    Replaced
                  </span>
                )}
                {selectedImage.isSwapped && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4 }}>
                    Swapped
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                {selectedImage.title}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                {selectedImage.section}
              </div>
            </div>

            {/* Focus on page button */}
            <button
              onClick={() => onFocusImageOnPage?.(selectedImage)}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Scroll to and highlight this image on website"
            >
              <ExternalLink size={12} />
              <span>Locate</span>
            </button>
          </div>

          {/* Large Image Preview & Dimensions */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: 180,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#0b0b0e',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt || selectedImage.title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                opacity: selectedImage.isRemoved ? 0.3 : 1,
              }}
            />
            {selectedImage.isRemoved && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
              }}>
                IMAGE REMOVED / HIDDEN
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              background: 'rgba(0,0,0,0.75)',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              backdropFilter: 'blur(4px)',
            }}>
              {selectedImage.renderedWidth ? `${selectedImage.renderedWidth} × ${selectedImage.renderedHeight}px` : 'Live Render'}
            </div>
          </div>

          {/* URL / Path display */}
          <div style={{
            fontSize: 11,
            color: '#64748b',
            background: '#f8fafc',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {selectedImage.src.startsWith('data:') ? 'Uploaded local data URI' : selectedImage.src}
          </div>

          {/* BASIC FUNCTIONS ACTION BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {/* 1. REPLACE (UPLOAD FROM PC) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: '#0019ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 7,
                padding: '9px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0, 25, 255, 0.25)',
                transition: 'all 0.12s ease',
              }}
              title="Upload image from your computer to replace this image"
            >
              <Upload size={14} />
              <span>Replace (Upload)</span>
            </button>

            {/* 2. SWAP / INTERCHANGE */}
            <button
              onClick={() => openSwapModal(selectedImage)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: '#f1f5f9',
                color: '#1e293b',
                border: '1.5px solid #cbd5e1',
                borderRadius: 7,
                padding: '9px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              title="Swap this image with another image on the website"
            >
              <ArrowLeftRight size={14} />
              <span>Swap Image...</span>
            </button>

            {/* 3. REMOVE / HIDE */}
            {selectedImage.isRemoved ? (
              <button
                onClick={() => {
                  onRestoreImage(selectedImage.id);
                  showToast?.(`Restored "${selectedImage.title}"`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: 7,
                  padding: '9px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Eye size={14} />
                <span>Restore Image</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onRemoveImage(selectedImage.id);
                  showToast?.(`Removed "${selectedImage.title}" from website`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1.5px solid #fecaca',
                  borderRadius: 7,
                  padding: '9px 12px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Hide / remove this image from the live website"
              >
                <Trash2 size={14} />
                <span>Remove Image</span>
              </button>
            )}

            {/* 4. RESET TO ORIGINAL */}
            <button
              onClick={() => {
                onResetImage(selectedImage.id);
                showToast?.(`Reset "${selectedImage.title}" to original`);
              }}
              disabled={!selectedImage.isReplaced && !selectedImage.isSwapped && !selectedImage.isRemoved && selectedImage.src === selectedImage.originalSrc}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: '#f8fafc',
                color: (!selectedImage.isReplaced && !selectedImage.isSwapped && !selectedImage.isRemoved && selectedImage.src === selectedImage.originalSrc) ? '#94a3b8' : '#334155',
                border: '1.5px solid #e2e8f0',
                borderRadius: 7,
                padding: '9px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: (!selectedImage.isReplaced && !selectedImage.isSwapped && !selectedImage.isRemoved && selectedImage.src === selectedImage.originalSrc) ? 'not-allowed' : 'pointer',
              }}
              title="Revert back to initial original image"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State / Instruction box */
        <div style={{
          background: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          borderRadius: 10,
          padding: '20px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#e0e7ff',
            color: '#4338ca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ImageIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
              Select an Image to Edit
            </div>
            <div style={{ fontSize: 12, color: '#64748b', maxWidth: 280, marginTop: 4 }}>
              Click any image on the live preview website or pick an image from the library below to replace, swap, or remove.
            </div>
          </div>
        </div>
      )}

      {/* 3. ALL WEBSITE IMAGES LIBRARY */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 10,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              Website Images ({siteImages.length})
            </span>
            {modifiedCount > 0 && (
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                background: '#fef3c7',
                color: '#b45309',
                padding: '1px 6px',
                borderRadius: 4,
              }}>
                {modifiedCount} modified
              </span>
            )}
          </div>

          {modifiedCount > 0 && (
            <button
              onClick={() => {
                onResetAllImages?.();
                showToast?.('Reset all images to defaults');
              }}
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: 5,
                padding: '3px 8px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RotateCcw size={11} />
              <span>Reset All</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}>
          <Search size={14} style={{ position: 'absolute', left: 10, color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search images by section or name..."
            style={{
              width: '100%',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: 8,
              padding: '7px 10px 7px 32px',
              fontSize: 12.5,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryFilter(cat.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: activeCategoryFilter === cat.id ? '#0019ff' : '#f1f5f9',
                color: activeCategoryFilter === cat.id ? '#ffffff' : '#64748b',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
              }}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {/* Image Grid List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredImages.map((img) => {
            const isSelected = selectedImage?.id === img.id;
            return (
              <div
                key={img.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderRadius: 8,
                  border: isSelected ? '1.5px solid #0019ff' : '1px solid #e2e8f0',
                  background: isSelected ? '#f0f4ff' : '#ffffff',
                  transition: 'all 0.12s ease',
                }}
              >
                {/* Thumbnail */}
                <div
                  onClick={() => onSelectImage(img)}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: '#0b0b0e',
                    flexShrink: 0,
                    cursor: 'pointer',
                    position: 'relative',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.alt || img.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: img.isRemoved ? 0.3 : 1,
                    }}
                  />
                  {img.isRemoved && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(220, 38, 38, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}>
                      <EyeOff size={14} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div 
                  onClick={() => onSelectImage(img)}
                  style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {img.title}
                    </span>
                    {img.isReplaced && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '1px 4px', borderRadius: 3 }}>
                        Uploaded
                      </span>
                    )}
                    {img.isSwapped && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 4px', borderRadius: 3 }}>
                        Swapped
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {img.section}
                  </div>
                </div>

                {/* Action Icon Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {/* Quick Upload Replace */}
                  <button
                    onClick={() => {
                      setQuickTargetId(img.id);
                      quickFileInputRef.current?.click();
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: 5,
                      color: '#0019ff',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    title="Upload replacement image from PC"
                  >
                    <Upload size={13} />
                  </button>

                  {/* Quick Swap */}
                  <button
                    onClick={() => openSwapModal(img)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: 5,
                      color: '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    title="Swap with another image"
                  >
                    <ArrowLeftRight size={13} />
                  </button>

                  {/* Quick Remove / Restore */}
                  {img.isRemoved ? (
                    <button
                      onClick={() => onRestoreImage(img.id)}
                      style={{
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: 6,
                        padding: 5,
                        color: '#059669',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                      title="Restore image visibility"
                    >
                      <Eye size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={() => onRemoveImage(img.id)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: 5,
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                      title="Remove image from website"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
