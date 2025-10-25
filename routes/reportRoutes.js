// routes/reports.js
import express from "express";
import Report from "../models/Report.js";

const router = express.Router();

/* ---------------------------
   Helper: Clean Request Body
---------------------------- */
function cleanReportData(body) {
  return {
    ...body,
    age:
      body.age === "" || body.age === undefined || body.age === null
        ? undefined
        : Number(body.age),
    daysToAttend:
      body.daysToAttend === "" ||
      body.daysToAttend === undefined ||
      body.daysToAttend === null
        ? undefined
        : Number(body.daysToAttend),
    nextSessionDate:
      body.nextSessionDate === "" ? undefined : new Date(body.nextSessionDate),
    attendedDate:
      body.attendedDate === "" ? undefined : new Date(body.attendedDate),
  };
}

/* ---------------------------
   GET all reports
---------------------------- */
router.get("/", async (req, res) => {
  try {
    const reports = await Report.find();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------------------
   CREATE new report
---------------------------- */
router.post("/", async (req, res) => {
  try {
    const cleanBody = cleanReportData(req.body);
    const report = new Report(cleanBody);
    await report.save();

    res.status(201).json(report);
  } catch (err) {
    console.error("Save error:", err);
    res.status(400).json({ message: err.message });
  }
});

/* ---------------------------
   UPDATE report
---------------------------- */
router.put("/:id", async (req, res) => {
  try {
    const cleanBody = cleanReportData(req.body);
    const report = await Report.findByIdAndUpdate(req.params.id, cleanBody, {
      new: true,
    });

    res.json(report);
  } catch (err) {
    console.error("Update error:", err);
    res.status(400).json({ message: err.message });
  }
});

/* ---------------------------
   DELETE report
---------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: "Report deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
