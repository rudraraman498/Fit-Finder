import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import { getOrder } from '../api/commerceService';

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getOrder(id).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  if (!order) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 3, py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">Order not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', px: 3, py: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>Order Confirmed!</Typography>
        <Typography variant="body1" color="text.secondary">
          Thank you for your purchase. Your order #{order.id} has been placed.
        </Typography>
      </Box>

      {/* Shipping */}
      <Box sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, p: 2.5, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
          Shipping To
        </Typography>
        <Typography variant="body2" fontWeight={600}>{order.shippingName}</Typography>
        <Typography variant="body2" color="text.secondary">{order.shippingAddress}</Typography>
        <Typography variant="body2" color="text.secondary">
          {order.shippingCity}, {order.shippingState} {order.shippingZip}
        </Typography>
        {order.paymentLast4 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Paid &middot; Card ending in {order.paymentLast4}
          </Typography>
        )}
      </Box>

      {/* Items */}
      <Box sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
            Items
          </Typography>
        </Box>
        <Divider />
        {order.items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Divider />}
            <Box sx={{ px: 2.5, py: 1.75, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.size && <>{item.size} &middot; </>}qty {item.quantity}
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={600} color="primary" sx={{ flexShrink: 0 }}>
                ${(item.price * item.quantity).toFixed(2)}
              </Typography>
            </Box>
          </React.Fragment>
        ))}
        <Divider />
        <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>Total</Typography>
          <Typography variant="h6" fontWeight={700} color="primary">
            ${Number(order.total).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button variant="contained" size="large" fullWidth onClick={() => navigate('/products')}>
          Continue Shopping
        </Button>
        <Button variant="outlined" size="large" fullWidth onClick={() => navigate('/orders')}
          sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'text.primary', '&:hover': { borderColor: 'rgba(255,255,255,0.35)' } }}>
          View All Orders
        </Button>
      </Box>
    </Box>
  );
}
