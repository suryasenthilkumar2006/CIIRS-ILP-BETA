import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWasteListing extends Document {
  supplierId: mongoose.Types.ObjectId;
  wasteType: string;
  subType?: string;
  quantityKg: number;
  unit: string;
  photoUrls: string[];
  aiGrading?: {
    grade: string;
    contaminationLevel: string;
    confidence: number;
    rawResponse: string;
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
  priceEstimate?: number;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  availableFrom: Date;
  isRecurring: boolean;
  recurrencePattern?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WasteListingSchema = new Schema<IWasteListing>(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    wasteType: {
      type: String,
      required: true,
    },
    subType: {
      type: String,
    },
    quantityKg: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    photoUrls: {
      type: [String],
      default: [],
    },
    aiGrading: {
      grade: { type: String },
      contaminationLevel: { type: String },
      confidence: { type: Number },
      rawResponse: { type: String },
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
      default: "listed",
      required: true,
    },
    priceEstimate: {
      type: Number,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    availableFrom: {
      type: Date,
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
      required: true,
    },
    recurrencePattern: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

WasteListingSchema.index({ location: "2dsphere" });
WasteListingSchema.index({ status: 1 });
WasteListingSchema.index({ supplierId: 1, status: 1 });
WasteListingSchema.index({ wasteType: 1, status: 1 });
WasteListingSchema.index({ status: 1, createdAt: -1 });

const WasteListing: Model<IWasteListing> =
  mongoose.models.WasteListing ||
  mongoose.model<IWasteListing>("WasteListing", WasteListingSchema);

export default WasteListing;
