import multer from "multer";
import path from "path";

// Storage location
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/doctors/"); // store doctor images here
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + file.fieldname + ext); // unique filename
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only jpg, jpeg, png allowed"));
  }
});

export default upload;
