import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../api/commerceService';

const CATEGORIES = ['Footwear', 'Clothing', 'Outdoor Gear', 'Electronics Accessories'];
const GENDERS = ["men's", "women's", 'unisex'];
const PAGE_SIZE = 12;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getProducts(page, PAGE_SIZE, category || undefined, gender || undefined)
      .then(data => {
        setProducts(data.products);
        setTotal(data.totalPages);
      })
      .catch(() => setError('Failed to load products.'))
      .finally(() => setLoading(false));
  }, [page, category, gender]);

  const toggleCategory = c => {
    setCategory(prev => (prev === c ? '' : c));
    setPage(0);
  };

  const toggleGender = g => {
    setGender(prev => (prev === g ? '' : g));
    setPage(0);
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 4 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Products
      </Typography>

      {/* Filter pills */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            size="small"
            onClick={() => { setCategory(''); setPage(0); }}
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
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label="All genders"
            size="small"
            onClick={() => { setGender(''); setPage(0); }}
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
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={240} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            {products.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <ProductCard product={p} />
              </Grid>
            ))}
          </Grid>

          {total > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
              <Pagination
                count={total}
                page={page + 1}
                onChange={(_, v) => setPage(v - 1)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
