const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    // "day" means a daily target; "week" means a weekly target.
    period: {
      type: String,
      enum: ["day", "week"],
      default: "day",
    },
    targetValue: {
      type: Number,
      min: 0.01,
      default: 1,
    },
    // Examples: "times", "minutes", "km", "questions".
    unit: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "times",
    },
    // Optional scheduled days: Sunday = 0, Monday = 1, etc.
    daysOfWeek: {
      type: [Number],
      default: [],
      validate: {
        validator(days) {
          return days.every(
            (day) => Number.isInteger(day) && day >= 0 && day <= 6,
          );
        },
        message: "Scheduled days must be numbers from 0 to 6.",
      },
    },
  },
  { _id: false },
);

const targetSchema = new mongoose.Schema(
  {
    targetValue: {
      type: Number,
      required: true,
      min: 0.01,
    },
    // Examples: "km", "hours", "pages", "dollars".
    unit: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    period: {
      type: String,
      enum: ["total", "day", "week", "month"],
      default: "total",
    },
  },
  { _id: false },
);

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentGoal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
      index: true,
    },
    rootGoal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    trackingType: {
      type: String,
      enum: ["milestones", "habit", "target"],
      default: "milestones",
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    // Used by milestone goals. Groups with child goals derive their progress
    // from those children in the API layer.
    completed: {
      type: Boolean,
      default: false,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    habit: {
      type: habitSchema,
      default: undefined,
    },
    target: {
      type: targetSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: "goals",
  },
);

goalSchema.pre("validate", function setRootGoal() {
  // A root goal points to itself. Child creation should assign the parent's
  // rootGoal so the API can fetch a complete tree efficiently.
  if (!this.rootGoal) {
    this.rootGoal = this.parentGoal || this._id;
  }
});

goalSchema.index({ user: 1, parentGoal: 1, createdAt: -1 });
goalSchema.index({ user: 1, rootGoal: 1 });

module.exports = mongoose.model("Goal", goalSchema);