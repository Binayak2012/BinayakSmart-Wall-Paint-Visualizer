const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const Project = require('../models/Project');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG or WEBP images are allowed'));
  }
});

// Save a project: original photo + painted result + wall data
router.post(
  '/',
  upload.fields([{ name: 'original', maxCount: 1 }, { name: 'result', maxCount: 1 }]),
  async (req, res, next) => {
    try {
      const files = req.files || {};
      if (!files.original || !files.result) {
        return res.status(400).json({ message: 'Both original and result images are required' });
      }
      const project = await Project.create({
        title: req.body.title || 'Untitled room',
        originalImage: '/uploads/' + files.original[0].filename,
        resultImage: '/uploads/' + files.result[0].filename,
        walls: JSON.parse(req.body.walls || '[]'),
        opacity: Number(req.body.opacity) || 0.85,
        blendMode: req.body.blendMode || 'multiply'
      });
      res.status(201).json(project);
    } catch (err) { next(err); }
  }
);

// List saved projects (newest first)
router.get('/', async (req, res, next) => {
  try {
    res.json(await Project.find().sort({ createdAt: -1 }).limit(50));
  } catch (err) { next(err); }
});

// One project (used to reopen it in the visualizer)
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
});

module.exports = router;

