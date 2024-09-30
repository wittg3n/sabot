module.exports = {
    startTimeOptions: [
        [
            { text: '0', callback_data: 'start_time_0' },
            { text: '00:30', callback_data: 'start_time_30' },
            { text: '01:00', callback_data: 'start_time_60' },
            { text: '01:30', callback_data: 'start_time_90' }
        ]
    ],
    durationOptions: [
        [
            { text: '00:30', callback_data: 'duration_30' },
            { text: '01:00', callback_data: 'duration_60' },
            { text: '01:30', callback_data: 'duration_90' },
            { text: '02:00', callback_data: 'duration_120' }
        ]
    ]
};
