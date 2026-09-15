import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDispute extends Document {
  contractId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  reason: string;
  description: string;
  status: "open" | "resolved" | "rejected";
  resolutionNote?: string;
  createdAt: Date;
  resolvedAt?: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    raisedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {                                                                                                 
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "resolved", "rejected"],
      default: "open",
      required: true,
    },
    resolutionNote: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

DisputeSchema.index({ contractId: 1 });
DisputeSchema.index({ raisedBy: 1 });
DisputeSchema.index({ status: 1 });

const Dispute: Model<IDispute> =
  mongoose.models.Dispute || mongoose.model<IDispute>("Dispute", DisputeSchema);

export default Dispute;
