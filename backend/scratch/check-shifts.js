const mongoose = require('mongoose');
require('dotenv').config();

const shiftSchema = new mongoose.Schema({}, { strict: false });
const Shift = mongoose.model('Shift', shiftSchema, 'shifts');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const shifts = await Shift.find();
    console.log(`Found ${shifts.length} shifts:`);
    shifts.forEach(s => {
        console.log(`- Shift: "${s.name}", startTime: "${s.startTime}", endTime: "${s.endTime}", isActive: ${s.isActive}`);
    });

    await mongoose.disconnect();
}

check().catch(console.error);
