import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const ACCENT = '#D4622A';
const ACCENT_DARK = '#B84E20';

const STORE_NAMES = {
  shufersal: 'Shufersal',
  rami_levy: 'Rami Levy',
  victory: 'Victory',
  yohananof: 'Yohananof',
  osher_ad: 'Osher Ad',
};

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraSupported, setCameraSupported] = useState(true);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [flashActive, setFlashActive] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBarcodeDetectorSupported('BarcodeDetector' in window);

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const startCamera = async () => {
    setError('');
    setResult(null);
    setScannedCode('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      if (barcodeDetectorSupported) {
        if (!detectorRef.current) {
          detectorRef.current = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });
        }
        startDetectionLoop();
      }
    } catch(e) {
      if (e.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access and try again.');
      } else if (e.name === 'NotFoundError') {
        setError('No camera found on this device.');
        setCameraSupported(false);
      } else {
        setError(`Camera error: ${e.message}`);
      }
    }
  };

  const startDetectionLoop = () => {
    const scan = async () => {
      if (!videoRef.current || !detectorRef.current || !streamRef.current) return;
      if (videoRef.current.readyState < 2) {
        animRef.current = requestAnimationFrame(scan);
        return;
      }
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code && code !== scannedCode) {
            setScannedCode(code);
            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 300);
            stopCamera();
            await lookupBarcode(code);
            return;
          }
        }
      } catch { /* ignore detection errors */ }
      animRef.current = requestAnimationFrame(scan);
    };
    animRef.current = requestAnimationFrame(scan);
  };

  const lookupBarcode = async (code) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/prix?q=${encodeURIComponent(code)}&barcode=1`);
      const data = await res.json();
      if (data.produits && data.produits.length > 0) {
        setResult(data.produits[0]);
      } else {
        setError(`No product found for barcode ${code}`);
      }
    } catch {
      setError('Failed to look up product. Please try again.');
    }
    setLoading(false);
  };

  const handleManualLookup = async () => {
    const code = manualCode.trim();
    if (!code) return;
    setScannedCode(code);
    await lookupBarcode(code);
  };

  if (!mounted) return null;

  const meilleurPrix = result
    ? Math.min(...(result.tousLesPrix || []).map(p => p.prix))
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: 'var(--nav-bg)', borderBottom: '0.5px solid var(--border)',
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => { stopCamera(); router.back(); }} style={{
            background: 'none', border: 'none', color: 'var(--text-sub)',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>← Back</button>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            dil<span style={{ color: ACCENT }}>z</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-sub)', marginLeft: 6 }}>Scanner</span>
          </span>
          <div style={{ width: 48 }} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 0' }}>

        {/* Camera viewfinder */}
        {cameraSupported && (
          <div style={{
            position: 'relative', borderRadius: 24, overflow: 'hidden',
            background: '#000', marginBottom: 20,
            aspectRatio: '4/3',
          }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: scanning ? 'block' : 'none',
              }}
            />

            {/* Flash overlay on scan */}
            {flashActive && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0.4)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Scan frame overlay */}
            {scanning && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 220, height: 140,
                  border: `2px solid ${ACCENT}`,
                  borderRadius: 12,
                  boxShadow: `0 0 0 2000px rgba(0,0,0,0.45)`,
                  position: 'relative',
                }}>
                  {/* Corner marks */}
                  {[['top:0;left:0', 'top right'], ['top:0;right:0', 'top left'], ['bottom:0;left:0', 'bottom right'], ['bottom:0;right:0', 'bottom left']].map(([pos, label]) => (
                    <div key={label} style={{
                      position: 'absolute',
                      ...(Object.fromEntries(pos.split(';').map(p => p.split(':')))),
                      width: 20, height: 20,
                      borderTop: label.includes('top') ? `3px solid ${ACCENT}` : 'none',
                      borderBottom: label.includes('bottom') ? `3px solid ${ACCENT}` : 'none',
                      borderLeft: label.includes('left') ? `3px solid ${ACCENT}` : 'none',
                      borderRight: label.includes('right') ? `3px solid ${ACCENT}` : 'none',
                    }} />
                  ))}

                  {/* Scan line animation */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, height: 2,
                    background: ACCENT,
                    animation: 'scanLine 1.5s ease-in-out infinite',
                    top: '50%',
                  }} />
                </div>
              </div>
            )}

            {!scanning && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: '#111',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
                <p style={{ color: '#fff', fontSize: 14, opacity: 0.7, textAlign: 'center', padding: '0 20px' }}>
                  {barcodeDetectorSupported
                    ? 'Point the camera at a barcode to scan automatically'
                    : 'Take a photo of the barcode'}
                </p>
              </div>
            )}
          </div>
        )}

        <style>{`
          @keyframes scanLine {
            0% { top: 10%; }
            50% { top: 80%; }
            100% { top: 10%; }
          }
        `}</style>

        {/* Start / Stop camera */}
        {cameraSupported && (
          <button
            onClick={scanning ? stopCamera : startCamera}
            style={{
              width: '100%', padding: '16px 20px',
              borderRadius: 18, border: 'none',
              background: scanning
                ? 'var(--bg-card2)'
                : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              color: scanning ? 'var(--text-sub)' : '#fff',
              fontSize: 16, fontWeight: 700, cursor: 'pointer',
              marginBottom: 16,
              boxShadow: scanning ? 'none' : '0 4px 18px rgba(212,98,42,0.4)',
            }}
          >
            {scanning ? '⏹ Stop camera' : '📷 Scan a barcode'}
          </button>
        )}

        {!barcodeDetectorSupported && scanning && (
          <div style={{
            background: 'rgba(212,98,42,0.1)', borderRadius: 14,
            padding: '12px 16px', marginBottom: 16,
            border: `1px solid ${ACCENT}`,
          }}>
            <p style={{ fontSize: 13, color: ACCENT, margin: 0 }}>
              Auto-detection not supported in this browser. Use manual input below to enter the barcode number.
            </p>
          </div>
        )}

        {/* Manual barcode input */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 20,
          padding: '16px', marginBottom: 16,
          boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 10 }}>
            OR enter barcode manually
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="tel"
              placeholder="7290000000000"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 14,
                border: '0.5px solid var(--border)', background: 'var(--bg-input)',
                color: 'var(--text)', fontSize: 15, outline: 'none',
                fontFamily: 'monospace', letterSpacing: 1,
              }}
            />
            <button
              onClick={handleManualLookup}
              disabled={!manualCode.trim() || loading}
              style={{
                padding: '12px 18px', borderRadius: 14, border: 'none',
                background: manualCode.trim() ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : 'var(--bg-card2)',
                color: manualCode.trim() ? '#fff' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700, cursor: manualCode.trim() ? 'pointer' : 'default',
              }}
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: 16, padding: '14px 16px', marginBottom: 16,
          }}>
            <p style={{ color: '#DC2626', fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Looking up product...</p>
          </div>
        )}

        {/* Product result */}
        {result && !loading && (
          <div style={{
            background: 'var(--bg-card)', borderRadius: 24,
            overflow: 'hidden', boxShadow: 'var(--shadow-float)',
          }}>
            {/* Scanned badge */}
            <div style={{
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                Product found — {scannedCode}
              </span>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Product image + name */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
                {result.image && (
                  <img
                    src={result.image}
                    alt={result.nom_en || result.nom}
                    style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'contain', background: 'var(--bg-card2)', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>
                    {result.nom_en || result.nom}
                  </p>
                  {result.nom_en && result.nom && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{result.nom}</p>
                  )}
                  {result.quantite && (
                    <span style={{
                      fontSize: 11, background: 'var(--bg-card2)', color: 'var(--text-sub)',
                      padding: '3px 8px', borderRadius: 20, display: 'inline-block',
                    }}>
                      {result.quantite} {result.unite}
                    </span>
                  )}
                </div>
              </div>

              {/* Best price highlight */}
              <div style={{
                background: `linear-gradient(135deg, rgba(212,98,42,0.12), rgba(184,78,32,0.08))`,
                border: `1.5px solid ${ACCENT}`,
                borderRadius: 16, padding: '14px 16px', marginBottom: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 2 }}>✓ Best price</p>
                  <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                    {STORE_NAMES[(result.tousLesPrix || []).find(p => p.prix === meilleurPrix)?.enseigne] ||
                      (result.tousLesPrix || []).find(p => p.prix === meilleurPrix)?.enseigne || ''}
                  </p>
                </div>
                <span style={{ fontSize: 36, fontWeight: 900, color: ACCENT }}>₪{meilleurPrix}</span>
              </div>

              {/* All prices */}
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 8 }}>All prices</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(result.tousLesPrix || []).map(p => {
                  const isBest = p.prix === meilleurPrix;
                  return (
                    <div key={p.enseigne} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', borderRadius: 14,
                      background: isBest ? 'rgba(212,98,42,0.08)' : 'var(--bg-card2)',
                      border: isBest ? `1px solid ${ACCENT}` : '0.5px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 14, color: isBest ? ACCENT : 'var(--text-sub)', fontWeight: isBest ? 700 : 400 }}>
                        {STORE_NAMES[p.enseigne] || p.enseigne}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: isBest ? ACCENT : 'var(--text)' }}>
                        ₪{p.prix}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Scan again */}
              <button
                onClick={() => { setResult(null); setScannedCode(''); setManualCode(''); setError(''); startCamera(); }}
                style={{
                  width: '100%', marginTop: 16, padding: '14px',
                  borderRadius: 16, border: 'none',
                  background: 'var(--bg-card2)', color: 'var(--text-sub)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Scan another product
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
