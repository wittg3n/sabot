require('dotenv').config();

const express = require('express')
const app = express()
const userRouter = require('./api/userRoutes')
const postRouter = require('./api/postRoutes')
const port = process.env.PORT || 3001
const cors = require('cors');
const connectdb = require('./database/db.config')
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const limiter = rateLimit({
    windowMs: 1 * 1000,
    max: 100,
    message: 'شما تعداد زیادی درخواست ارسال کرده‌اید، لطفا بعدا دوباره تلاش کنید'
});

connectdb()
app.use(helmet());

app.use(limiter);

app.use(express.json());
app.use(cors());
app.use('/user', userRouter)
app.use('/post', postRouter)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});
process.on('SIGINT', async() => {
    console.log('Shutting down gracefully...');
    await mongoose.connection.close()
    process.exit(0);
});
const color = require('../config/colors.config');
const { default: mongoose } = require('mongoose');
app.listen(port, () => {
    console.log('back-end is running...'.bgGreen)
})