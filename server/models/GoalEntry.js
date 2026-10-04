const mongoose = require("mongoose");

const goalEntrySchema = new mongoose.Schema(
  {
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // A habit check-in or a quantity added toward a target.
    value: {
      type: Number,
      required: true,
      min: 0.01,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // The date in the user's local timezone, e.g. "2026-10-03".
    // This lets the API calculate day-based streaks without treating a
    // late-night local check-in as belonging to the next UTC date.
    localDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  {
    timestamps: true,
    collection: "goalEntries",
  },
);

goalEntrySchema.index({ user: 1, goal: 1, occurredAt: -1 });
// One entry per goal per day; createEntry sums same-day logs into it.
goalEntrySchema.index({ goal: 1, localDate: 1 }, { unique: true });

module.exports = mongoose.model("GoalEntry", goalEntrySchema);