const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    telegramId: {
        type: String,
        required: true, // Ensure telegramId is required
    },
    musicFileId: {
        type: String,
        required: true, // Store the music file ID
    },
    caption: {
        type: String,
        required: true, // Caption of the post
    },
    voiceFileId: {
        type: String,
        required: true, // Store the voice file ID
    },
    imageFileId: {
        type: String,
        required: true, // Store the image file ID
    },
    dateSent: {
        type: Date,
        default: Date.now, // Automatically set to current date
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
