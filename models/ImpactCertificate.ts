import mongoose, { Document, Model, Schema } from "mongoose";

export interface IImpactCertificate extends Document {
  contractId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  certificateNumber: string;
  co2SavedKg: number;
  wasteKg: number;
  wasteType: string;
  issuedAt: Date;
  shareUrl?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IImpactCertificateModel extends Model<IImpactCertificate> {
  generateCertificateNumber(): string;
}

const ImpactCertificateSchema = new Schema<
  IImpactCertificate,
  IImpactCertificateModel
>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    co2SavedKg: {
      type: Number,
      required: true,
    },
    wasteKg: {
      type: Number,
      required: true,
    },
    wasteType: {
      type: String,
      required: true,
    },
    issuedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    shareUrl: {
      type: String,
    },
    pdfUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

ImpactCertificateSchema.statics.generateCertificateNumber = function (): string {
  const year = new Date().getFullYear();
  // Generate 5 random uppercase alphanumeric characters
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CIIRS-${year}-${randomChars}`;
};

const ImpactCertificate: IImpactCertificateModel =
  (mongoose.models.ImpactCertificate as IImpactCertificateModel) ||
  mongoose.model<IImpactCertificate, IImpactCertificateModel>(
    "ImpactCertificate",
    ImpactCertificateSchema
  );

export default ImpactCertificate;
