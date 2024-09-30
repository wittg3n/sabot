const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String
    },
    telegramId: {
        type: Number,
        unique: true
    },
    channels: [{
        type: String
    }],
    post: [{
        type: String,
        required: true 
    }],
    status: {
        type: String,
        enum: ['active', 'banned', 'suspended'],
        default: 'active'
    },
    isSubscribed: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', userSchema);
