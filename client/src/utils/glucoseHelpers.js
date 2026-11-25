export const slots = [
  "Morning (fasting)",
  "After breakfast",
  "After lunch",
  "After dinner",
];

const shortSlotLabels = {
  "Morning (fasting)": "Morning",
  "After breakfast": "Breakfast",
  "After lunch": "Lunch",
  "After dinner": "Dinner",
};

export const shortSlot = (slot) => shortSlotLabels[slot] || slot;

export const tone = (value) =>
  value < 70 || value > 180 ? "rose" : value >= 140 ? "amber" : "green";
