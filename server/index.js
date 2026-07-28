const express = require('express');
const path = require('path');
const outputRoutes = require('./routes/output');
const consoleRoutes = require('./routes/console');
const apiRoutes = require('./routes/api');
const debugRoutes = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/', outputRoutes);
app.use('/', consoleRoutes);
app.use('/api', apiRoutes);
app.use('/', debugRoutes);

app.get('/text-display', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'text-display.html'));
});

app.listen(PORT, () => {
  console.log(`DevStream running on http://localhost:${PORT}`);
});
