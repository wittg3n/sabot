const mongoose = require('mongoose');
const colors = require('../../config/colors.config')
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/sabot');
        console.log('MongoDB connected'.bgGreen);
    } catch (err) {
        console.error('MongoDB connection error:'.bgRed, err);
        process.exit(1);
    }
};

module.exports = connectDB;
