'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Carga dinámica para evitar error de canvas en SSR
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false });

// A 380×140 signature PNG is typically 10–30 KB in base64.
// 200 000 chars ≈ 150 KB — generous enough for any real signature, blocks oversized payloads.
const MAX_BASE64_LENGTH = 200_000;

export default function FirmaCanvas({ label, value, onChange }) {
  const sigRef = useRef(null);
  const [sizeError, setSizeError] = useState(false);

  function handleGuardar() {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    setSizeError(false);
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl.length > MAX_BASE64_LENGTH) {
      setSizeError(true);
      return;
    }
    onChange(dataUrl);
  }

  function handleReset() {
    if (sigRef.current) sigRef.current.clear();
    setSizeError(false);
    onChange(null);
  }

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        {label}
      </Typography>

      {value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box
            component="img"
            src={value}
            alt="Saved signature"
            sx={{
              border: '1px solid',
              borderColor: 'success.light',
              borderRadius: 1,
              maxWidth: 300,
              height: 90,
              objectFit: 'contain',
              bgcolor: 'white',
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="body2" color="success.main">Signature saved</Typography>
          </Box>
          <Button size="small" variant="outlined" color="warning" onClick={handleReset}>
            Sign again
          </Button>
        </Box>
      ) : (
        <Box>
          <Paper
            variant="outlined"
            sx={{
              display: 'inline-block', borderRadius: 2, overflow: 'hidden', cursor: 'crosshair',
              bgcolor: '#F1F5F9',
              border: '2px dashed',
              borderColor: 'divider',
              boxShadow: 'inset 0 1px 4px rgba(15,23,42,0.06)',
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{ width: 380, height: 140, style: { display: 'block' } }}
              backgroundColor="#F1F5F9"
            />
          </Paper>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button size="small" variant="outlined" onClick={() => { sigRef.current?.clear(); setSizeError(false); }}>
              Clear
            </Button>
            <Button size="small" variant="contained" onClick={handleGuardar}>
              Save signature
            </Button>
            {sizeError && (
              <Typography variant="caption" color="error">
                Signature too large. Clear it and try again.
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
