const mongoose = require('mongoose');

// Wall points are stored normalised (0 to 1) so they work at any image size
const wallSchema = new mongoose.Schema(
  {
    points: [{ x: Number, y: Number }],
    colorHex: String,
    colorName: String
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'Untitled room', trim: true },
    originalImage: { type: String, required: true }, // e.g. /uploads/abc.jpg
    resultImage: { type: String, required: true },   // painted preview PNG
    walls: [wallSchema],
    opacity: { type: Number, default: 0.85 },
    blendMode: { type: String, default: 'multiply' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
