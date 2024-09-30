const User = require('../database/models/User');
const router = require('express').Router();
const logger = require('../../config/logger')
const responses = require('../../config/responses');
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
router.get('/get_all_channles/:telegramid', async (req, res) => {
    const telegramId = req.params.telegramid
    try {
        const user = await User.findOne({ telegramId })
        if (!user || !user.channels.length) {
            res.status(404).json({
                message: 'کانالی یافت نشد'
            })
            res.status(200).json({
                message: user.channels
            })
        }
    } catch (error) {
        res.status(500).json({
            message: 'خطا در جستو جوی کانال',
            err: error
        })
    }
})
router.get('/add_channel', async (req, res) => {
    const { telegramId, channelId, channelName } = req.query;

    try {
        if (!telegramId || !channelId || !channelName) {
            return res.status(400).json({ message: 'تمام پارامترها الزامی هستند (telegramId، channelId، channelName)' });
        }

        const user = await User.findOne({ telegramId });

        if (!user) {
            return res.status(404).json({ message: 'کاربر یافت نشد' });
        }

        const channelExists = user.channels.find(channel => channel.id === channelId);

        if (channelExists) {
            return res.status(400).json({ message: 'این کانال قبلاً اضافه شده است' });
        }

        user.channels.push({ id: channelId, name: channelName });
        await user.save();

        res.status(200).json({ message: 'کانال با موفقیت اضافه شد', channels: user.channels });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'خطا در افزودن کانال' });
    }
});
module.exports = router;
