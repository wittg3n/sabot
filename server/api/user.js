const User = require('../database/users');
const router = require('express').Router();

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
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/uploadaudiofile', async (req, res) => {
    try {

    } catch (error) {

    }
});
router.get('/getaudiofiles/:telegramId', async (req, res) => {
    try {

        const telegramId = req.params.telegramId
        console.log(telegramId)
        const user = await User.findOne({ telegramId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ audioFiles: user.audioFiles });
    } catch (error) {
        console.error('Error fetching audio files:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})
module.exports = router;
