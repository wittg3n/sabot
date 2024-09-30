const User = require('../database/models/User');
const router = require('express').Router();
const logger = require('../../../config/logger')
const responses = require('../../../config/responses')
router.post('/create', async (req, res) => {
    try {
        const { username, telegramId } = req.body;

        let user = await User.findOne({ telegramId });

        if (user) {
            return res.status(200).json({ message: 'User already exists', user });
        }

        user = new User({
            username,
            telegramId
        });

        await user.save();
        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: responses.server.error });
    }
});

module.exports = router;
