import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITimelineEvent {
  stage: string;
  timestamp: Date;
  note?: string;
}

export interface IContract extends Document {
  listingId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  startupId: mongoose.Types.ObjectId;
  timeline: ITimelineEvent[];
  scheduledPickupAt?: Date;
  otpCode?: string; // hashed String
  otpVerifiedAt?: Date;
  greenCreditsAwarded?: number;
  co2SavedKg?: number;
  liveLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  status:
    | "listed"
    | "matched"
    | "requested"
    | "confirmed"
    | "scheduled"
    | "otp_verified"
    | "completed"
    | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema = new Schema<IContract>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "WasteListing",
      required: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startupId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timeline: [
      {
        stage: { type: String, required: true },
        timestamp: { type: Date, required: true },
        note: { type: String },
      },
    ],
    scheduledPickupAt: {
      type: Date,
    },
    otpCode: {
      type: String,
    },
    otpVerifiedAt: {
      type: Date,
    },
    greenCreditsAwarded: {
      type: Number,
    },
    co2SavedKg: {
      type: Number,
    },
    liveLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    status: {
      type: String,
      enum: [
        "listed",
        "matched",
        "requested",
        "confirmed",
        "scheduled",
        "otp_verified",
        "completed",
        "cancelled",
      ],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Database indexes for fast participant filtering and status lifecycle queries
ContractSchema.index({ supplierId: 1, status: 1 });
ContractSchema.index({ startupId: 1, status: 1 });
ContractSchema.index({ status: 1, createdAt: -1 });
ContractSchema.index({ listingId: 1 });

const Contract: Model<IContract> =
  mongoose.models.Contract ||
  mongoose.model<IContract>("Contract", ContractSchema);

export default Contract;
