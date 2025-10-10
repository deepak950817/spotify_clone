import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const userMethodsPlugin = (schema, options) => {
  // 🔐 Hash password before save
  schema.pre("save", async function (next) {
    if (this.isModified("passwordHash")) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
    next();
  });

  // ✅ Instance method: validate password
  schema.methods.isPasswordCorrect = async function (password) {
    if (!this.passwordHash) throw new Error("No password hash found");
    console.log("hello");
    return bcrypt.compare(password, this.passwordHash);
  };

  // 🎟️ Generate Access Token
  schema.methods.generateAccessToken = function () {
    return jwt.sign(
      { id: this._id, role: this.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );
  };

  // 🔁 Generate Refresh Token
  schema.methods.generateRefreshToken = function () {
    return jwt.sign(
      { id: this._id, role: this.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    );
  };

  // 💾 Store hashed refresh token
  schema.methods.storeRefreshToken = async function (token) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    this.refreshToken = hashedToken;
    await this.save({ validateBeforeSave: false });
  };

  // ❌ Clear refresh token
  schema.methods.clearRefreshToken = async function () {
    this.refreshToken = null;
    await this.save({ validateBeforeSave: false });
  };

  // ⚖️ Verify refresh token
  schema.methods.verifyRefreshToken = async function (token) {
    if (!this.refreshToken) return false;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    return this.refreshToken === hashedToken;
  };
};