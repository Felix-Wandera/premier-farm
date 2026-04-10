"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "./utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export async function getUsers() {
  await requireAuth();

  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true
    }
  });

  return users.map(u => ({
    id: u.id,
    name: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.email.split("@")[0].replace(".", " "),
    email: u.email,
    role: u.role,
    lastActive: u.createdAt.toLocaleDateString(),
  }));
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "WORKER"])
});

export async function inviteUser(data: any) {
  try {
    await requireAuth();

    const val = inviteSchema.safeParse(data);
    if (!val.success) return { success: false, message: "Invalid email or role." };

    const { email, role } = val.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, message: "A user with this email already exists." };

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8) + "!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.create({
      data: {
        email,
        firstName: email.split("@")[0],
        lastName: "",
        role: role as any,
        password: hashedPassword,
      }
    });

    // SMTP Sending
    let emailStatus = "Email sent successfully.";
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const loginLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;

      const mailOptions = {
        from: `"Premier Farm Admin" <${process.env.SMTP_USER || 'admin@premierfarm.co.ke'}>`,
        to: email,
        subject: "Invitation to Join Premier Farm",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1e293b; padding: 24px; text-align: center;">
               <h1 style="color: #fff; margin: 0;">Premier Farm</h1>
            </div>
            <div style="padding: 24px;">
              <h2>You've been invited!</h2>
              <p>You have been assigned the role of <strong>${role}</strong> on the farm management system.</p>
              <p>Your temporary login credentials are:</p>
              <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 16px; margin: 16px 0;">
                Email: ${email}<br/>
                Password: <strong>${tempPassword}</strong>
              </div>
              <p style="margin-top: 24px;">
                <a href="${loginLink}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
              </p>
              <p style="color: #64748b; font-size: 12px; margin-top: 32px;">Please change your password immediately after logging in.</p>
            </div>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (e: any) {
        console.error("Nodemailer failed:", e.message);
        emailStatus = "Created structurally, but SMTP email delivery failed (Check ENV).";
      }
    } else {
      emailStatus = "SMTP credentials missing! Console-only mode.";
      console.log(`[INVITE EMAILED] To: ${email} | Pass: ${tempPassword}`);
    }

    revalidatePath("/users");
    
    return { 
      success: true, 
      message: emailStatus, 
      backupInvite: `Email: ${email}\nPassword: ${tempPassword}\nLink: http://localhost:3000/login`
    };

  } catch (err) {
    return { success: false, message: "Internal server error." };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    const session = await requireAuth();

    if (!["ADMIN", "MANAGER", "WORKER"].includes(newRole)) {
      return { success: false, message: "Invalid role." };
    }

    // Prevent self-demotion
    if ((session.id as string) === userId && newRole !== "ADMIN") {
      return { success: false, message: "You cannot change your own role. Ask another admin." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as any },
    });

    revalidatePath("/users");
    return { success: true, message: "Role updated successfully." };
  } catch (e) {
    return { success: false, message: "Failed to update role." };
  }
}

export async function removeUser(userId: string) {
  try {
    const session = await requireAuth();

    if ((session.id as string) === userId) {
      return { success: false, message: "You cannot remove your own account." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true },
    });

    revalidatePath("/users");
    return { success: true, message: "User removed successfully." };
  } catch (e) {
    return { success: false, message: "Failed to remove user." };
  }
}
