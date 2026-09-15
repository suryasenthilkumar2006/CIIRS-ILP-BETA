import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  role: "supplier" | "startup" | "admin";
  name: string;
  email: string;
  passwordHash: string;
  organizationName: string;
  organizationType:
    | "temple"
    | "apartment"
    | "restaurant"
    | "factory"
    | "startup";
  phone: string;
  address: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  wasteTypesOffered?: string[];
  wasteTypesNeeded?: string[];
  reliabilityScoreId?: mongoose.Types.ObjectId;
  greenCreditBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    role: {
      type: String,
      enum: ["supplier", "startup", "admin"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    organizationName: {
      type: String,
      required: true,
    },
    organizationType: {
      type: String,
      enum: ["temple", "apartment", "restaurant", "factory", "startup"],
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
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
    wasteTypesOffered: {
      type: [String],
      default: [],
    },
    wasteTypesNeeded: {
      type: [String],
      default: [],
    },
    reliabilityScoreId: {
      type: Schema.Types.ObjectId,
      ref: "ReliabilityScore",
    },
    greenCreditBalance: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ location: "2dsphere" });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
