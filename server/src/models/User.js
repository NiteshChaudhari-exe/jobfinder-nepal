import mongoose from 'mongoose';

// Password hashes are opt-in query fields to reduce accidental serialization leaks.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['user', 'employer', 'admin'], default: 'user' },
    googleId: { type: String },
    profile: {
      headline: String,
      skills: [String],
      experience: String,
      education: String,
      location: String,
      resumeUrl: String
    },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }]
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);