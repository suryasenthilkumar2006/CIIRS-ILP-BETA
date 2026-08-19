import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGreenCredit extends Document {
  userId: mongoose.Types.ObjectId;
  contractId?: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const GreenCreditSchema = new Schema<IGreenCredit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

GreenCreditSchema.index({ userId: 1 });

const GreenCredit: Model<IGreenCredit> =
  mongoose.models.GreenCredit ||
  mongoose.model<IGreenCredit>("GreenCredit", GreenCreditSchema);

export default GreenCredit;
