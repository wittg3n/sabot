const express = require('express')
const app = express()
const userRouter = require('./api/userRoutes')
const port = process.env.PORT || 3001
const cors = require('cors');
const connectdb = require('./database/db.config')


connectdb()



app.use(express.json());
app.use(cors());
app.use('/user', userRouter)

const color = require('../../config/colors.config')
app.listen(port, () => {
    console.log('back-end is running...'.bgGreen)
})