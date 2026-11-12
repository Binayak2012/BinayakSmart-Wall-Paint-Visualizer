const express = require('express');
const Color = require('../models/Color');


const router = express.Router();

// Public: the visualizer needs the palette
router.get('/', async (req, res, next) => {
  try {
    res.json(await Color.find().sort({ brand: 1, name: 1 }));
  } catch (err) { next(err); }
});


module.exports = router;

