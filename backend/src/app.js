const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const v1Router = require('./routes/v1');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

app.use('/api/v1', v1Router);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
