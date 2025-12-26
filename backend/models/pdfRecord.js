import mongoose from "mongoose";

const TaxSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Chat history
  messages: [
    {
      sender: String,
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Interview answers
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // W-2 / 1099 extracted data
  forms: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Refund history
  refundHistory: [
    {
      amount: Number,
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Current interview step
  stepIndex: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("TaxSession", TaxSessionSchema);
