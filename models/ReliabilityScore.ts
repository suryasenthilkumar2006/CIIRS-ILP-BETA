import mongoose, { Document, Model, Schema } from "mongoose";

export interface IReliabilityScore extends Document {
  userId: mongoose.Types.ObjectId;
  score: number; // 0-850
  lastCalculatedAt: Date;
  factors: {
    onTimeRate: number;
    cancellationRate: number;
    avgResponseTime: number;
    disputeRate: number;
    volumeConsistency: number;
    completionRate: number;
    verifiedTransactionCount: number;
    tenureMonths: number;
    avgRating: number;
    recurringContractRate: number;
    disputeResolutionRate: number;
    photoAccuracyRate: number;
  };
  history: {
    score: number;
    date: Date;
  }[];
}

const ReliabilityScoreSchema = new Schema<IReliabilityScore>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Unique index on userId (one score record per user)
    },
    score: {
      type: Number,
      min: 0,
      max: 850,
      required: true,
    },
    lastCalculatedAt: {
      type: Date,
      required: true,
    },
    factors: {
      onTimeRate: { type: Number, required: true },
      cancellationRate: { type: Number, required: true },
      avgResponseTime: { type: Number, required: true },
      disputeRate: { type: Number, required: true },
      volumeConsistency: { type: Number, required: true },
      completionRate: { type: Number, required: true },
      verifiedTransactionCount: { type: Number, required: true },
      tenureMonths: { type: Number, required: true },
      avgRating: { type: Number, required: true },
      recurringContractRate: { type: Number, required: true },
      disputeResolutionRate: { type: Number, required: true },
      photoAccuracyRate: { type: Number, required: true },
    },
    history: [
      {
        score: { type: Number, required: true },
        date: { type: Date, required: true },
      },
    ],
  },
  {
    timestamps: true, // Optional but good practice to keep createdAt/updatedAt
  }
);

const ReliabilityScore: Model<IReliabilityScore> =
  mongoose.models.ReliabilityScore ||
  mongoose.model<IReliabilityScore>("ReliabilityScore", ReliabilityScoreSchema);

export default ReliabilityScore;
