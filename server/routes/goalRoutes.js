const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const goals = require("../controllers/goalController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", goals.getGoals);
router.post("/", goals.createGoal);
router.get("/:id", goals.getGoal);
router.post("/:id/subgoals", goals.createSubgoal);
router.patch("/:id", goals.updateGoal);
router.delete("/:id", goals.deleteGoal);

router.post("/:id/entries", goals.createEntry);
router.patch("/:id/entries/:entryId", goals.updateEntry);
router.delete("/:id/entries/:entryId", goals.deleteEntry);

module.exports = router;