import mongoose from 'mongoose';

// Links a candidate to a job and tracks the employer's application decision.
const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resumeUrl: String,
    coverLetter: String,
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' }
  },
  { timestamps: true }
);

export default mongoose.model('Application', applicationSchema);