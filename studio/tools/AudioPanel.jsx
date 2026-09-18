import React, { useState, useRef, useEffect } from 'react';
import { 
  Music, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Upload, 
  ArrowLeftRight, 
  Trash2, 
  RotateCcw, 
  Search, 
  Sparkles, 
  Plus, 
  Disc, 
  Radio, 
  X,
  FileAudio,
} from 'lucide-react';

export function AudioPanel({
  audioItems = [],
  onRemoveAudio,
  onRestoreAudio,
  onReplaceAudio,
  onSwapAudio,
  onResetAudio,
  onResetAllAudio,
  onAddNewAudio,
  audioModeActive,
  onToggleAudioMode,
  showToast,
  onClose,
  onBackToDesign,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Swap Modal State
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [audioToSwap, setAudioToSwap] = useState(null);

  // File Upload Refs
  const uploadFileInputRef = useRef(null);
  const [targetUploadId, setTargetUploadId] = useState(null);
  const newAudioUploadRef = useRef(null);

  // Sidebar Preview HTML5 Audio Player
  const audioPlayerRef = useRef(null);

  const categories = [
    { id: 'all', title: 'All Audio' },
    { id: 'showcase', title: 'Showcase Beats' },
    { id: 'services', title: 'Service Before/After Stems' },
    { id: 'raw', title: 'Raw Project Files' },
  ];

  const filteredAudio = audioItems.filter((item) => {
    if (activeCategoryFilter === 'showcase' && item.type !== 'showcase') return false;
    if (activeCategoryFilter === 'services' && item.type !== 'services') return false;
    if (activeCategoryFilter === 'raw' && item.type !== 'raw') return false;

    if (!searchQuery.trim()) return true;

    const queryTerms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const rawFilename = (item.audioUrl || '').split('/').pop()?.split('?')[0] || '';
    const cleanFilename = rawFilename.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_\-+.]/g, ' ');

    const combinedSearchCorpus = [
      item.title,
      item.category,
      item.type,
      item.section,
      item.genre,
      item.key,
      item.bpm ? `${item.bpm} bpm` : '',
      item.trackNumber ? `track ${item.trackNumber} slot ${item.trackNumber}` : '',
      item.id,
      rawFilename,
      cleanFilename,
      item.customFileName,
      item.title?.replace(/(\d+)/g, (m) => ` ${m} ${parseInt(m, 10)} `),
      item.section?.replace(/(\d+)/g, (m) => ` ${m} ${parseInt(m, 10)} `),
      item.id?.replace(/(\d+)/g, (m) => ` ${m} ${parseInt(m, 10)} `),
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

  const modifiedCount = audioItems.filter(
    (item) => item.isReplaced || item.isSwapped || item.isRemoved || item.audioUrl !== item.originalAudioUrl
  ).length;

  // Time Formatter for Minimal Seekbar
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getSafeAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('./assets/')) return url.substring(1);
    return url;
  };

  // In-Sidebar Audio Audition
  const togglePlayAudio = (item) => {
    if (item.isRemoved) {
      showToast?.('Track is muted/removed. Restore it to listen.');
      return;
    }

    if (currentlyPlayingId === item.id) {
      // Pause
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setCurrentlyPlayingId(null);
    } else {
      // Play new
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = getSafeAudioUrl(item.audioUrl);
        audioPlayerRef.current.currentTime = 0;
        setCurrentTime(0);
        setPlaybackProgress(0);
        audioPlayerRef.current.play().then(() => {
          if (audioPlayerRef.current?.duration) {
            setDuration(audioPlayerRef.current.duration);
          }
        }).catch((err) => {
          console.warn('Audio play failed:', err);
          showToast?.('Could not play audio track preview.');
        });
      }
      setCurrentlyPlayingId(item.id);
    }
  };

  // Minimal Functional Seekbar Handlers
  const handleSeek = (newTime) => {
    const audio = audioPlayerRef.current;
    if (!audio) return;
    const dur = audio.duration || duration || 0;
    const clampedTime = dur > 0 ? Math.max(0, Math.min(newTime, dur)) : Math.max(0, newTime);
    audio.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    if (dur > 0) {
      setPlaybackProgress((clampedTime / dur) * 100);
    }
  };

  const handleSeekbarClick = (e, trackDuration) => {
    e.stopPropagation();
    const audio = audioPlayerRef.current;
    if (!audio) return;
    const dur = trackDuration || audio.duration || duration;
    if (!dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * dur;
    handleSeek(targetTime);
  };

  useEffect(() => {
    const audio = audioPlayerRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setCurrentlyPlayingId(null);
      setPlaybackProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('canplay', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Handle PC Audio Upload
  const handleFileUpload = (e, targetId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
      showToast?.('Please upload a valid audio file (.mp3, .wav, .m4a, .ogg)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result;
      if (dataUrl && typeof dataUrl === 'string') {
        onReplaceAudio(targetId, dataUrl, file.name);
        showToast?.(`Uploaded & replaced with "${file.name}"`);
        // If this track is currently playing in preview, reload preview
        if (currentlyPlayingId === targetId && audioPlayerRef.current) {
          audioPlayerRef.current.src = dataUrl;
          audioPlayerRef.current.play().catch(() => {});
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle Adding a completely new raw audio file
  const handleNewAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result;
      if (dataUrl && typeof dataUrl === 'string') {
        const title = file.name.replace(/\.[^/.]+$/, '');
        onAddNewAudio?.(dataUrl, file.name, title, 'Beats & Showcase');
        showToast?.(`Added new audio file "${file.name}"`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openSwapModal = (item) => {
    setAudioToSwap(item);
    setSwapModalOpen(true);
  };

  const handleExecuteSwap = (targetItem) => {
    if (!audioToSwap || !targetItem || audioToSwap.id === targetItem.id) return;
    onSwapAudio(audioToSwap.id, targetItem.id);
    showToast?.(`Swapped "${audioToSwap.title}" with "${targetItem.title}"`);
    setSwapModalOpen(false);
    setAudioToSwap(null);
  };

  return (
    <div style={{
      flex: '1 1 auto',
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '14px 14px 100px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxSizing: 'border-box',
      WebkitOverflowScrolling: 'touch',
      position: 'relative',
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
            Audio Management
          </span>
        </div>
      )}

      {/* Hidden audio element for in-sidebar preview */}
      <audio ref={audioPlayerRef} preload="none" />

      {/* Hidden File Inputs for PC Audio Uploads */}
      <input
        type="file"
        ref={uploadFileInputRef}
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileUpload(e, targetUploadId)}
      />
      <input
        type="file"
        ref={newAudioUploadRef}
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleNewAudioUpload}
      />

      {/* SWAP / INTERCHANGE MODAL */}
      {swapModalOpen && audioToSwap && (
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
            maxWidth: 520,
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
                    Swap Audio Track
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    Select another audio file on the website to swap with <strong>{audioToSwap.title}</strong>
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

            {/* Modal Audio List */}
            <div style={{
              padding: 14,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 440,
            }}>
              {audioItems
                .filter((item) => item.id !== audioToSwap.id)
                .map((targetItem) => (
                  <div
                    key={targetItem.id}
                    onClick={() => handleExecuteSwap(targetItem)}
                    style={{
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0019ff';
                      e.currentTarget.style.background = '#f0f4ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: '#e0e7ff',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Disc size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                          {targetItem.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {targetItem.category} • {targetItem.section}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: '#0019ff',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 6,
                    }}>
                      Select to Swap
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

      {/* 1. AUDIO LIBRARY & CATEGORIZED SECTIONS */}
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
              Raw Audio Tracks ({audioItems.length})
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Upload New Raw Audio File */}
            <button
              onClick={() => newAudioUploadRef.current?.click()}
              style={{
                background: '#0019ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: 5,
                padding: '4px 9px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 1px 3px rgba(0, 25, 255, 0.25)',
              }}
              title="Upload a new raw audio file"
            >
              <Plus size={12} />
              <span>Add Audio</span>
            </button>

            {modifiedCount > 0 && (
              <button
                onClick={() => {
                  onResetAllAudio?.();
                  showToast?.('Reset all audio tracks to defaults');
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
            placeholder="Search audio by name, category, or file..."
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

        {/* Category Filter Pills */}
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

        {/* Categorized Audio List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredAudio.map((item) => {
            const isPlaying = currentlyPlayingId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  border: isPlaying ? '1.5px solid #0019ff' : '1.5px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '12px',
                  background: item.isRemoved ? '#fef2f2' : isPlaying ? '#f0f4ff' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  boxShadow: isPlaying ? '0 4px 12px rgba(0, 25, 255, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.12s ease',
                }}
              >
                {/* Track Header & Play Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    {/* Audition Play / Pause Button */}
                    <button
                      onClick={() => togglePlayAudio(item)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: isPlaying ? '#0019ff' : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                        transition: 'all 0.12s ease',
                      }}
                      title={isPlaying ? 'Pause audition' : 'Audition / Play track'}
                    >
                      {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
                    </button>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.title}
                        </span>

                        {item.isRemoved && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 3 }}>
                            Muted
                          </span>
                        )}
                        {item.isReplaced && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: 3 }}>
                            Uploaded
                          </span>
                        )}
                        {item.isSwapped && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 3 }}>
                            Swapped
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>
                          {item.category}
                        </span>
                        <span>•</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.section}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Equalizer Visualizer Bars when Playing */}
                  {isPlaying && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, paddingRight: 4 }}>
                      <span style={{ width: 3, height: '100%', background: '#0019ff', borderRadius: 1, animation: 'pulse 0.6s infinite ease-in-out' }} />
                      <span style={{ width: 3, height: '60%', background: '#0019ff', borderRadius: 1, animation: 'pulse 0.8s infinite ease-in-out' }} />
                      <span style={{ width: 3, height: '80%', background: '#0019ff', borderRadius: 1, animation: 'pulse 0.5s infinite ease-in-out' }} />
                    </div>
                  )}
                </div>

                {/* Minimal Functional Seekbar */}
                {isPlaying && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '8px 10px',
                  }}>
                    <div
                      onClick={(e) => handleSeekbarClick(e, duration)}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      title="Click or drag seekbar to jump to position"
                    >
                      {/* Track Background */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: 5,
                        background: '#e2e8f0',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}>
                        {/* Progress Fill */}
                        <div style={{
                          width: `${playbackProgress}%`,
                          height: '100%',
                          background: '#0019ff',
                          borderRadius: 3,
                          transition: 'width 0.05s linear',
                        }} />
                      </div>

                      {/* Scrubber Handle */}
                      <div style={{
                        position: 'absolute',
                        left: `calc(${playbackProgress}% - 5px)`,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#0019ff',
                        boxShadow: '0 1px 3px rgba(0,25,255,0.4)',
                        pointerEvents: 'none',
                        transition: 'left 0.05s linear',
                      }} />

                      {/* Transparent range input for scrubbing & dragging */}
                      <input
                        type="range"
                        min={0}
                        max={duration > 0 ? duration : 100}
                        step={0.1}
                        value={currentTime || 0}
                        onChange={(e) => handleSeek(parseFloat(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer',
                          margin: 0,
                          zIndex: 2,
                        }}
                      />
                    </div>

                    {/* Live Timestamps */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 10.5,
                      color: '#64748b',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}>
                      <span style={{ color: '#0019ff' }}>{formatTime(currentTime)}</span>
                      <span>{duration > 0 ? formatTime(duration) : (item.duration || '--:--')}</span>
                    </div>
                  </div>
                )}

                {/* Audio File Source Info */}
                <div style={{
                  fontSize: 10.5,
                  fontFamily: 'monospace',
                  color: '#64748b',
                  background: '#f8fafc',
                  padding: '4px 8px',
                  borderRadius: 5,
                  border: '1px solid #e2e8f0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {item.audioUrl.startsWith('data:') ? 'Uploaded custom audio stream' : item.audioUrl}
                </div>

                {/* 4 BASIC FUNCTIONS BUTTONS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                  {/* 1. REPLACE (UPLOAD FROM PC) */}
                  <button
                    onClick={() => {
                      setTargetUploadId(item.id);
                      uploadFileInputRef.current?.click();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: '#0019ff',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0, 25, 255, 0.25)',
                    }}
                    title="Upload replacement audio file from PC (.mp3, .wav)"
                  >
                    <Upload size={12} />
                    <span>Upload</span>
                  </button>

                  {/* 2. SWAP / INTERCHANGE */}
                  <button
                    onClick={() => openSwapModal(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: '#f1f5f9',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '6px 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Swap with another audio track on the website"
                  >
                    <ArrowLeftRight size={12} />
                    <span>Swap</span>
                  </button>

                  {/* 3. REMOVE / MUTE */}
                  {item.isRemoved ? (
                    <button
                      onClick={() => {
                        onRestoreAudio(item.id);
                        showToast?.(`Unmuted "${item.title}"`);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        borderRadius: 6,
                        padding: '6px 4px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Restore audio playback"
                    >
                      <Volume2 size={12} />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onRemoveAudio(item.id);
                        showToast?.(`Muted / removed "${item.title}"`);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        padding: '6px 4px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Mute / remove audio from website"
                    >
                      <VolumeX size={12} />
                      <span>Mute</span>
                    </button>
                  )}

                  {/* 4. RESET */}
                  <button
                    onClick={() => {
                      onResetAudio(item.id);
                      showToast?.(`Reset "${item.title}" to original`);
                    }}
                    disabled={!item.isReplaced && !item.isSwapped && !item.isRemoved && item.audioUrl === item.originalAudioUrl}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      background: '#f8fafc',
                      color: (!item.isReplaced && !item.isSwapped && !item.isRemoved && item.audioUrl === item.originalAudioUrl) ? '#94a3b8' : '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      padding: '6px 4px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: (!item.isReplaced && !item.isSwapped && !item.isRemoved && item.audioUrl === item.originalAudioUrl) ? 'not-allowed' : 'pointer',
                    }}
                    title="Reset to default original audio"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Minimal Audio Player Bar */}
      {currentlyPlayingId && (() => {
        const activeTrack = audioItems.find((t) => t.id === currentlyPlayingId);
        if (!activeTrack) return null;
        return (
          <div style={{
            position: 'sticky',
            bottom: -80,
            zIndex: 40,
            background: '#ffffff',
            border: '1.5px solid #0019ff',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0, 25, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginTop: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <button
                  onClick={() => togglePlayAudio(activeTrack)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#0019ff',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Pause/Resume"
                >
                  <Pause size={13} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeTrack.title}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>
                    Now Auditioning
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.pause();
                  }
                  setCurrentlyPlayingId(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 4,
                }}
                title="Stop Audio"
              >
                <X size={14} />
              </button>
            </div>

            {/* Minimal Seekbar */}
            <div
              onClick={(e) => handleSeekbarClick(e, duration)}
              style={{
                position: 'relative',
                width: '100%',
                height: 14,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 4,
                background: '#e2e8f0',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${playbackProgress}%`,
                  height: '100%',
                  background: '#0019ff',
                  borderRadius: 2,
                }} />
              </div>
              <div style={{
                position: 'absolute',
                left: `calc(${playbackProgress}% - 4px)`,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#0019ff',
                pointerEvents: 'none',
              }} />
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.1}
                value={currentTime || 0}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  margin: 0,
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#64748b',
              fontWeight: 600,
            }}>
              <span style={{ color: '#0019ff' }}>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : (activeTrack.duration || '--:--')}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
