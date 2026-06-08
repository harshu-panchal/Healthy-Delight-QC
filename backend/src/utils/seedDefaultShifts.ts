import Shift from "../models/Shift";

const DEFAULT_SHIFTS = [
  {
    name: "Morning",
    startTime: "06:00 AM",
    endTime: "09:00 AM",
    type: "Both",
    isActive: true,
  },
  {
    name: "Evening",
    startTime: "06:00 PM",
    endTime: "09:00 PM",
    type: "Both",
    isActive: true,
  },
];

export async function seedDefaultShifts() {
  try {
    const count = await Shift.countDocuments();
    if (count > 0) {
      console.log("Shifts already exist. Skipping seed.");
      return;
    }

    await Shift.insertMany(DEFAULT_SHIFTS);
    console.log("Default shifts seeded successfully.");
  } catch (error) {
    console.error("Error seeding default shifts:", error);
  }
}
