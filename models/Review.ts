import mongoose, { Document, Model, Schema } from "mongoose";

export interface IReview extends Document {
  contractId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  revieweeId: mongoose.Types.ObjectId;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      unique: true, // One review per contract
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    revieweeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index on revieweeId for fast average-rating lookups
ReviewSchema.index({ revieweeId: 1 });

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
