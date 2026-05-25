import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

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

function matchColor(score) {
  if (score >= 0.8) return '#FF5722';
  if (score >= 0.6) return '#FF8A65';
  return '#546e7a';
}

export default function ProductCard({ product, score }) {
  const navigate = useNavigate();
  const gradient =
    CATEGORY_GRADIENTS[product.category] ||
    'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)';
  const icon = CATEGORY_ICONS[product.category] || '📦';

  const visibleTags = (product.tags || []).slice(0, 3);
  const extraCount = Math.max(0, (product.tags || []).length - 3);

  return (
    <Card
      onClick={() => navigate(`/products/${product.id}`)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        borderLeft: score !== undefined
          ? `3px solid ${matchColor(score)}`
          : '3px solid transparent',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          borderColor: score !== undefined ? matchColor(score) : 'rgba(255,255,255,0.15)',
        },
      }}
    >
      {/* Category banner */}
      <Box
        sx={{
          background: gradient,
          height: 76,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <CardContent sx={{ flexGrow: 1, pt: 1.5, pb: '12px !important', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: '0.67rem',
            }}
          >
            {product.category} · {product.gender}
          </Typography>
          {score !== undefined && (
            <Typography
              variant="caption"
              sx={{ color: matchColor(score), fontWeight: 700, fontSize: '0.68rem' }}
            >
              {(score * 100).toFixed(0)}%
            </Typography>
          )}
        </Box>

        <Typography
          variant="body1"
          sx={{ fontWeight: 600, fontSize: '0.92rem', lineHeight: 1.35, flexGrow: 1 }}
        >
          {product.name}
        </Typography>

        <Typography
          color="primary"
          sx={{ fontWeight: 700, fontSize: '1.05rem', mt: 0.25 }}
        >
          ${Number(product.price).toFixed(2)}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {visibleTags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.62rem', height: 18, borderColor: 'rgba(255,255,255,0.1)' }}
            />
          ))}
          {extraCount > 0 && (
            <Chip
              label={`+${extraCount}`}
              size="small"
              sx={{ fontSize: '0.62rem', height: 18, opacity: 0.5 }}
            />
          )}
          {product.embeddingReady === false && (
            <Chip label="Indexing…" size="small" color="warning" sx={{ fontSize: '0.62rem', height: 18 }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
