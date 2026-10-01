'use client';

import { useState } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

/**
 * Campo de fecha completamente cliqueable con calendario estilizado.
 * value: string YYYY-MM-DD (o vacío)
 * onChange: (stringYYYYMMDD) => void
 */
export default function DateField({ label, value, onChange, required, disabled, minDate, maxDate, size = 'small', sx }) {
  const [open, setOpen] = useState(false);

  const dayjsValue = value ? dayjs(value) : null;
  const dayjsMin   = minDate ? dayjs(minDate) : undefined;
  const dayjsMax   = maxDate ? dayjs(maxDate) : undefined;

  function handleChange(newVal) {
    if (!newVal || !newVal.isValid()) { onChange(''); return; }
    onChange(newVal.format('YYYY-MM-DD'));
    setOpen(false);
  }

  return (
    <DatePicker
      label={label}
      value={dayjsValue}
      onChange={handleChange}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      minDate={dayjsMin}
      maxDate={dayjsMax}
      disabled={disabled}
      format="DD/MM/YYYY"
      slotProps={{
        textField: {
          required,
          size,
          fullWidth: true,
          sx,
          onClick: () => !disabled && setOpen(true),
          inputProps: { readOnly: true, style: { cursor: disabled ? 'default' : 'pointer' } },
        },
        openPickerButton: { sx: { display: 'none' } },
        day: {
          sx: {
            borderRadius: 2,
            '&.Mui-selected': {
              background: 'linear-gradient(135deg, #1176EF 0%, #4C9BF5 100%)',
              color: '#fff',
              fontWeight: 700,
              '&:hover': { background: 'linear-gradient(135deg, #0B5FCC 0%, #1176EF 100%)' },
            },
            '&:hover:not(.Mui-selected)': {
              backgroundColor: 'rgba(17,118,239,0.1)',
              color: 'primary.main',
            },
            '&.MuiPickersDay-today:not(.Mui-selected)': {
              border: '2px solid #1176EF',
              color: '#1176EF',
              fontWeight: 700,
            },
          },
        },
        popper: {
          sx: {
            '& .MuiPaper-root': {
              border: '1px solid rgba(17,118,239,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              borderRadius: 3,
              overflow: 'hidden',
            },
            '& .MuiPickersCalendarHeader-label': {
              fontWeight: 700,
              fontSize: '0.95rem',
              textTransform: 'capitalize',
            },
            '& .MuiDayCalendar-weekDayLabel': {
              fontWeight: 700,
              fontSize: '0.72rem',
              color: 'text.disabled',
              textTransform: 'uppercase',
            },
            '& .MuiPickersArrowSwitcher-button': {
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'rgba(17,118,239,0.08)' },
            },
            '& .MuiYearCalendar-root .MuiPickersYear-yearButton.Mui-selected': {
              background: 'linear-gradient(135deg, #1176EF 0%, #4C9BF5 100%)',
              color: '#fff',
            },
          },
        },
      }}
    />
  );
}
