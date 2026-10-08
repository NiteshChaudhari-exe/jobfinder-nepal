import mongoose from 'mongoose';

// Company profile owned by the employer account that created it.
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: String,
    website: String,
    location: String,
    logoUrl: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Company', companySchema);