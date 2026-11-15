const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const gigRoutes = require('./routes/gigRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { config } = require('./config/env');
const { sanitise } = require('./middleware/sanitise');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

// first, so that responses from rate limiters and route guards are logged too
app.use(requestLogger);

   app.use(helmet({
     contentSecurityPolicy: {
       useDefaults: true,
       directives: {
         defaultSrc: ["'self'"],
         objectSrc: ["'none'"],
         frameAncestors: ["'none'"],
         baseUri: ["'self'"],
       },
     },
     frameguard: { action: 'deny' },
   }));

app.use(cors({
  origin: config.clientOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Retry-After', 'RateLimit', 'RateLimit-Policy'],
}));

app.use(express.json({ limit: '10kb' })); // Limit the size of the request body
app.use(sanitise);

app.get('/', (req, res) => res.send('API is running'));
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'HustleHub+ API is running' });
});

app.use(authRoutes);
app.use(profileRoutes);
app.use(gigRoutes);
app.use(userRoutes);
app.use(bookingRoutes);
app.use(incomeRoutes);
app.use((req, res) => res.status(404).json({ error: 'Not found' })); // catch-all for any route that doesn't match the above

// must stay last, and must keep all four parameters or express won't treat it as an
// error handler.
app.use(errorHandler);

module.exports = app;