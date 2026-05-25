import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { getOrders } from '../api/commerceService';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  if (orders.length === 0) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 3, py: 10, textAlign: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 72, color: 'text.secondary', opacity: 0.2, mb: 2, display: 'block', mx: 'auto' }} />
        <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 3 }}>
          No orders yet
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/products')}>
          Start Shopping
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 3, py: 4 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>Your Orders</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {orders.map(order => (
          <Box
            key={order.id}
            sx={{
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 2,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: 'rgba(255,255,255,0.18)' },
            }}
            onClick={() => navigate(`/orders/${order.id}/confirmation`)}
          >
            <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="body1" fontWeight={600}>Order #{order.id}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Chip
                  label={order.status}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
                <Typography variant="body1" fontWeight={700} color="primary">
                  ${Number(order.total).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Divider />

            <Box sx={{ px: 2.5, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {order.items.map(i => `${i.name}${i.size ? ` (${i.size})` : ''}`).join(', ')}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
