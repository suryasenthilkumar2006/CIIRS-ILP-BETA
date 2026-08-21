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
            location,
            longitude,
            latitude,
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
                { message: "Missing required registration fields (name, email, password, role, organizationName, organizationType, phone, address)." },
                { status: 400 }
            );
        }

        // 1. Connect to MongoDB Atlas
        await connectDB();

        // 2. Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return NextResponse.json(
                { message: "An account with this email address already exists." },
                { status: 409 }
            );
        }

        // 3. Hash the password with 10 salt rounds
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Resolve GeoJSON coordinates required by User schema
        let coordinates: [number, number] = [80.2707, 13.0827]; // Default coordinates if not explicitly provided
        if (location?.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
            coordinates = [Number(location.coordinates[0]), Number(location.coordinates[1])];
        } else if (longitude !== undefined && latitude !== undefined) {
            coordinates = [Number(longitude), Number(latitude)];
        }

        // 5. Persist the User document to MongoDB Atlas
        const newUser = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            passwordHash,
            role,
            organizationName: organizationName.trim(),
            organizationType,
            phone: phone.trim(),
            address: address.trim(),
            location: {
                type: "Point",
                coordinates,
            },
            greenCreditBalance: 0,
        });

        // 6. Return the created user object (excluding passwordHash)
        return NextResponse.json(
            {
                success: true,
                id: newUser._id.toString(),
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                organizationName: newUser.organizationName,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Registration error in /api/auth/register:", error);
        return NextResponse.json(
            { message: error.message || "Internal server error during registration." },
            { status: 500 }
        );
    }
}
