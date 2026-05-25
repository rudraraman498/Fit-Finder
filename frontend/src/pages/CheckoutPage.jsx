import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import { getCart, placeOrder } from '../api/commerceService';
import { useAuth } from '../context/AuthContext';

// ── Payment utilities ──────────────────────────────────────────────────────────

const luhn = (digits) => {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const getCardType = (digits) => {
  if (/^4/.test(digits))                          return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits))           return 'MC';
  if (/^3[47]/.test(digits))                      return 'AMEX';
  if (/^(6011|65|64[4-9]|622)/.test(digits))      return 'DISCOVER';
  return null;
};

const isExpired = (mmyy) => {
  const [mm, yy] = mmyy.split('/');
  if (!mm || !yy) return true;
  const expiry = new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, 1);
  const now = new Date();
  return expiry < new Date(now.getFullYear(), now.getMonth(), 1);
};

// ── Form state defaults ────────────────────────────────────────────────────────

const EMPTY_SHIPPING = {
  shippingName: '', shippingAddress: '', shippingCity: '',
  shippingState: '', shippingZip: '',
};
const EMPTY_PAYMENT = { cardNumber: '', cardholderName: '', expiry: '', cvv: '' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { auth } = useAuth();
  const [cart, setCart] = useState(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [form, setForm] = useState(EMPTY_SHIPPING);
  const [errors, setErrors] = useState({});
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [paymentErrors, setPaymentErrors] = useState({});
  const [placing, setPlacing] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  const cardDigits = paymentForm.cardNumber.replace(/\s/g, '');
  const cardType   = getCardType(cardDigits);
  const cvvLength  = cardType === 'AMEX' ? 4 : 3;

  useEffect(() => {
    getCart().then(setCart).finally(() => setLoadingCart(false));
  }, []);

  useEffect(() => {
    if (!loadingCart && !auth) navigate('/login?redirect=/checkout');
  }, [auth, loadingCart, navigate]);

  // ── Shipping change ──────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: '' }));
  };

  // ── Payment change (with auto-formatting) ───────────────────────────────────

  const handlePaymentChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cardNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 16);
      value = digits.replace(/(.{4})/g, '$1 ').trim();
    }
    if (name === 'expiry') {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    }
    if (name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, cardType === 'AMEX' ? 4 : 3);
    }
    setPaymentForm(pf => ({ ...pf, [name]: value }));
    if (paymentErrors[name]) setPaymentErrors(pe => ({ ...pe, [name]: '' }));
  };

  // ── Shipping validation ──────────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    if (!form.shippingName.trim())
      e.shippingName = 'Full name is required';
    if (!form.shippingAddress.trim())
      e.shippingAddress = 'Street address is required';
    if (!form.shippingCity.trim())
      e.shippingCity = 'City is required';
    if (!/^[A-Za-z]{2}$/.test(form.shippingState.trim()))
      e.shippingState = 'Enter a 2-letter state code (e.g. CA)';
    if (!/^\d{5}(-\d{4})?$/.test(form.shippingZip.trim()))
      e.shippingZip = 'Enter a valid ZIP (e.g. 12345 or 12345-6789)';
    return e;
  };

  // ── Payment validation ───────────────────────────────────────────────────────

  const validatePayment = () => {
    const e = {};

    // Card number: length + Luhn
    if (cardDigits.length !== 16) {
      e.cardNumber = 'Card number must be 16 digits';
    } else if (!luhn(cardDigits)) {
      e.cardNumber = 'Card number is invalid';
    }

    if (!paymentForm.cardholderName.trim())
      e.cardholderName = 'Cardholder name is required';

    // Expiry: format + not in the past
    if (!/^\d{2}\/\d{2}$/.test(paymentForm.expiry)) {
      e.expiry = 'Use MM/YY format';
    } else {
      const [mm] = paymentForm.expiry.split('/');
      if (parseInt(mm, 10) < 1 || parseInt(mm, 10) > 12) {
        e.expiry = 'Invalid month';
      } else if (isExpired(paymentForm.expiry)) {
        e.expiry = 'Card has expired';
      }
    }

    // CVV: 3 digits normally, 4 for Amex
    const cvvRegex = cardType === 'AMEX' ? /^\d{4}$/ : /^\d{3}$/;
    if (!cvvRegex.test(paymentForm.cvv))
      e.cvv = `CVV must be ${cvvLength} digits${cardType === 'AMEX' ? ' for Amex' : ''}`;

    return e;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs  = validate();
    const pErrs = validatePayment();
    if (Object.keys(errs).length > 0)  { setErrors(errs);         return; }
    if (Object.keys(pErrs).length > 0) { setPaymentErrors(pErrs); return; }

    // Simulated decline card
    if (cardDigits === '4000000000000002') {
      setApiError('Your card was declined.');
      return;
    }

    setPlacing(true);
    setApiError('');
    try {
      const order = await placeOrder({ ...form, paymentLastFour: cardDigits.slice(-4) });
      navigate(`/orders/${order.id}/confirmation`);
    } catch (err) {
      setApiError(err.message || 'Failed to place order. Please try again.');
      setPlacing(false);
    }
  };

  // ── Render guards ─────────────────────────────────────────────────────────────

  if (loadingCart) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 3, py: 8, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>Your cart is empty.</Typography>
        <Button variant="contained" onClick={() => navigate('/products')}>Browse Products</Button>
      </Box>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: 3, py: 4 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>Checkout</Typography>

      <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>

        {/* ── Left: Shipping + Payment form ─────────────────────────────────── */}
        <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1 }}>

          {/* Shipping */}
          <Typography variant="subtitle2" color="text.secondary"
            sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
            Shipping Information
          </Typography>

          <TextField
            fullWidth label="Full Name" name="shippingName"
            value={form.shippingName} onChange={handleChange}
            error={!!errors.shippingName} helperText={errors.shippingName}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Street Address" name="shippingAddress"
            value={form.shippingAddress} onChange={handleChange}
            error={!!errors.shippingAddress} helperText={errors.shippingAddress}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="City" name="shippingCity"
                value={form.shippingCity} onChange={handleChange}
                error={!!errors.shippingCity} helperText={errors.shippingCity}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth label="State" name="shippingState"
                value={form.shippingState} onChange={handleChange}
                error={!!errors.shippingState} helperText={errors.shippingState}
                inputProps={{ maxLength: 2 }}
                placeholder="CA"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth label="ZIP" name="shippingZip"
                value={form.shippingZip} onChange={handleChange}
                error={!!errors.shippingZip} helperText={errors.shippingZip}
                inputProps={{ maxLength: 10 }}
                placeholder="12345"
              />
            </Grid>
          </Grid>

          {/* Payment */}
          <Typography variant="subtitle2" color="text.secondary"
            sx={{ mt: 3, mb: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
            Payment Information
          </Typography>

          <TextField
            fullWidth label="Card Number" name="cardNumber"
            value={paymentForm.cardNumber} onChange={handlePaymentChange}
            error={!!paymentErrors.cardNumber} helperText={paymentErrors.cardNumber}
            placeholder="1234 5678 9012 3456"
            inputProps={{ inputMode: 'numeric', maxLength: 19 }}
            InputProps={{
              endAdornment: cardType && (
                <InputAdornment position="end">
                  <Chip
                    label={cardType}
                    size="small"
                    sx={{
                      fontSize: '0.65rem', height: 20, fontWeight: 700,
                      bgcolor: 'rgba(255,255,255,0.08)',
                      color: cardType === 'VISA' ? '#1a73e8'
                           : cardType === 'MC'   ? '#eb5757'
                           : cardType === 'AMEX' ? '#2e7d32'
                           : '#f57c00',
                    }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Cardholder Name" name="cardholderName"
            value={paymentForm.cardholderName} onChange={handlePaymentChange}
            error={!!paymentErrors.cardholderName} helperText={paymentErrors.cardholderName}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Expiry (MM/YY)" name="expiry"
                value={paymentForm.expiry} onChange={handlePaymentChange}
                error={!!paymentErrors.expiry} helperText={paymentErrors.expiry}
                placeholder="MM/YY"
                inputProps={{ inputMode: 'numeric', maxLength: 5 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth label={`CVV (${cvvLength} digits)`} name="cvv"
                value={paymentForm.cvv} onChange={handlePaymentChange}
                error={!!paymentErrors.cvv} helperText={paymentErrors.cvv}
                inputProps={{ inputMode: 'numeric', maxLength: cvvLength }}
              />
            </Grid>
          </Grid>

          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

          <Button
            type="submit" variant="contained" size="large" fullWidth
            disabled={placing} sx={{ py: 1.5 }}
          >
            {placing ? <CircularProgress size={22} color="inherit" /> : 'Place Order'}
          </Button>
          <Button
            variant="text" fullWidth onClick={() => navigate('/cart')}
            sx={{ mt: 1, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            Back to Cart
          </Button>
        </Box>

        {/* ── Right: Order summary ───────────────────────────────────────────── */}
        <Box sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0 }}>
          <Typography variant="subtitle2" color="text.secondary"
            sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
            Order Summary
          </Typography>
          <Box sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
            {cart.items.map((item, i) => (
              <React.Fragment key={`${item.productId}:${item.size ?? ''}`}>
                {i > 0 && <Divider />}
                <Box sx={{ px: 2.5, py: 1.75, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              <Typography variant="body2" color="text.secondary">Shipping</Typography>
              <Typography variant="body2" color="secondary.main" fontWeight={500}>Free</Typography>
            </Box>
            <Divider />
            <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight={700}>Total</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                ${Number(cart.total).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
