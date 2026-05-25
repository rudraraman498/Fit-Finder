import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getProduct, addToCart } from '../api/commerceService';

const CATEGORY_GRADIENTS = {
  'Footwear': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'Clothing': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'Outdoor Gear': 'linear-gradient(135deg, #fa8231 0%, #f7b731 100%)',
  'Electronics Accessories': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
};

const CATEGORY_ICONS = {
  'Footwear': '👟',
  'Clothing': '👕',
  'Outdoor Gear': '⛺',
  'Electronics Accessories': '🎧',
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    setLoading(true);
    getProduct(id)
      .then(setProduct)
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const hasSizes = (product?.availableSizes || []).length > 0;
  const canAddToCart = !hasSizes || selectedSize !== '';

  const handleAddToCart = () => {
    addToCart(Number(id), quantity, selectedSize || null)
      .then(() => {
        setSnackbar(true);
        window.dispatchEvent(new Event('cartUpdated'));
      })
      .catch(() => setError('Failed to add to cart.'));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;

  const gradient =
    CATEGORY_GRADIENTS[product.category] ||
    'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)';
  const icon = CATEGORY_ICONS[product.category] || '📦';

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ color: 'text.secondary', mb: 3, '&:hover': { color: 'text.primary' } }}
      >
        Back
      </Button>

      {!product.embeddingReady && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Search indexing in progress — this product will appear in search results shortly.
        </Alert>
      )}

      <Grid container spacing={{ xs: 3, md: 5 }}>
        {/* Left: image placeholder */}
        <Grid item xs={12} md={5}>
          <Box
            sx={{
              background: gradient,
              borderRadius: 2,
              height: { xs: 220, md: 380 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: { xs: '4rem', md: '6rem' },
              position: { md: 'sticky' },
              top: { md: 80 },
            }}
          >
            {icon}
          </Box>
        </Grid>

        {/* Right: details */}
        <Grid item xs={12} md={7}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.7rem',
            }}
          >
            {product.category} · {product.gender}
          </Typography>

          <Typography variant="h3" sx={{ mt: 0.5, mb: 0.75, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
            {product.name}
          </Typography>

          <Typography variant="h4" color="primary" fontWeight={700} sx={{ mb: 3 }}>
            ${Number(product.price).toFixed(2)}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.75, mb: 3 }}
          >
            {product.description}
          </Typography>

          {(product.tags || []).length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
              {product.tags.map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: 'rgba(255,255,255,0.12)' }}
                />
              ))}
            </Box>
          )}

          {/* Size selector */}
          {hasSizes && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem', display: 'block', mb: 1 }}
              >
                Size{selectedSize ? ` — ${selectedSize}` : ''}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {product.availableSizes.map(s => (
                  <Chip
                    key={s}
                    label={s}
                    onClick={() => setSelectedSize(prev => prev === s ? '' : s)}
                    variant={selectedSize === s ? 'filled' : 'outlined'}
                    color={selectedSize === s ? 'primary' : 'default'}
                    sx={{
                      minWidth: 44,
                      fontWeight: selectedSize === s ? 700 : 400,
                      borderColor: 'rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Quantity stepper + Add to Cart */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 1.5,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <IconButton
                size="small"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                sx={{ borderRadius: 0, px: 1.25, py: 1 }}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
              <Typography
                sx={{ px: 2, minWidth: 36, textAlign: 'center', fontWeight: 600, fontSize: '0.95rem' }}
              >
                {quantity}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setQuantity(q => q + 1)}
                sx={{ borderRadius: 0, px: 1.25, py: 1 }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              sx={{ flexGrow: 1, py: 1.5 }}
            >
              {hasSizes && !selectedSize ? 'Select a Size' : 'Add to Cart'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="Added to cart"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
