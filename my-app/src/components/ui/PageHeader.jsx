import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function PageHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ color: 'text.primary', letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actionLabel && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAction}
          sx={{ flexShrink: 0 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
