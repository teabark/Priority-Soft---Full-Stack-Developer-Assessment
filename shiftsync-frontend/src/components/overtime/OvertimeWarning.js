import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Chip,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';

const OvertimeWarning = ({ 
  checkResult, 
  onOverride, 
  showOverride = false,
  staffName 
}) => {
  const [overrideDialog, setOverrideDialog] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState('');

  if (!checkResult) return null;

  const { allowed, errors, warnings, stats } = checkResult;

  const handleOverrideSubmit = () => {
    onOverride(overrideReason);
    setOverrideDialog(false);
    setOverrideReason('');
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Stats Summary */}
      {stats && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
          <Typography variant="subtitle2" gutterBottom>
            Hours Summary
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip
              label={`Weekly: ${stats.currentWeekly?.toFixed(1)} → ${stats.newWeekly?.toFixed(1)}h`}
              color={stats.newWeekly > 40 ? 'error' : stats.newWeekly > 35 ? 'warning' : 'success'}
              size="small"
            />
            <Chip
              label={`Daily: ${stats.currentDaily?.toFixed(1)} → ${stats.newDaily?.toFixed(1)}h`}
              color={stats.newDaily > 12 ? 'error' : stats.newDaily > 8 ? 'warning' : 'success'}
              size="small"
            />
            {stats.consecutiveDays > 0 && (
              <Chip
                label={`Consecutive days: ${stats.consecutiveDays}`}
                color={stats.consecutiveDays >= 7 ? 'error' : stats.consecutiveDays >= 6 ? 'warning' : 'default'}
                size="small"
              />
            )}
          </Box>
        </Paper>
      )}

      {/* Error Messages (Hard Blocks) */}
      {errors && errors.length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          icon={<ErrorIcon />}
        >
          <AlertTitle>Cannot Assign - Compliance Violations</AlertTitle>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.map((error, index) => (
              <li key={index}>
                <strong>{error.type?.replace(/_/g, ' ')}:</strong> {error.message}
                {error.requiresOverride && showOverride && (
                  <Button
                    size="small"
                    color="warning"
                    startIcon={<GavelIcon />}
                    onClick={() => setOverrideDialog(true)}
                    sx={{ ml: 2 }}
                  >
                    Override
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Warning Messages */}
      {warnings && warnings.length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          icon={<WarningIcon />}
        >
          <AlertTitle>Warnings</AlertTitle>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {warnings.map((warning, index) => (
              <li key={index}>
                <strong>{warning.type?.replace(/_/g, ' ')}:</strong> {warning.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* All Good Message */}
      {errors.length === 0 && warnings.length === 0 && allowed && (
        <Alert severity="success" icon={<InfoIcon />}>
          <AlertTitle>Compliance Check Passed</AlertTitle>
          This assignment complies with all labor laws and overtime rules.
        </Alert>
      )}

      {/* Override Dialog */}
      <Dialog open={overrideDialog} onClose={() => setOverrideDialog(false)}>
        <DialogTitle>Override 7-Day Consecutive Work Block</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You are about to override the 7-day consecutive work rule for {staffName}. 
            Please provide a detailed reason for this override.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={3}
            fullWidth
            label="Reason for override"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            helperText="Minimum 10 characters required"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleOverrideSubmit} 
            variant="contained" 
            color="warning"
            disabled={overrideReason.length < 10}
          >
            Submit Override
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OvertimeWarning;