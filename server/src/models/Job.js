import mongoose from 'mongoose';

// Job publication state controls whether a listing is visible to public search/detail routes.
const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, required: true },
    salaryMin: Number,
    salaryMax: Number,
    jobType: { type: String, enum: ['Full Time', 'Part Time', 'Contract', 'Remote', 'Internship'], default: 'Full Time' },
    category: String,
    requirements: [String],
    status: { type: String, enum: ['Published', 'Draft', 'Rejected', 'Hidden'], default: 'Published' },
    isFeatured: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

export default mongoose.model('Job', jobSchema);