'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export default function SearchBar({
  defaultValue = '',
  placeholder = 'Search rice, oil, eggs…',
  autoFocus = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    // Submitting on Enter keeps this usable without JavaScript-heavy typeahead,
    // which matters on a 2G connection.
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }

  return (
    <Paper
      component="form"
      onSubmit={submit}
      role="search"
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2.5,
        bgcolor: 'background.paper',
      }}
    >
      <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
      <InputBase
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputProps={{ 'aria-label': 'Search products', enterKeyHint: 'search' }}
        sx={{ flex: 1, fontSize: 15 }}
      />
      {value ? (
        <IconButton size="small" aria-label="Clear search" onClick={() => setValue('')}>
          <ClearIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Paper>
  );
}
