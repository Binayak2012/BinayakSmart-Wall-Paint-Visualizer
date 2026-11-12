const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: {
      type: String,
      required: true,
      match: [/^#[0-9A-Fa-f]{6}$/, 'Hex must look like #RRGGBB']
    },
    brand: { type: String, default: 'Custom', trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Color', colorSchema);
