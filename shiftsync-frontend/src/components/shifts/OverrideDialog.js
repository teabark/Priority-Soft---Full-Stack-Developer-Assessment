import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography
} from '@mui/material';

const OverrideDialog = ({ open, onClose, onConfirm, impact, staffName }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Please provide a reason for override');
      return;
    }
    onConfirm(reason);
    setReason('');
    setError('');
  };

  // Don't render if impact is null
  if (!impact) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#ffebee' }}>
        <Typography color="error" variant="h6">
          ⚠️ Manager Override Required
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This assignment would violate labor laws:
          </Alert>
          
          {/* Safety check for blocks */}
          {impact.blocks && impact.blocks.length > 0 ? (
            impact.blocks.map((block, idx) => (
              <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                {block.message}
              </Alert>
            ))
          ) : (
            <Alert severity="info" sx={{ mb: 1 }}>
              No specific violations found, but override is required.
            </Alert>
          )}
          
          <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
            By overriding, you confirm that this is necessary and accept responsibility.
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for override"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={!!error}
            helperText={error}
            placeholder="e.g., Emergency coverage, no other staff available, etc."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="warning"
        >
          Confirm Override
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OverrideDialog;