const AI_URL = process.env.REACT_APP_AI_URL || 'http://localhost:8000';

export const search = ({ query, k = 5, category, gender }) =>
  fetch(`${AI_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, k, category, gender }),
  }).then(r => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
