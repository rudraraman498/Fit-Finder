import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ProductCard from '../components/ProductCard';
import { search } from '../api/aiService';

const CATEGORIES = ['Footwear', 'Clothing', 'Outdoor Gear', 'Electronics Accessories'];
const GENDERS = ["men's", "women's", 'unisex'];
const K_OPTIONS = [5, 10, 15, 20];

const SUGGESTIONS = [
  'waterproof trail running shoes',
  'lightweight insulated jacket',
  'breathable hiking pants',
  'wireless sport earbuds',
  'compression running tights',
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [k, setK] = useState(5);
  const [results, setResults] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setLastQuery(q);
    try {
      const data = await search({
        query: q,
        k,
        category: category || undefined,
        gender: gender || undefined,
      });
      setResults(data.results);
    } catch {
      setError('Search failed. Make sure the AI service is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = c => setCategory(prev => (prev === c ? '' : c));
  const toggleGender = g => setGender(prev => (prev === g ? '' : g));

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, rgba(255,87,34,0.07) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          px: 3,
          pt: { xs: 6, sm: 9 },
          pb: { xs: 4, sm: 6 },
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h2"
          sx={{ mb: 1.5, fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' } }}
        >
          Find Your Fit
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 460, mx: 'auto', lineHeight: 1.6 }}
        >
          Describe what you're looking for in plain English — AI matches you across the full catalog.
        </Typography>

        {/* Search bar */}
        <Box
          sx={{
            maxWidth: 660,
            mx: 'auto',
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
          }}
        >
          <TextField
            fullWidth
            placeholder="e.g. waterproof hiking boots for cold weather…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 1.5, fontSize: '0.95rem', backgroundColor: 'rgba(255,255,255,0.03)' },
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            sx={{ height: 56, px: 3.5, borderRadius: 1.5, flexShrink: 0 }}
          >
            Search
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ mt: 3.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          {/* Category pills */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip
              label="All"
              size="small"
              onClick={() => setCategory('')}
              color={!category ? 'primary' : 'default'}
              variant={!category ? 'filled' : 'outlined'}
            />
            {CATEGORIES.map(c => (
              <Chip
                key={c}
                label={c}
                size="small"
                onClick={() => toggleCategory(c)}
                color={category === c ? 'primary' : 'default'}
                variant={category === c ? 'filled' : 'outlined'}
              />
            ))}
          </Box>

          {/* Gender pills */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip
              label="All genders"
              size="small"
              onClick={() => setGender('')}
              color={!gender ? 'secondary' : 'default'}
              variant={!gender ? 'filled' : 'outlined'}
            />
            {GENDERS.map(g => (
              <Chip
                key={g}
                label={g}
                size="small"
                onClick={() => toggleGender(g)}
                color={gender === g ? 'secondary' : 'default'}
                variant={gender === g ? 'filled' : 'outlined'}
              />
            ))}
          </Box>

          {/* Result count */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              Show
            </Typography>
            {K_OPTIONS.map(opt => (
              <Chip
                key={opt}
                label={opt}
                size="small"
                onClick={() => setK(opt)}
                color={k === opt ? 'default' : 'default'}
                variant={k === opt ? 'filled' : 'outlined'}
                sx={{
                  minWidth: 38,
                  ...(k === opt && { backgroundColor: 'rgba(255,255,255,0.12)', fontWeight: 700 }),
                }}
              />
            ))}
            <Typography variant="caption" color="text.secondary">
              results
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Results */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Skeleton grid while loading */}
        {loading && (
          <Grid container spacing={2}>
            {Array.from({ length: k }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rounded" height={240} />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Results */}
        {!loading && results !== null && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{lastQuery}&rdquo;
            </Typography>
            {results.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                  No matches found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Try rephrasing — be specific about material, activity, or conditions.
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {SUGGESTIONS.map(s => (
                    <Chip
                      key={s}
                      label={s}
                      variant="outlined"
                      size="small"
                      onClick={() => { setQuery(s); handleSearch(s); }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {results.map(r => (
                  <Grid item xs={12} sm={6} md={4} key={r.id}>
                    <ProductCard product={r} score={r.score} />
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}

        {/* Initial empty state */}
        {!loading && results === null && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Try one of these to get started:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {SUGGESTIONS.map(s => (
                <Chip
                  key={s}
                  label={s}
                  variant="outlined"
                  size="small"
                  onClick={() => { setQuery(s); handleSearch(s); }}
                  sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
