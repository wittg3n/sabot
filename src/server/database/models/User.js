const mongoose = require('mongoose')
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
    files: [{
        fileType: {
            type: String,
            required: true,
            enum: ['audio', 'image']
        },
        fileId: {
            type: String,
            required: true
        },
        fileSize: Number,
        uploadDate: {
            type: Date,
            default: Date.now,
        }
    }],
    status: {
        type: String,
        enum: ['active', 'banned', 'suspended'],
        default: 'active'
    },
    actionCount: {
        uploads: {
            type: Number,
            default: 0
        },
        commandsUsed: {
            type: Number,
            default: 0
        }
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    channelsToSubscribe: [{
        channelId: { type: String, required: true },
        isMember: { type: Boolean, default: false }
    }]
})

module.exports = mongoose.model('User', userSchema)