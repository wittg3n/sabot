const User = require('../database/models/User');
const router = require('express').Router();
const responses = require('../../config/responses');
const { body, param, query, validationResult } = require('express-validator');

router.post('/create', [
    body('username').isString().withMessage('نام کاربری معتبر نیست'),
    body('telegramId').isInt().withMessage('آیدی تلگرام باید عددی باشد')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, telegramId } = req.body;

        let user = await User.findOne({ telegramId });

        if (user) {
            return res.status(200).json({ message: 'کاربر قبلاً وجود دارد', user });
        }

        user = new User({
            username,
            telegramId
        });

        await user.save();
        res.status(201).json({ message: 'کاربر با موفقیت ایجاد شد', user });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: responses.server.error });
    }
});

router.get('/get_all_channels/:telegramId', [
    param('telegramId').isString().withMessage('آیدی تلگرام معتبر نیست') // Use param to validate the URL parameter
], async (req, res) => {
    const errors = validationResult(req); // Check for validation errors
    if (!errors.isEmpty()) {
        console.log(`happens on get_all_channels`)
        return res.status(400).json({ errors: errors.array() });
    }
    const telegramId = req.params.telegramId; // Use req.params to get the parameter from the URL
    
    try {
        const user = await User.findOne({ telegramId });
        if (!user || !user.channels.length) {
            console.log('in get all channels')
            return res.status(200).json({ message: 'کانالی یافت نشد' });
        }

        res.status(200).json({ channels: user.channels });
    } catch (error) {
        res.status(500).json({ message: 'خطا در جستجوی کانال', err: error });
    }
});

router.get('/add_channel', [
    query('telegramId').isString().withMessage('آیدی تلگرام معتبر نیست'),
    query('channelId').isString().withMessage('آیدی کانال معتبر نیست'),
    query('channelName').isString().withMessage('نام کانال معتبر نیست')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array())
        return res.status(400).json({ errors: errors.array() });
    }

    const { telegramId, channelId, channelName } = req.query;

    try {
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
        res.status(500).json({ message: 'خطا در افزودن کانال' });
    }
});


module.exports = router;
