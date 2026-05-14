const mongoose = require('mongoose');

const normalizeTags = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((v) => String(v).trim().toLowerCase()).filter(Boolean))];
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toPositiveNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

module.exports = {
  normalizeTags,
  isValidObjectId,
  toPositiveNumber,
};
