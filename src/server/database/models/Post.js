const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true,
    },
    musicFileId: {
        type: String,
        required: true,
    },
    caption: {
        type: String,
        required: true,
    },
    voiceFileId: {
        type: String,
        required: true,
    },
    imageFileId: {
        type: String,
        required: true,
    },
    dateSent: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
