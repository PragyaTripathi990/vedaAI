import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User";
import {
  AuthedRequest,
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  signToken,
} from "../auth";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(200),
  school: z.string().max(120).optional(),
  schoolCity: z.string().max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid signup", issues: parsed.error.flatten().fieldErrors });
  }
  const { name, email, password, school, schoolCity } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already registered" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    school: school || "",
    schoolCity: schoolCity || "",
  });
  const token = signToken(user._id.toString());
  setSessionCookie(res, token);
  res.status(201).json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    school: user.school,
    schoolCity: user.schoolCity,
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login" });
  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  const token = signToken(user._id.toString());
  setSessionCookie(res, token);
  res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    school: user.school,
    schoolCity: user.schoolCity,
  });
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).select("name email school schoolCity createdAt");
  if (!user) return res.status(401).json({ error: "Not found" });
  res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    school: user.school,
    schoolCity: user.schoolCity,
  });
});

export default router;
