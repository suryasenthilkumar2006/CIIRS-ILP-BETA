import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            name,
            email,
            password,
            role,
            organizationName,
            organizationType,
            phone,
            address,
        } = body;

        // Validate required fields
        if (
            !name ||
            !email ||
            !password ||
            !role ||
            !organizationName ||
            !organizationType ||
            !phone ||
            !address
        ) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { message: "Email already exists" },
                { status: 409 }
            );
        }

        // Hash the password with 10 salt rounds
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create the User document
        const newUser = await User.create({
            name,
            email,
            passwordHash,
            role,
            organizationName,
            organizationType,
            phone,
            address,
            greenCreditBalance: 0,
        });

        // Return the created user (without passwordHash)
        return NextResponse.json(
            {
                id: newUser._id,
                email: newUser.email,
                role: newUser.role,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
