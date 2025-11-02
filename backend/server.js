const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500']
}));
app.use(express.json());

let seatHoldTimeouts = {};

const events = {}; // Place to store events and seating layout

// Sample event with seating layout
events['sampleEventId'] = {
    layout: Array.from({ length: 10 }, (_, rowIndex) => (
        Array.from({ length: 16 }, (_, colIndex) => ({
            id: `row${rowIndex}col${colIndex}`,
            category: rowIndex < 3 ? 'VIP' : rowIndex < 6 ? 'Regular' : 'VVIP',
            status: 'available'
        }))
    )),
    bookings: []
};

// Get seats for an event
app.get('/api/events/:id/seats', (req, res) => {
    const eventId = req.params.id;
    res.json(events[eventId]?.layout || []);
});

// Hold seats
app.put('/api/events/:id/seats/hold', (req, res) => {
    const { seatIds } = req.body;
    const eventId = req.params.id;

    seatIds.forEach(seatId => {
        const seat = events[eventId]?.layout.flat().find(s => s.id === seatId);
        if (seat && seat.status === 'available') {
            seat.status = 'held';
            // Start a timeout to release the hold after 10 minutes
            seatHoldTimeouts[seatId] = setTimeout(() => {
                seat.status = 'available';
                delete seatHoldTimeouts[seatId];
            }, 10 * 60 * 1000);
        }
    });

    res.sendStatus(204);
});

// Release seats
app.put('/api/events/:id/seats/release', (req, res) => {
    const { seatIds } = req.body;
    const eventId = req.params.id;

    seatIds.forEach(seatId => {
        const seat = events[eventId]?.layout.flat().find(s => s.id === seatId);
        if (seat && seat.status === 'held') {
            seat.status = 'available';
            clearTimeout(seatHoldTimeouts[seatId]);
            delete seatHoldTimeouts[seatId];
        }
    });

    res.sendStatus(204);
});

// Book seats
app.post('/api/bookings', (req, res) => {
    const { eventId, seatIds } = req.body;
    events[eventId].bookings.push({ seatIds });
    seatIds.forEach(seatId => {
        const seat = events[eventId]?.layout.flat().find(s => s.id === seatId);
        if (seat) {
            seat.status = 'booked';
        }
    });
    res.sendStatus(201);
});

// CRUD operations for events
app.post('/api/events', (req, res) => {
    // logic to create an event
});

app.put('/api/events/:id', (req, res) => {
    // logic to update an event
});

app.delete('/api/events/:id', (req, res) => {
    // logic to delete an event
});

// Atomic file writes using .tmp then renaming
function writeFileAtomic(filePath, data) {
    const tempFilePath = filePath + '.tmp';
    fs.writeFileSync(tempFilePath, data);
    fs.renameSync(tempFilePath, filePath);
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
