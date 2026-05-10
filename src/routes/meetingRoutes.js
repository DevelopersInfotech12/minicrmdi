import express from "express";
import {
  getAllMeetings, getMeetingById, createMeeting,
  updateMeeting, deleteMeeting, updateStatus,
  getUpcoming, getTodayMeetings,
} from "../controllers/meetingController.js";

const router = express.Router();

router.get("/upcoming", getUpcoming);
router.get("/today",    getTodayMeetings);
router.route("/")
  .get(getAllMeetings)
  .post(createMeeting);
router.route("/:id")
  .get(getMeetingById)
  .put(updateMeeting)
  .delete(deleteMeeting);
router.patch("/:id/status", updateStatus);

export default router;
