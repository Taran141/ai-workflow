import bcrypt from "bcryptjs";
import { Schema, model } from "mongoose";
import { Role } from "../constants/roles";

export interface UserDocument {
  _id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
  notificationPreferences?: {
    email: {
      workflowCreated: boolean;
      taskAssigned: boolean;
      taskCompleted: boolean;
    };
    sms: {
      taskAssigned: boolean;
      workflowStatusUpdated: boolean;
    };
  };
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["admin", "user"], default: "user", index: true },
    notificationPreferences: {
      email: {
        workflowCreated: { type: Boolean, default: true },
        taskAssigned: { type: Boolean, default: true },
        taskCompleted: { type: Boolean, default: true }
      },
      sms: {
        taskAssigned: { type: Boolean, default: false },
        workflowStatusUpdated: { type: Boolean, default: false }
      }
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const UserModel = model<UserDocument>("User", userSchema);
