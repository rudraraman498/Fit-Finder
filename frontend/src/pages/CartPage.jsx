import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { getCart, removeFromCart } from '../api/commerceService';

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getCart().then(setCart).finally(() => setLoading(false));
  }, []);

  const handleRemove = (productId, size) => {
    removeFromCart(productId, size).then(setCart);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 3, py: 4 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
        Your Cart
      </Typography>

      {isEmpty ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <ShoppingBagIcon
            sx={{ fontSize: 72, color: 'text.secondary', opacity: 0.2, mb: 2, display: 'block', mx: 'auto' }}
          />
          <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 3 }}>
            Your cart is empty
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/products')}>
            Browse Products
          </Button>
        </Box>
      ) : (
        <>
          {/* Items list */}
          <Box
            sx={{
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 3,
            }}
          >
            {cart.items.map((item, i) => (
              <React.Fragment key={`${item.productId}:${item.size ?? ''}`}>
                {i > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2.5,
                    py: 2,
                    gap: 2,
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.size && <><strong>{item.size}</strong> &middot; </>}
                      ${Number(item.price).toFixed(2)} &times; {item.quantity}
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight={700} color="primary" sx={{ flexShrink: 0 }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemove(item.productId, item.size)}
                    sx={{
                      color: 'text.secondary',
                      flexShrink: 0,
                      '&:hover': { color: 'error.main' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </React.Fragment>
            ))}
          </Box>

          {/* Order summary */}
          <Box
            sx={{
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 2,
              p: 2.5,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
              Order Summary
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="text.secondary" variant="body2">
                Subtotal ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                ${Number(cart.total).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography color="text.secondary" variant="body2">Shipping</Typography>
              <Typography variant="body2" color="secondary.main" fontWeight={500}>Free</Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>Total</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                ${Number(cart.total).toFixed(2)}
              </Typography>
            </Box>

            <Button variant="contained" size="large" fullWidth sx={{ py: 1.5, mb: 1.5 }} onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </Button>
            <Button
              variant="text"
              fullWidth
              onClick={() => navigate('/products')}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Continue Shopping
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
